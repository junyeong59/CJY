import test from 'node:test';import assert from 'node:assert/strict';import {directPage,readyOrder} from './fixtures/direct-browser.mjs';
const draft='11111111-1111-4111-8111-111111111111',old='22222222-2222-4222-8222-222222222222';
test('Order shows only actual current meaningful owner record and never archive/delete controls',async t=>{
 const calls=[];const records=[{...readyOrder,draftId:draft,state:'saved',orderId:null,receipt:'current'}, {...readyOrder,draftId:old,state:'paid',receipt:'history',orderId:'old-paid'}];
 const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(a==='orders'){await r.fulfill({json:{draftId:draft,orders:records}});return true;}});
 await page.goto('https://cjy.app/order');await page.waitForSelector('.owned-order');assert.equal(await page.locator('.owned-order').count(),1);assert.match(await page.locator('.owned-order').textContent(),/current/);assert.equal(await page.locator('[data-order-new]').count(),0);
 await page.locator('[data-view-draft]').click();assert.ok(!calls.includes('new'));assert.equal(records.length,2);
});
test('empty latest draft does not hide meaningful paid history; session expiry does not show stale records',async t=>{
 let expired=false;const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{draftId:draft,status:expired?'session-expired':'owner-ready',orders:expired?[]:[{...readyOrder,draftId:old,state:'paid',orderId:'old-paid'}]}});return true;}});
 await page.goto('https://cjy.app/order');await page.waitForSelector('.owned-order');assert.equal(await page.locator('.owned-order').count(),1);assert.match(await page.locator('.owned-order').textContent(),/old-paid/);expired=true;await page.reload();await page.waitForFunction(()=>!document.querySelector('.owned-order')&&!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));assert.equal(await page.locator('[data-order-new]').count(),1);assert.equal(await page.locator('[data-order-new]').isEnabled(),false);
});
