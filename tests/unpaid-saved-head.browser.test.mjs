import test from 'node:test';
import assert from 'node:assert/strict';
import {directPage,receipt,readyOrder} from './fixtures/direct-browser.mjs';
const old='a0000000-0000-4000-8000-000000000011',head='a0000000-0000-4000-8000-000000000012';
const application={customerName:'TEST',customerPhone:'01000000000',service:'reels',plan:'Standard',autoPost:'no',existingAccount:'no',brief:'Archived',channel:'telegram'};
const archived={status:'pending-review',receipt,draftId:old,plan:'Standard',application,editable:false};
const current={...archived,draftId:head,application:{...application,brief:'Current saved'},editable:true};
const orders={status:'owner-ready',draftId:head,orders:[{draftId:head,receipt,state:'saved',editable:true,environment:'test',orderId:null},{draftId:old,receipt,state:'archived',editable:false,environment:'test',orderId:null}]};
test('stale owned unpaid link resolves current editable saved head and canonicalizes URL without a write',async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push([a,r.request().postDataJSON()]);const json=a==='status'?current:a==='orders'?orders:a==='application'?r.request().postDataJSON().draftId===old?archived:current:null;if(json){await r.fulfill({json});return true;}},{query:'?draftId='+old});
 await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Current saved');assert.equal(await page.locator('[name=brief]').isEnabled(),true);assert.equal(await page.locator('[data-existing-order]').isVisible(),false);assert.equal(page.url(),'https://cjy.app/apply?draftId='+head);assert.deepEqual(calls.filter(([a])=>a==='application').map(([,b])=>b.draftId),[old,head]);assert.equal(calls.some(([a])=>['save','new','open','revise','submit'].includes(a)),false);
});
for(const reason of ['paid-source','pending-source','unknown-source','paid-current','pending-current','manual-hold-current','missing-editable-head','moved-current','missing-archive','head-now-payment-bound'])test(`${reason}: stale link cannot gain editing or substitute payment-bound record`,async t=>{
 const calls=[];const source=structuredClone(archived),active=structuredClone(current),listing=structuredClone(orders),latest=structuredClone(current);
 if(['paid-source','pending-source','unknown-source'].includes(reason))Object.assign(source,readyOrder,{status:'order-existing',state:reason==='paid-source'?'paid':reason==='pending-source'?'pending_payment':'unknown',editable:false,draftId:old,application});
 if(['paid-current','pending-current','manual-hold-current'].includes(reason))Object.assign(active,readyOrder,{status:'order-existing',state:reason==='paid-current'?'paid':reason==='pending-current'?'pending_payment':'manual_hold',draftId:head});
 if(reason==='missing-editable-head')delete listing.orders[0].editable;
 if(reason==='moved-current')listing.draftId=old;
 if(reason==='missing-archive')listing.orders[1].state='saved';
 if(reason==='head-now-payment-bound')Object.assign(latest,readyOrder,{editable:false,draftId:head,application:current.application});
 const {page}=await directPage(t,async(a,r)=>{calls.push(a);const json=a==='status'?active:a==='orders'?listing:a==='application'?r.request().postDataJSON().draftId===old?source:latest:null;if(json){await r.fulfill({json});return true;}},{query:'?draftId='+old});
 await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Archived');assert.equal(await page.locator('[name=brief]').isEnabled(),false);assert.equal(await page.locator('[data-save-application]').isDisabled(),true);assert.equal(page.url(),'https://cjy.app/apply?draftId='+old);await page.locator('[data-direct-checkout]').dispatchEvent('submit');assert.equal(calls.some(a=>['save','new','open','revise','submit'].includes(a)),false);
});
