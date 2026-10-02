import test from 'node:test';
import assert from 'node:assert/strict';
import {directPage,receipt,readyOrder} from './fixtures/direct-browser.mjs';
const answer=async(r,data)=>{await r.fulfill(data);return true;};
const draftId='a0000000-0000-4000-8000-000000000011';
const older='a0000000-0000-4000-8000-000000000012';
const fields={customerName:'TEST',customerPhone:'01000000000',service:'reels',plan:'Premium',autoPost:'no',existingAccount:'no',brief:'Previously saved exact content',channel:'telegram'};
const restored=(plan='Premium',editable=true)=>({status:'pending-review',receipt,draftId,plan,application:{...fields,plan},editable});
for(const plan of ['Standard','Deluxe','Premium'])test(`${plan}: explicit owned entry restores exact fields with email and consents fresh`,async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push([a,r.request().postDataJSON()]);if(a==='status')return answer(r,{json:{status:'pending-review',receipt,draftId,plan}});if(a==='application')return answer(r,{json:restored(plan)});if(a==='orders')return answer(r,{json:{status:'owner-ready',draftId,orders:[{receipt,draftId,plan,state:'saved',environment:'test'}]}});});
 await page.goto('https://cjy.app/order');await page.locator(`[data-view-draft="${draftId}"]`).click();await page.waitForURL(`https://cjy.app/apply?draftId=${draftId}`);await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Previously saved exact content');
 for(const [key,value] of Object.entries({...fields,plan}))assert.equal(await page.evaluate(key=>document.querySelector('[data-direct-checkout]').elements.namedItem(key).value,key),value);
 for(const key of ['termsConsent','privacyConsent','draftPrivacyConsent'])assert.equal(await page.locator(`[name=${key}]`).isChecked(),false);
 assert.equal(await page.locator('[name=testEmail]').inputValue(),'');assert.equal(await page.locator('[name=plan] option:disabled').count(),0,'restored plan options remain editable');assert.equal(await page.locator('[type=submit]').isDisabled(),false);
 await page.reload();await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Previously saved exact content');assert.equal(calls.some(([a])=>['new','save','open','submit','revise'].includes(a)),false);
 assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
});
test('save-only requires draft privacy but not email/payment consent or SDK; saved edit pays only after fresh consent',async t=>{
 const calls=[];let sdk=0;let saved=false;const {page}=await directPage(t,async(a,r)=>{const b=r.request().postDataJSON();calls.push([a,b]);if(a==='status')return answer(r,{json:saved?restored():{status:'session-ready',draftId}});if(a==='application')return answer(r,{json:restored()});if(a==='save'){saved=true;return answer(r,{json:restored()});}if(a==='revise')return answer(r,{json:restored()});if(a==='open')return answer(r,{json:{...readyOrder,draftId}});if(a==='verify')return answer(r,{json:{...readyOrder,status:'order-existing'}});},{sdk:async r=>{sdk++;return answer(r,{contentType:'text/javascript',body:'window.calls=[];window.PortOne={requestPayment:async p=>{window.calls.push(p);return {};}}'});}});
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);for(const [n,v] of Object.entries(fields))if(!['channel','service','plan','autoPost','existingAccount'].includes(n))await page.locator(`[name=${n}]`).fill(v);
 await page.locator('[data-save-application]').click();assert.equal(calls.some(([a])=>a==='save'),false);await page.locator('[name=draftPrivacyConsent]').check();await page.locator('[data-save-application]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('저장했습니다'));
 assert.equal(sdk,0);assert.equal(calls.some(([a])=>['open','submit','revise'].includes(a)),false);const save=calls.find(([a])=>a==='save')[1];assert.deepEqual(save.draftConsent,{version:'cjy-draft-2026-10-02',privacy:true});assert.equal(save.testEmail,undefined);assert.equal(save.consentBundle,undefined);
 await page.locator('[name=brief]').fill('Edited for payment');await page.locator('[name=testEmail]').fill('fresh@example.invalid');for(const n of ['termsConsent','privacyConsent'])await page.locator(`[name=${n}]`).check();await page.locator('[type=submit]').click();await page.waitForURL('https://cjy.app/order');assert.equal(sdk,1);assert.equal(calls.find(([a])=>a==='revise')[1].brief,'Edited for payment');assert.equal(calls.filter(([a])=>a==='open').length,1);
});
for(const state of ['pending_payment','paid','manual_hold','cancelled','refunded','partially_refunded','disputed'])test(`${state}: restore read-only; no replacement payment or discard`,async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(a==='status')return answer(r,{json:{...readyOrder,status:'order-existing',draftId,state}});if(a==='application')return answer(r,{json:{...restored('Premium',false),...readyOrder,status:'order-existing',state,draftId}});});
 await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Previously saved exact content');assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.locator('[data-save-application]').isDisabled(),true);assert.equal(await page.locator('[data-new-application]').isVisible(),false);
 await page.locator('[data-direct-checkout]').dispatchEvent('submit');assert.equal(calls.some(a=>['new','open','submit','revise','save'].includes(a)),false);
});

test('saved application edits directly and has no discard/new controls or calls',async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(a==='status'||a==='application')return answer(r,{json:restored()});});
 await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Previously saved exact content');assert.equal(await page.locator('[data-new-application],[data-discard-dialog]').count(),0);await page.locator('[name=brief]').fill('Direct edit');assert.equal(calls.includes('new'),false);assert.equal(await page.locator('[name=brief]').inputValue(),'Direct edit');
});
test('foreign explicit selection fails closed without substituting latest owned form',async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push([a,r.request().postDataJSON()]);if(a==='status')return answer(r,{json:restored()});if(a==='application')return answer(r,{status:403,json:{error:'held'}});},{query:`?draftId=${older}`});
 await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('확인하지 못했습니다'));assert.equal(await page.locator('[name=brief]').inputValue(),'');assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.deepEqual(calls.find(([a])=>a==='application')[1],{draftId:older});
});

test('historical archived application is labelled read-only and selected by its own id',async t=>{
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders')return answer(r,{json:{status:'owner-ready',draftId:older,orders:[{receipt,draftId,state:'archived',plan:'Premium',environment:'test',editable:false}]}});if(a==='status')return answer(r,{json:{status:'session-ready',draftId:older}});if(a==='application'){assert.equal(r.request().postDataJSON().draftId,draftId);return answer(r,{json:restored('Premium',false)});}});
 await page.goto('https://cjy.app/order');await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));assert.equal(await page.locator('.owned-order').count(),0);await page.goto('https://cjy.app/apply?draftId='+draftId);await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Previously saved exact content');assert.equal(await page.locator('[data-save-application]').isDisabled(),true);
});

for(const width of [320,390,1440])test(`save and payment stay adjacent and usable at ${width}px`,async t=>{
 const {page}=await directPage(t,undefined,{viewport:{width,height:844}});const save=await page.locator('[data-save-application]').boundingBox(),pay=await page.locator('[data-direct-checkout] [type=submit]').boundingBox();assert.equal(Math.round(save.y),Math.round(pay.y),'save next to payment');assert.ok(save.height>=44&&pay.height>=44);assert.ok(save.x+save.width<=pay.x);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});

test('fresh draft offers only supported Telegram; historical channel is read exactly without new authority',async t=>{
 const {page}=await directPage(t);assert.equal(await page.locator('[name=channel][value=discord]').isVisible(),false);assert.equal(await page.locator('[name=channel][value=gmail]').isVisible(),false);assert.equal(await page.locator('[name=channel][value=telegram]').isChecked(),true);
});

for(const expired of [false,true])test(`empty owner-cookie lookup ${expired?'expired':'new'} offers contact without claiming historical deletion`,async t=>{
 const calls=[];const {page}=await directPage(t,async(a,r)=>{calls.push([a,r.request().postDataJSON()]);if(a==='orders')return answer(r,{json:{status:expired?'session-expired':'session-ready',draftId,orders:[]}});});
 await page.goto('https://cjy.app/order');await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));
 assert.equal(await page.locator('[data-order-list]').textContent(),'이 브라우저에서 확인할 수 있는 접수 내역이 없습니다. 기존 고객은 문의해주세요.');assert.equal(await page.getByRole('link',{name:'문의하기',exact:true}).isVisible(),true);
 const fresh=page.locator('[data-order-new]');assert.equal(await fresh.textContent(),'새 접수');assert.equal(await fresh.isDisabled(),expired);assert.equal(calls.some(([a])=>a==='new'),false);
 if(!expired){await fresh.click();await page.waitForURL('https://cjy.app/apply');assert.equal(await page.locator('[name=brief]').inputValue(),'');assert.equal(calls.some(([a])=>a==='new'),false);}
});
