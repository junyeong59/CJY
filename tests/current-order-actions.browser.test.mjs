import test from 'node:test';import assert from 'node:assert/strict';import {directPage,readyOrder} from './fixtures/direct-browser.mjs';
for(const state of ['saved','paid','pending_payment'])test(`one ${state} record has adjacent restore/inquiry only, no global refresh/warning`,async t=>{
 const item={...readyOrder,state,draftId:'11111111-1111-4111-8111-111111111111',...(state==='saved'?{orderId:null}:{})};const actions=[];
 const {page}=await directPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){await r.fulfill({json:{draftId:item.draftId,orders:[item]}});return true;}if(a==='verify'){await r.fulfill({json:{}});return true;}},{viewport:{width:390,height:844}});
 await page.goto('https://cjy.app/order');await page.waitForSelector('.owned-order');assert.equal(await page.locator('[data-order-refresh]').count(),0);assert.equal(await page.locator('.order-hint').count(),0);assert.equal(await page.locator('.order-actions').count(),0);
 assert.equal(await page.locator('[data-view-draft]').count(),1);assert.equal(await page.locator('[data-view-draft]').textContent(),state==='saved'?'저장된 내용 보기':'신청 내용 보기');
 const pair=page.locator('.order-record-actions');assert.equal(await pair.locator('a[href="mailto:cjy.support@gmail.com"]').count(),1);const a=await pair.locator('[data-view-draft]').boundingBox(),b=await pair.locator('a[href="mailto:cjy.support@gmail.com"]').boundingBox();assert.ok(Math.abs(a.y-b.y)<8);assert.equal(actions.filter(a=>a==='verify').length,state==='pending_payment'?1:0);
 await page.screenshot({path:`/Users/choi/.hermes/cache/cjy-current-order-${state}-390.png`,fullPage:true});
});
