import test from 'node:test';import assert from 'node:assert/strict';import {bankPage} from './fixtures/bank-browser.mjs';
const draft='a0000000-0000-4000-8000-000000000081';
const consultation={draftId:draft,receipt:draft,environment:'test',state:'submitted',application:{service:'cinematic'},editable:false};
const bank={...consultation,application:{service:'reels'},environment:'live',paymentMethod:'bank_transfer',state:'pending_payment',orderId:'server-order',totalAmount:5390,currency:'KRW',bankTransfer:{bankName:'토스뱅크',accountNumber:'1001-9981-6571',accountHolder:'최준영'}};
test('application completion uses pending-payment Order typography and action layout',async t=>{
 let record=bank;const {page}=await bankPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{draftId:draft,orders:[record]}});return true;}},{path:'/order'});
 const geometry=()=>page.locator('.order-page').evaluate(n=>{const css=s=>getComputedStyle(n.querySelector(s));return {heading:css('h1').fontSize,number:css('.order-number').fontSize,headingGap:css('.order-heading').marginBottom,copy:css('.bank-pending-amount,.cinematic-confirmation').fontSize,actionGap:css('.order-record-actions').gap,actionMargin:css('.order-record-actions').marginTop,buttons:[...n.querySelectorAll('.order-record-actions > a')].map(b=>{const r=b.getBoundingClientRect();return [r.x,r.width,r.height,getComputedStyle(b).fontSize];})};});
 for(const width of [390,800,1440]){
  await page.setViewportSize({width,height:900});record=bank;await page.reload();await page.getByRole('heading',{name:'결제 대기중',exact:true}).waitFor();const pending=await geometry();
  record=consultation;await page.reload();await page.getByRole('heading',{name:'신청 완료',exact:true}).waitFor();assert.deepEqual(await geometry(),pending,`${width}px`);
  assert.equal(await page.locator('[data-bank-guide]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
});
