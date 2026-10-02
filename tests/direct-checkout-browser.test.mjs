import test from 'node:test';import assert from 'node:assert/strict';import {directPage,receipt,readyOrder} from './fixtures/direct-browser.mjs';
for(const [plan,total] of [['Standard',273900],['Deluxe',768900],['Premium',1208900]])test(`${plan}: two consents -> SDK ready -> save/order -> verified /order without auto production`,async t=>{
 let saved=false,opened=false;const trace=[],calls=[];const draftId='a0000000-0000-4000-8000-000000000011';const order={...readyOrder,plan,totalAmount:total,draftId,orderName:'CJY Reels '+plan};
 const {page,fill}=await directPage(t,async(a,r)=>{let json;
 if(a==='status')json={status:'session-ready',draftId};
 if(a==='submit'){trace.push('submit');const b=r.request().postDataJSON();assert.deepEqual(b.consentBundle,{version:'cjy-direct-test-2026-09-27',termsRefund:true,privacy:true,pilotRights:true,pilotProcessing:true,pilotVersion:'cjy-firstPilot-2026-09-27'});assert.equal(b.draftId,draftId);assert.equal(b.plan,plan);assert.equal(b.processingConsent,undefined);saved=true;json={receipt,status:'pending-review',draftId};}
 if(a==='open'){trace.push('open');assert.equal(r.request().postDataJSON().draftId,draftId);opened=true;json=order;}
 if(a==='verify'){assert.equal(r.request().postDataJSON().draftId,draftId);json={...order,state:'paid'};}
 if(a==='orders')json={draftId,orders:opened?[{...order,state:'paid',createdAt:'2026-09-27T00:00:00Z',paidAt:'2026-09-27T00:01:00Z'}]:[]};
 if(json){await r.fulfill({json});return true;}
 },{query:'?plan='+plan,sdk:async r=>{trace.push('sdk');await r.fulfill({contentType:'text/javascript',body:'window.PortOne={requestPayment:async p=>{await window.recordPayment(p);return {};}};'});}});
 await page.exposeFunction('recordPayment',p=>calls.push(p));await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);assert.equal(await page.locator('input[type=checkbox]').count(),3);await fill();await page.locator('[type=submit]').click();await page.waitForURL('https://cjy.app/order');await page.waitForFunction(()=>document.querySelector('[data-order-list]').textContent.includes('결제 완료'));
 assert.deepEqual(trace,['sdk','submit','open']);assert.equal(calls.length,1);assert.equal(calls[0].totalAmount,total);assert.equal(calls[0].currency,'CURRENCY_KRW');assert.equal(calls[0].redirectUrl,'https://cjy.app/order');assert.ok(saved);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.reload();await page.waitForFunction(()=>document.querySelector('[data-order-list]').textContent.includes('결제 완료'));assert.deepEqual(trace,['sdk','submit','open']);
});
