import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {directPage,readyOrder} from './fixtures/direct-browser.mjs';

async function orderPage(t,item,viewport){
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,draftId:'11111111-1111-4111-8111-111111111111',plan:'Standard',...item}]}});return true;}}, {viewport});
 await page.route('https://cjy.app/assets/order/*.png',async r=>r.fulfill({contentType:'image/png',body:await readFile(new URL('../public'+new URL(r.request().url()).pathname,import.meta.url))}));
 await page.goto('https://cjy.app/order');
 await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));
 return page;
}
test('paid order renders operator review without customer-bot activation',async t=>{
 const page=await orderPage(t,{state:'paid',production:'queued'});
 assert.equal(await page.locator('[data-telegram-connection]').count(),0);
 assert.equal(await page.locator('[data-order-progress] li').count(),3);
 assert.equal(await page.locator('[data-stage=pilot]').count(),0);
 assert.doesNotMatch(await page.locator('[data-order-list]').textContent(),/Pilot|운영자 전용/);
 assert.match(await page.locator('[data-stage=payment]').textContent(),/결제 확인 완료/);
 assert.equal(await page.locator('[data-stage=consultation]').getAttribute('aria-current'),'step');
 assert.match(await page.locator('[data-stage=consultation]').textContent(),/운영자 확인 대기/);
 assert.match(await page.locator('[data-stage=consultation]').textContent(),/운영자 확인 대기/);
 assert.match(await page.locator('[data-stage=monthly]').textContent(),/시작 확인 대기/);
 assert.match(await page.locator('[data-order-progress]').textContent(),/하루 1편.*달력 기준 1개월/);
 assert.equal(await page.locator('[data-order-progress] img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&e.alt==='')),true);
});

 test('state matrix fails closed on payment exceptions and unsupported later fields',async t=>{
 let item={state:'paid',production:'queued'};
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,draftId:'11111111-1111-4111-8111-111111111111',plan:'Standard',...item}]}});return true;}});
 await page.route('https://cjy.app/assets/order/*.png',async r=>r.fulfill({contentType:'image/png',body:await readFile(new URL('../public'+new URL(r.request().url()).pathname,import.meta.url))}));
 const cases=[
  ...['Standard','Deluxe','Premium'].map(plan=>({state:'paid',production:'queued',plan,pilot:/운영자 확인 대기/,current:'consultation',connection:false})),
  ...['cancelled','refunded','partially_refunded','disputed','manual_hold','saved','pending_payment','future-state'].map(state=>({state,production:'delivered',payment:/확인 대기|확인 중|취소|환불|분쟁|보류|결제 시작 전/,pilot:/결제 확인 후|확인 필요/,current:'payment',connection:false})),
  {state:'paid',production:'producing',pilot:/운영자 확인 대기/,current:'consultation',connection:false},
  {state:'pilot_pending',production:'hold',pilot:/운영자 확인 대기/,current:'consultation',connection:false},
  {state:'paid',production:'delivered',pilot:/운영자 확인 대기/,current:'consultation',connection:false},
  {state:'paid',production:'unknown',consultation:{state:'completed'},telegramInvite:{code:'A'.repeat(43),url:'javascript:alert(1)'},pilot:/운영자 확인 대기/,current:'consultation',connection:false},
  {state:'paid',production:'delivered',renewal:true,pilot:/운영자 확인 대기/,current:'consultation',connection:false},
  ...['confirmed','hold','ended'].map(state=>({state:'paid',production:'delivered',monthly:{state,provided:2,promised:28,startDate:'2099-01-01',endDateExclusive:'2099-01-29'},monthlyText:state==='confirmed'?/기간 확정.*시작·진행 확인 대기/:state==='hold'?/운영자 확인 중/:/기간 종료/,current:'monthly',connection:false})),
  {state:'paid',production:'delivered',monthly:{state:'active',provided:2,promised:28},monthlyText:/확인 대기/,current:'consultation',connection:false}
 ];
 for(const row of cases){item=row;await page.goto('https://cjy.app/order');await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));
  const steps=page.locator('[data-order-progress]');assert.equal(await steps.locator('[aria-current=step]').count(),1);assert.equal(await steps.locator('[aria-current=step]').getAttribute('data-stage'),row.current,JSON.stringify(row));
  if(row.plan)assert.match(await page.locator('.owned-order dl').textContent(),new RegExp(row.plan));
  assert.match(await steps.locator('[data-stage=consultation]').textContent(),row.pilot??/운영자 확인 대기/);
  if(row.payment){assert.match(await steps.locator('[data-stage=payment]').textContent(),row.payment);assert.equal(await steps.locator('.is-complete').count(),0);}
  if(row.monthlyText)assert.match(await steps.locator('[data-stage=monthly]').textContent(),row.monthlyText);
  assert.match(await steps.locator('[data-stage=consultation]').textContent(),/준비|확인 대기|확인 필요/);
  assert.equal(await page.locator('[data-telegram-connection]').count(),row.connection?1:0);
  assert.equal(await page.locator('[data-copy-invite], [data-telegram-connection] code').count(),0);
  assert.equal(await page.locator('a[href^="javascript:"]').count(),0);
 }
 });

for(const width of [1440,768,390,320])test(`order journey responsive ${width}: readable controls and three-stage layout`,async t=>{
 const page=await orderPage(t,{state:'paid',production:'queued'},{width,height:1000});
 const columns=await page.locator('[data-order-progress] ol').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
 assert.equal(columns,3,'reference keeps three connected stages horizontal');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
 if(width<=700)assert.equal(await page.locator('.owned-order dl > div').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1,'mobile detail rows should stack');
 const refresh=page.locator('[data-view-draft]');
 await refresh.focus();assert.equal(await refresh.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 assert.equal(await page.locator('[data-telegram-connection]').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:`/Users/choi/Desktop/CJY/.manual-operations-backup/cjy-order-journey-${width}.png`,fullPage:true,animations:'disabled'});
});
