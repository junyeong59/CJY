import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
export const draft='a0000000-0000-4000-8000-000000000001';
export const bank={environment:'live',paymentMethod:'bank_transfer',state:'pending_payment',status:'bank-transfer-ready',orderId:'server-order-1',totalAmount:768900,currency:'KRW',draftId:draft,receipt:draft,editable:false,bankTransfer:{bankName:'토스뱅크',accountNumber:'1001-9981-6571',accountHolder:'최준영'}};
test('public apply creates bank order and shows server-only amount without SDK or email',async t=>{
 const actions=[],requests=[];let payload;
 const {page,fill}=await bankPage(t,async(action,route)=>{actions.push(action);if(action==='bank-transfer'){payload=route.request().postDataJSON();await route.fulfill({json:bank});return true;}if(action==='orders'){await route.fulfill({json:{draftId:draft,orders:[bank]}});return true;}if(action==='status'){await route.fulfill({json:{status:'session-ready',draftId:draft}});return true;}});
 page.on('request',r=>requests.push(r.url()));await fill();await page.locator('[type=submit]').click();await page.waitForURL('https://cjy.app/order');
 await page.getByText('768,900₩',{exact:true}).waitFor();
 for(const value of ['토스뱅크','1001-9981-6571','최준영','server-order-1'])assert.match(await page.locator('[data-bank-guide]').innerText(),new RegExp(value));
 assert.deepEqual(payload.consentBundle,{version:'cjy-bank-transfer-2026-10-14',termsRefund:true,privacy:true});assert.equal(payload.draftId,draft);assert.equal(payload.channel,'manual');assert.equal(Object.keys(payload).length,11);assert.equal(payload.policyEvidence.effectiveState,'effective-bank-transfer-service');assert.equal(await page.locator('[name=testEmail]').count(),0);
 assert.equal(requests.some(u=>u.includes('portone')),false);assert.equal(actions.some(a=>['open','reopen','retry-edit','submit','revise'].includes(a)),false);
});
