import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
for(const built of [false,true])test(`${built?'built':'source'} fresh owned empty orders without draft enables existing new-order route`,async t=>{
 const actions=[];
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){await r.fulfill({json:{orders:[]}});return true;}if(a==='status'){await r.fulfill({json:{status:'session-ready',draftId:'a0000000-0000-4000-8000-000000000001'}});return true;}},{path:'/order',built});
 await page.getByText('이 브라우저에서 접수한 주문 내역이 없습니다',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-order-new]').isDisabled(),false);
 await page.locator('[data-order-new]').click();await page.waitForURL('**/apply');await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 assert.deepEqual(actions,['orders','status']);
});
for(const built of [false,true])for(const failure of ['error','expired','invalid'])test(`${built?'built':'source'} ${failure} initial owned read keeps new order disabled`,async t=>{
 const actions=[];
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){if(failure==='error')await r.fulfill({status:403,json:{error:'denied'}});else await r.fulfill({json:failure==='expired'?{status:'session-expired',orders:[]}:{orders:null}});return true;}},{path:'/order',built});
 await page.getByText(/상태 확인이 지연되고 있습니다/).waitFor();
 assert.equal(await page.locator('[data-order-new]').isDisabled(),true);
 await page.evaluate(()=>document.querySelector('[data-order-new]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 assert.equal(new URL(page.url()).pathname,'/order');assert.deepEqual(actions,['orders']);
});
for(const built of [false,true])test(`${built?'built':'source'} loading and same-task double clicks cannot duplicate navigation`,async t=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const actions=[];
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){await gate;await r.fulfill({json:{orders:[]}});return true;}if(a==='status'){await r.fulfill({json:{status:'session-ready',draftId:'a0000000-0000-4000-8000-000000000001'}});return true;}},{path:'/order',built});
 assert.equal(await page.locator('[data-order-new]').isDisabled(),true);
 await page.evaluate(()=>{const b=document.querySelector('[data-order-new]');for(let i=0;i<2;i++)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 assert.equal(new URL(page.url()).pathname,'/order');release();
 await page.waitForFunction(()=>!document.querySelector('[data-order-new]').disabled);
 await page.evaluate(()=>{const b=document.querySelector('[data-order-new]');for(let i=0;i<2;i++)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 await page.waitForURL('**/apply');await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 assert.deepEqual(actions,['orders','status']);
});
