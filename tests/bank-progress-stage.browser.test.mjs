import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
const draft='a0000000-0000-4000-8000-000000000001';
const bank={environment:'live',paymentMethod:'bank_transfer',state:'paid',orderId:'synthetic-stage-order',totalAmount:768900,currency:'KRW',draftId:draft,receipt:draft,editable:false,bankTransfer:{bankName:'TEST BANK',accountNumber:'TEST ACCOUNT',accountHolder:'TEST HOLDER'}};
const titles=['결제 완료','협의 및 파이프라인 확정','협의 날짜에 따라 작업 시작'];
const assertStage=async(page,stage)=>{
 assert.equal(await page.locator('.order-steps > li').count(),3);
 assert.deepEqual(await page.locator('.order-steps > li').evaluateAll(es=>es.map(e=>e.className)),[1,2,3].map(n=>n===stage?'is-current':n<stage?'is-complete':'is-pending'));
 assert.equal(await page.locator('[aria-current=step]').count(),stage?1:0);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.deepEqual(await page.locator('.order-steps img').evaluateAll(es=>es.map(e=>Number(getComputedStyle(e).opacity))),[1,2,3].map(n=>n<=stage?1:0.35));
};
for(const built of [false,true])test(`bank stages and state authority preserve existing controls (${built?'built':'source'})`,async t=>{
 let item={...bank,state:'pending_payment',orderProgressStage:1};
 const actions=[];
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){await r.fulfill({json:{draftId:draft,orders:[item]}});return true;}if(a==='application'){await r.fulfill({json:item});return true;}},{path:'/order',built});
 await page.getByText('현재 단계: 결제 대기중',{exact:true}).waitFor();
 await assertStage(page,0);assert.equal(await page.locator('[data-bank-guide],[data-bank-refresh]').count(),2);
 item={...bank,orderProgressStage:2};
 await page.locator('[data-bank-refresh]').click();
 await page.getByText('현재 단계: 결제 완료',{exact:true}).waitFor();
 await assertStage(page,1);assert.equal(await page.locator('[data-bank-guide],[data-bank-refresh]').count(),0);
 assert.deepEqual(actions,['orders','application','orders']);
 for(const [apiStage,visual] of [[1,1],[2,1],[3,2],[4,3],[undefined,1],[null,1],[0,1],[5,1],['4',1],[2.5,1]]){
  item={...bank,orderProgressStage:apiStage};await page.reload();await page.waitForSelector('.owned-order');await assertStage(page,visual);
  assert.equal(await page.locator('[data-current-stage]').textContent(),'현재 단계: '+titles[visual-1]);
 }
 for(const stage of [1,2,3,4])for(const state of ['pending_payment','refunded','partially_refunded','cancelled','disputed','manual_hold','failed','unknown']){
  const result=await page.evaluate(async ({bank,state,stage})=>{
   const {orderJourney}=await import('/src/order.js');const el=document.createElement('div');el.innerHTML=orderJourney({...bank,state,orderProgressStage:stage});
   return {active:el.querySelectorAll('.is-complete,.is-current').length,pending:el.querySelectorAll('.is-pending').length,current:el.querySelector('[data-current-stage]').textContent};
  },{bank,state,stage});
  assert.equal(result.active,0,`${state}:${stage}`);assert.equal(result.pending,3);assert.doesNotMatch(result.current,/결제 완료/);
 }
 for(const paymentMethod of ['card','easy_pay',undefined])for(const apiStage of [1,2,3,4]){
  item={...bank,environment:'test',paymentMethod,orderProgressStage:apiStage};await page.reload();await page.waitForSelector('.owned-order');await assertStage(page,apiStage===4?1:apiStage);
 }
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});item={...bank,orderProgressStage:4};await page.reload();await page.waitForSelector('.owned-order');await assertStage(page,3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(await page.locator('.order-steps img').evaluateAll(es=>es.map(e=>[new URL(e.src).pathname,e.getAttribute('width'),e.getAttribute('height')])),['payment','discussion','upload'].map(n=>[`/assets/order/${n}.png`,'274','274']));
  await page.screenshot({path:`/Users/choi/cache/cjy-stage-release/frontend-${built?'built':'source'}-${width}.png`,fullPage:true,animations:'disabled'});
 }
});
test('bank paid stage3 maps to consultation using the existing three cumulative icons',async t=>{
 const item={...bank,orderProgressStage:3};
 const {page}=await bankPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{draftId:draft,orders:[item]}});return true;}},{path:'/order'});
 await page.waitForSelector('.owned-order');
 assert.equal(await page.locator('[data-current-stage]').textContent(),'현재 단계: '+titles[1]);
 assert.deepEqual(await page.locator('.order-steps > li').evaluateAll(es=>es.map(e=>e.className)),['is-complete','is-current','is-pending']);
});
