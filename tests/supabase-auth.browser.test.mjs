import test from 'node:test';import assert from 'node:assert/strict';import {directPage,receipt} from './fixtures/direct-browser.mjs';
test('save and reload use official persisted anonymous JWT with no legacy session action',async t=>{
 const actions=[];const draftId='a0000000-0000-4000-8000-000000000011';let saved;
 const {page,fill}=await directPage(t,async(action,route)=>{
  actions.push(action);assert.notEqual(action,'session');assert.equal(route.request().headers().authorization,'Bearer browser-test-jwt');assert.equal(new URL(route.request().url()).origin,'https://tixshhgyvvfzreefbipm.supabase.co');
  if(action==='status'){await route.fulfill({json:{draftId,environment:'test'}});return true;}
  if(action==='save'){const payload=route.request().postDataJSON();assert.equal(payload.testEmail,undefined);saved={receipt,draftId,environment:'test',status:'pending-review',editable:true,application:Object.fromEntries(['customerName','customerPhone','service','plan','autoPost','existingAccount','brief','channel'].map(n=>[n,payload[n]]))};await route.fulfill({json:saved});return true;}
  if(action==='application'){await route.fulfill({json:saved});return true;}
 });
 await fill();await page.locator('[name=draftPrivacyConsent]').check();await page.locator('[data-save-application]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('저장했습니다'));
 const before=await page.evaluate(()=>localStorage.getItem('sb-tixshhgyvvfzreefbipm-auth-token'));assert.ok(before);await page.reload();await page.waitForFunction(()=>!document.querySelector('[data-save-application]').disabled);assert.equal(await page.evaluate(()=>localStorage.getItem('sb-tixshhgyvvfzreefbipm-auth-token')),before);assert.deepEqual(actions,['status','save','status','application']);
});
