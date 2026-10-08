import test from 'node:test';import assert from 'node:assert/strict';import {directPage,readyOrder} from './fixtures/direct-browser.mjs';
const draftId='a0000000-0000-4000-8000-000000000011',windowId='a0000000-0000-4000-8000-000000000013';
for(const code of ['','&code=FAILURE_TYPE_STOPPED'])test('redirect return server PAID goes Order even with local code '+code,async t=>{
 const calls=[];const paid={...readyOrder,draftId,state:'paid',status:'order-existing',editable:false};const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(['status','application'].includes(a)){await r.fulfill({json:paid});return true;}},{query:`?draftId=${draftId}&windowId=${windowId}${code}`});await page.waitForTimeout(200);assert.equal(new URL(page.url()).pathname,'/order');assert.equal(calls.includes('retry-edit'),false);
});
