import test from 'node:test';import assert from 'node:assert/strict';import {directPage,readyOrder} from './fixtures/direct-browser.mjs';
const orderId='a0000000-0000-4000-8000-000000000001',draftId='b0000000-0000-4000-8000-000000000001';
for(const status of ['available','waiting','expired','connected'])test(`manual paid order omits contact and renewal actions for legacy ${status}`,async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(a==='orders'){await r.fulfill({json:{draftId,orders:[{...readyOrder,state:'paid',orderId,draftId,contact:{status,expiresAt:'2026-01-01T00:00:00Z'},periodId:orderId,renewalAmount:99000,monthly:{state:'confirmed',provided:1,promised:30}}]}});return true;}});
 await page.goto('https://cjy.app/order');await page.waitForSelector('.owned-order');
 assert.equal(await page.locator('[data-telegram-connection],[data-contact-issue],[data-contact-regenerate],[data-contact-confirm],[data-contact-code],[data-contact-link],[data-monthly-renew],[data-renew-details],a[href*="t.me"]').count(),0);
 assert.equal(calls.includes('contact-link'),false);assert.equal(calls.includes('monthly-renew'),false);
 assert.equal(await page.locator('.order-record-actions a[href="mailto:cjy.support@gmail.com"]').count(),1);
});
