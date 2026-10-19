import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
const draft='a0000000-0000-4000-8000-000000000001';
test('viewing an existing application keeps its stored order total, not the new catalog quote',async t=>{
 const order={draftId:draft,receipt:draft,orderId:'old-order',editable:false,state:'paid',environment:'live',paymentMethod:'bank_transfer',currency:'KRW',totalAmount:768900,application:{customerName:'TEST',customerPhone:'01000000000',service:'reels',plan:'Deluxe',autoPost:'no',existingAccount:'no',brief:'Synthetic old order',channel:'manual'},bankTransfer:{bankName:'TEST',accountNumber:'TEST',accountHolder:'TEST'}};
 const original=structuredClone(order);
 const {page}=await bankPage(t,async(action,route)=>{if(['status','application'].includes(action)){await route.fulfill({json:order});return true;}},{query:'?draftId='+draft});
 await page.waitForFunction(()=>document.querySelector('[name=plan]').disabled);
 assert.equal(await page.locator('#order-total').textContent(),'총 가격: 768,900₩');
 assert.doesNotMatch(await page.locator('#order-service').textContent(),/1건/);
 assert.deepEqual(order,original);
});
