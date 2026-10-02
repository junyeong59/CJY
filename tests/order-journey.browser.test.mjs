import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {directPage,readyOrder} from './fixtures/direct-browser.mjs';

async function orderPage(t,item,viewport){
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,plan:'Standard',...item}]}});return true;}}, {viewport});
 await page.route('https://cjy.app/assets/order/*.png',async r=>r.fulfill({contentType:'image/png',body:await readFile(new URL('../public'+new URL(r.request().url()).pathname,import.meta.url))}));
 await page.goto('https://cjy.app/order');
 await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));
 return page;
}
test('paid order renders honest CUSTOMER connection preparation and authoritative icon steps',async t=>{
 const page=await orderPage(t,{state:'paid',production:'queued'});
 assert.equal(await page.locator('[data-telegram-connection]').count(),1,'post-payment CUSTOMER connection section missing');
 const section=page.locator('[data-telegram-connection]');
 assert.match(await section.textContent(),/연결 코드 준비 중/);
 assert.match(await section.textContent(),/봇을 여는 것만으로.*연결/);
 const link=section.locator('a');assert.equal(await link.getAttribute('href'),'https://t.me/cjysolutionbot');assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
 assert.equal(await section.locator('code, [data-copy-invite]').count(),0);
 assert.equal(await page.locator('[data-order-progress] li').count(),4);
 assert.match(await page.locator('[data-stage=payment]').textContent(),/결제 확인 완료/);
 assert.equal(await page.locator('[data-stage=pilot]').getAttribute('aria-current'),'step');
 assert.match(await page.locator('[data-stage=pilot]').textContent(),/운영자 전용/);
 assert.match(await page.locator('[data-stage=consultation]').textContent(),/확인 대기/);
 assert.match(await page.locator('[data-stage=monthly]').textContent(),/시작 확인 대기/);
 assert.match(await page.locator('[data-order-progress]').textContent(),/하루 1편.*달력 기준 1개월/);
 assert.equal(await page.locator('[data-order-progress] img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&e.alt==='')),true);
});

 test('state matrix fails closed on payment exceptions and unsupported later fields',async t=>{
 let item={state:'paid',production:'queued'};
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,plan:'Standard',...item}]}});return true;}});
 await page.route('https://cjy.app/assets/order/*.png',async r=>r.fulfill({contentType:'image/png',body:await readFile(new URL('../public'+new URL(r.request().url()).pathname,import.meta.url))}));
 const cases=[
  ...['Standard','Deluxe','Premium'].map(plan=>({state:'paid',production:'queued',plan,pilot:/제작 대기/,current:'pilot',connection:true})),
  ...['cancelled','refunded','partially_refunded','disputed','manual_hold','saved','pending_payment','future-state'].map(state=>({state,production:'delivered',payment:/확인 대기|확인 중|취소|환불|분쟁|보류|결제 시작 전/,pilot:/결제 확인 후|확인 필요/,current:'payment',connection:false})),
  {state:'paid',production:'producing',pilot:/제작 중/,current:'pilot',connection:true},
  {state:'pilot_pending',production:'hold',pilot:/확인 필요/,current:'pilot',connection:true},
  {state:'paid',production:'delivered',pilot:/운영자 전달 완료/,current:'consultation',connection:true},
  {state:'paid',production:'unknown',consultation:{state:'completed'},telegramInvite:{code:'A'.repeat(43),url:'javascript:alert(1)'},pilot:/확인 대기/,current:'pilot',connection:true},
  {state:'paid',production:'delivered',renewal:true,pilot:/재제작 없음/,current:'consultation',connection:true},
  ...['confirmed','hold','ended'].map(state=>({state:'paid',production:'delivered',monthly:{state,provided:2,promised:28,startDate:'2099-01-01',endDateExclusive:'2099-01-29'},monthlyText:state==='confirmed'?/기간 확정.*시작·진행 확인 대기/:state==='hold'?/운영자 확인 중/:/기간 종료/,current:'monthly',connection:true})),
  {state:'paid',production:'delivered',monthly:{state:'active',provided:2,promised:28},monthlyText:/확인 대기/,current:'consultation',connection:true}
 ];
 for(const row of cases){item=row;await page.goto('https://cjy.app/order');await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));
  const steps=page.locator('[data-order-progress]');assert.equal(await steps.locator('[aria-current=step]').count(),1);assert.equal(await steps.locator('[aria-current=step]').getAttribute('data-stage'),row.current,JSON.stringify(row));
  if(row.plan)assert.match(await page.locator('.owned-order dl').textContent(),new RegExp(row.plan));
  assert.match(await steps.locator('[data-stage=pilot]').textContent(),row.pilot??/운영자 전달 완료/);
  if(row.payment){assert.match(await steps.locator('[data-stage=payment]').textContent(),row.payment);assert.equal(await steps.locator('.is-complete').count(),0);}
  if(row.monthlyText)assert.match(await steps.locator('[data-stage=monthly]').textContent(),row.monthlyText);
  assert.match(await steps.locator('[data-stage=consultation]').textContent(),/확인 대기/);
  assert.equal(await page.locator('[data-telegram-connection]').count(),row.connection?1:0);
  assert.equal(await page.locator('[data-copy-invite], [data-telegram-connection] code').count(),0);
  assert.equal(await page.locator('a[href^="javascript:"]').count(),0);
 }
 });

for(const width of [1440,768,390,320])test(`order journey responsive ${width}: readable controls and four-stage layout`,async t=>{
 const page=await orderPage(t,{state:'paid',production:'queued'},{width,height:1000});
 const columns=await page.locator('[data-order-progress] ol').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
 assert.equal(columns,width>=1000?4:width>=701?2:1,'four stages need a balanced responsive grid');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
 if(width<=700)assert.equal(await page.locator('.owned-order dl > div').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1,'mobile detail rows should stack');
 const section=page.locator('[data-telegram-connection]');
 assert.notEqual(await section.evaluate(e=>getComputedStyle(e).borderTopStyle),'none','customer action needs a distinct card');
 await section.locator('a').focus();assert.equal(await section.locator('a').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:`/Users/choi/.hermes/cache/cjy-order-journey-${width}.png`,fullPage:true,animations:'disabled'});
});
