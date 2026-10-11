import test from 'node:test';
import assert from 'node:assert/strict';
import {directPage,readyOrder} from './fixtures/direct-browser.mjs';

async function orderPage(t,item,viewport){
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,draftId:'11111111-1111-4111-8111-111111111111',plan:'Standard',...item}]}});return true;}if(a==='verify'){await r.fulfill({json:{}});return true;}}, {viewport});
 await page.goto('https://cjy.app/order');
 await page.waitForSelector('.owned-order');return page;
}
test('paid default does not infer later progress from legacy production or monthly counts',async t=>{
 const page=await orderPage(t,{state:'paid',production:'delivered',monthly:{state:'confirmed',provided:28,promised:28}});
 assert.equal(await page.locator('[data-telegram-connection]').count(),0);
 assert.equal(await page.locator('[data-order-progress] li').count(),3);
 assert.equal(await page.locator('[data-stage=payment]').getAttribute('aria-current'),'step');
 assert.equal(await page.locator('[data-stage=consultation]').getAttribute('class'),'is-pending');
 assert.doesNotMatch(await page.locator('main').textContent(),/Pilot|운영자 전용|제공 완료|진행 안내|주문 상세 내역/);
 assert.equal(await page.locator('[data-order-progress] img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&e.alt==='')),true);
});
test('payment exceptions override operator stage; malformed stages default to paid stage one',async t=>{
 let item={state:'paid'};
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,draftId:'11111111-1111-4111-8111-111111111111',...item}]}});return true;}if(a==='verify'){await r.fulfill({json:{}});return true;}});
 for(const state of ['cancelled','refunded','partially_refunded','disputed','manual_hold','saved','submitted','pending_payment','future-state','service_scheduled','service_active','completed']){
  item={state,orderProgressStage:3};await page.goto('https://cjy.app/order');await page.waitForSelector('.owned-order');
  assert.equal(await page.locator('.order-steps .is-current,.order-steps .is-complete').count(),0,state);
  assert.equal(await page.locator('.order-steps .is-pending').count(),3,state);
  assert.doesNotMatch(await page.locator('[data-order-list]').textContent(),/결제 완료/,state);
 }
 for(const stage of [undefined,null,0,4,-1,2.5,'3',{},true]){
  item={state:'paid',orderProgressStage:stage};await page.goto('https://cjy.app/order?orderProgressStage=3&status=paid');await page.waitForSelector('.owned-order');
  assert.equal(await page.locator('[data-stage=payment]').getAttribute('aria-current'),'step',JSON.stringify(stage));
  await page.evaluate(()=>localStorage.setItem('orderProgressStage','3'));await page.reload();await page.waitForSelector('.owned-order');
  assert.equal(await page.locator('[data-current-stage]').textContent(),'현재 단계: 결제 완료');
  assert.equal(new URL(page.url()).search,'');
 }
});
for(const width of [1440,768,390,320])test(`order journey responsive ${width}: existing controls and connected stages`,async t=>{
 const page=await orderPage(t,{state:'paid',orderProgressStage:2},{width,height:1000});
 assert.equal(await page.locator('.order-steps').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const restore=page.locator('[data-view-draft]');await restore.focus();assert.equal(await restore.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 assert.equal(await page.locator('details').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.screenshot({path:`/Users/choi/cache/cjy-video-build/order-three-stage-${width}.png`,fullPage:true,animations:'disabled'});
 await restore.click();await page.waitForURL('https://cjy.app/apply?draftId=11111111-1111-4111-8111-111111111111');
});
