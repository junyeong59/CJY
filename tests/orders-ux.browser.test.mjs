import test from 'node:test';import assert from 'node:assert/strict';import {directPage,receipt,readyOrder} from './fixtures/direct-browser.mjs';
for(const state of ['saved','pending_payment','paid'])test(`persisted ${state}: explicit new order restores trusted name/phone/service interaction`,async t=>{
 let current={receipt,plan:'Premium',draftId:'a0000000-0000-4000-8000-000000000011',...(state==='saved'?{status:'pending-review'}:{...readyOrder,state})},news=0;
 const {page}=await directPage(t,async(a,r)=>{if(a==='status'){await r.fulfill({json:current});return true;}if(a==='new'){news++;current={status:'session-ready',draftId:'a0000000-0000-4000-8000-000000000012'};await r.fulfill({json:current});return true;}});
 await page.waitForTimeout(200);assert.equal(await page.locator('[data-new-order]').count(),1,'persisted receipt needs an explicit new-order lifecycle, not disabled blank fields');await page.locator('[data-new-order]').click();await page.locator('[name=customerName]').click();await page.keyboard.type('TEST');assert.equal(await page.locator('[name=customerName]').inputValue(),'TEST');await page.keyboard.press('Tab');await page.keyboard.type('01000000000');assert.equal(await page.locator('[name=customerPhone]').inputValue(),'01000000000');await page.locator('[name=service]').click();await page.keyboard.press('Escape');await page.evaluate(()=>document.querySelector('[name=plan]').addEventListener('change',e=>window.planChangeTrusted=e.isTrusted));await page.locator('[name=plan]').click();await page.keyboard.press('Escape');await page.keyboard.press('d');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>window.planChangeTrusted),true);assert.equal(await page.locator('[name=plan]').inputValue(),'Deluxe');assert.equal(news,1);assert.equal(await page.locator('[data-test-check]').count(),0);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`/Users/choi/.hermes/cache/cjy-orders-green-${state}.png`,fullPage:true});
});


for(const state of ['paid','pending_payment','saved','empty'])test(`/order renders server-owned ${state}, never query-string paid authority`,async t=>{
 const calls=[];const item={...readyOrder,state:state==='saved'?'saved':state,status:'order-existing',plan:'Standard',draftId:'a0000000-0000-4000-8000-000000000011',createdAt:'2026-09-27T00:00:00Z',paidAt:state==='paid'?'2026-09-27T00:01:00Z':null};
 const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(a==='orders'){await r.fulfill({json:{orders:state==='empty'?[]:[item],draftId:item.draftId}});return true;}if(a==='verify'){assert.deepEqual(r.request().postDataJSON(),{draftId:item.draftId});await r.fulfill({json:item});return true;}});
 await page.goto('https://cjy.app/order/status?paymentId=forged&status=PAID&number=guess');await page.waitForTimeout(300);assert.equal(await page.locator('[data-order-list]').count(),1,'existing order route must display real owned list');await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));
 const text=await page.locator('[data-order-list]').textContent();assert.doesNotMatch(text,/예시 고객|12345678|파이프라인을 제작/);assert.equal(new URL(page.url()).search,'');if(state==='paid')assert.match(text,/결제 완료/);else assert.doesNotMatch(text,/결제 완료/);if(state==='pending_payment'){assert.match(text,/확인 중/);assert.ok(calls.includes('verify'));}if(state==='empty')assert.match(text,/주문이 없습니다/);else assert.match(text,/Standard/);assert.equal(await page.locator('[name=number]').count(),0);await page.screenshot({path:`/Users/choi/.hermes/cache/cjy-orders-page-${state}.png`,fullPage:true});
});


for(const outcome of ['success','failure','expired','missing'])test(`/order explicit verification restores new-order controls: ${outcome}`,async t=>{
 const draftId='a0000000-0000-4000-8000-000000000011';let verifies=0,news=0,release;
 const held=new Promise(resolve=>{release=resolve;});
 const {page}=await directPage(t,async(a,r)=>{
  if(a==='orders'){await r.fulfill({json:{orders:[{...readyOrder,draftId,plan:'Standard'}],...(verifies<2||!['expired','missing'].includes(outcome)?{draftId}:{}),...(verifies>=2&&outcome==='expired'?{status:'session-expired'}:{})}});return true;}
  if(a==='verify'){verifies++;if(verifies===2){await held;if(outcome==='failure'){await r.fulfill({status:503,json:{error:'unavailable'}});return true;}}await r.fulfill({json:readyOrder});return true;}
  if(a==='new'){news++;assert.deepEqual(r.request().postDataJSON(),{draftId});await r.fulfill({json:{status:'session-ready',draftId:'a0000000-0000-4000-8000-000000000012'}});return true;}
 });
 await page.goto('https://cjy.app/order');await page.waitForFunction(()=>!document.querySelector('[data-order-new]').disabled);
 await page.locator('[data-verify-draft]').click();await page.waitForFunction(()=>document.querySelector('[data-verify-draft]').disabled);
 // Repeated synthetic events while held exercise the busy guard; navigation below uses a trusted click.
 await page.locator('[data-order-new]').dispatchEvent('click');await page.locator('[data-verify-draft]').dispatchEvent('click');assert.equal(news,0);assert.equal(verifies,2);
 release();await page.waitForFunction(()=>document.querySelector('[data-order-message]').textContent.length>0);
 assert.equal(await page.locator('[data-order-new]').isDisabled(),['expired','missing'].includes(outcome));
 if(['success','failure'].includes(outcome)){await page.locator('[data-order-new]').click();await page.waitForURL('https://cjy.app/apply');assert.equal(news,1);await page.waitForFunction(()=>!document.querySelector('[name=customerName]').disabled);}
});

for(const viewport of [{width:1440,height:1000},{width:390,height:844}])test(`fresh ${viewport.width}: visible controls are not covered by payment overlay`,async t=>{
 const {page}=await directPage(t,undefined,{viewport});await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 for(const name of ['customerName','customerPhone','service','plan']){const field=page.locator(`[name=${name}]`);await field.scrollIntoViewIfNeeded();assert.equal(await field.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,`${name}: center of visible control must receive pointer`);await field.click();await page.keyboard.press('Escape');assert.equal(await field.evaluate(e=>document.activeElement===e),true);if(name==='service')assert.equal(await page.locator('.customer-section').evaluate(e=>getComputedStyle(e).opacity),'1','completed input section must not disappear when focus leaves');}
});


test('expired browser owner fails closed with order/help destination, never a ready new payment',async t=>{
 const {page}=await directPage(t,async(a,r)=>{if(a==='status'){await r.fulfill({json:{status:'session-expired'}});return true;}});await page.waitForTimeout(300);assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.match(await page.locator('#checkout-status').textContent(),/만료/);assert.equal(await page.locator('[data-test-check]').count(),0);
});
