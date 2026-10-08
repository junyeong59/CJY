import {readFile} from 'node:fs/promises';
import test from 'node:test';import assert from 'node:assert/strict';import {directPage,receipt,readyOrder} from './fixtures/direct-browser.mjs';
const draftId='a0000000-0000-4000-8000-000000000011',childId='a0000000-0000-4000-8000-000000000012';
const application={customerName:'TEST',customerPhone:'01000000000',service:'reels',plan:'Standard',autoPost:'no',existingAccount:'no',brief:'Synthetic request',channel:'manual'};
const projectOrigin='https://tixshhgyvvfzreefbipm.supabase.co';
const headerPolicy=(headers,path)=>{const lines=headers.split('\n'),start=lines.indexOf(path);return lines.slice(start+1).find(line=>line.startsWith('  Content-Security-Policy: ')).trim().slice('Content-Security-Policy: '.length);};
test('checkout CSP permits only the exact Supabase project in apply and order connect-src',async()=>{
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
 for(const path of ['/apply','/order*']){const csp=headerPolicy(headers,path),connect=csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('connect-src '));assert.ok(connect.split(' ').includes(projectOrigin));assert.doesNotMatch(connect,/\*\.supabase\.co/);}
 assert.ok(!headerPolicy(headers,'/test/checkout*').includes(projectOrigin));
});
for(const path of ['/apply','/order'])test(`real browser ${path} CSP allows project Auth and Edge but blocks other projects`,async t=>{
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8'),csp=headerPolicy(headers,path==='/order'?'/order*':path);
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());const page=await browser.newPage();
 await page.route('**/*',async r=>{if(r.request().isNavigationRequest())return r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:'<!doctype html><title>CSP fixture</title>'});return r.fulfill({headers:{'Access-Control-Allow-Origin':'https://cjy.app'},json:{ok:true}});});
 await page.goto('https://cjy.app'+path);
 const allowed=await page.evaluate(async origin=>Promise.all(['/auth/v1/signup','/functions/v1/cjy-api/status'].map(p=>fetch(origin+p).then(r=>r.ok,()=>false))),projectOrigin);
 assert.deepEqual(allowed,[true,true]);
 assert.equal(await page.evaluate(()=>fetch('https://other-project.supabase.co/functions/v1/cjy-api/status').then(()=>true,()=>false)),false);
});
for(const response of [404,409,503,'pending'])test(`pending reload retains same payment identity after refresh ${response}`,async t=>{
 const actions=[];const order={...readyOrder,draftId,application,editable:false,status:'pending-review'};
 const {page}=await directPage(t,async(a,r)=>{actions.push(a);let json;
  if(a==='status'||a==='application')json=order;
  if(a==='retry-edit'){if(response==='pending')json=order;else {await r.fulfill({status:response,json:{error:'payment_unresolved'}});return true;}}
  if(a==='reopen'){assert.equal(r.request().postDataJSON().draftId,draftId);json={...order,status:'checkout-ready'};}
  if(json){await r.fulfill({json});return true;}
 },{query:'?draftId='+draftId});
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 assert.equal(await page.locator('[name=brief]').inputValue(),application.brief);
 await page.locator('[name=testEmail]').fill('test@example.invalid');
 for(const n of ['termsConsent','privacyConsent'])await page.locator(`[name=${n}]`).check();
 await page.locator('[type=submit]').click();await page.waitForFunction(()=>window.calls?.length===1&&!document.querySelector('[type=submit]').disabled);
 assert.equal(await page.evaluate(()=>window.calls[0].paymentId),order.paymentId);
 assert.equal(actions.filter(a=>a==='reopen').length,1);assert.equal(actions.filter(a=>['submit','revise','save','open'].includes(a)).length,0);
 await page.locator('[name=brief]').fill('Modified pending reload');
 await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('확인 중')&&!document.querySelector('[type=submit]').disabled);
 assert.equal(await page.evaluate(()=>window.calls.length),1);assert.equal(actions.filter(a=>['submit','revise','save','open'].includes(a)).length,0);
});
test('paid reload remains read-only without refresh or checkout',async t=>{
 const actions=[];const {page}=await directPage(t,async(a,r)=>{actions.push(a);if(a==='status'||a==='application'){await r.fulfill({json:{...readyOrder,draftId,application,editable:false,state:'paid'}});return true;}},{query:'?draftId='+draftId});
 await page.waitForFunction(()=>document.querySelector('[data-existing-order]').hidden===false);
 assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.locator('[name=brief]').isDisabled(),true);assert.deepEqual(actions,['status','application']);
});
test('unchanged cancelled retry reopens the same payment identity without another submission',async t=>{
 const actions=[];const order={...readyOrder,draftId,application};
 const {page,fill}=await directPage(t,async(a,r)=>{actions.push(a);let json;
  if(a==='status')json={draftId,environment:'test'};
  if(a==='submit')json={receipt,draftId,status:'pending-review'};
  if(a==='open'||a==='reopen'){if(a==='reopen')assert.equal(r.request().postDataJSON().draftId,draftId);json=order;}
  if(a==='retry-edit'){await r.fulfill({status:409,json:{error:'payment_unresolved'}});return true;}
  if(json){await r.fulfill({json});return true;}
 });
 await fill();await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('닫았습니다'));
 await page.locator('[type=submit]').click();await page.waitForFunction(()=>window.calls?.length===2&&!document.querySelector('[type=submit]').disabled);
 const calls=await page.evaluate(()=>window.calls);assert.deepEqual(calls.map(x=>x.paymentId),[order.paymentId,order.paymentId]);assert.equal(actions.filter(a=>a==='submit').length,1);assert.equal(actions.filter(a=>a==='reopen').length,1);
});
test('unresolved read-only retry keeps immediate local edits but cannot save a new payment-bound application',async t=>{
 let writes=0;const order={...readyOrder,draftId,application,editable:false};
 const {page,fill}=await directPage(t,async(a,r)=>{let json;if(a==='status')json={draftId};if(a==='submit')json={receipt,draftId,status:'pending-review'};if(a==='open')json=order;if(a==='retry-edit')json=order;if(a==='save'||a==='revise')writes++;if(json){await r.fulfill({json});return true;}});
 await fill();await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('닫았습니다'));
 await page.locator('[name=brief]').fill('Preserve unresolved edit');await page.locator('[name=draftPrivacyConsent]').check();await page.locator('[data-save-application]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('확인 중')&&!document.querySelector('[data-save-application]').disabled);
 assert.equal(await page.locator('[name=brief]').inputValue(),'Preserve unresolved edit');assert.equal(writes,0);assert.equal(await page.evaluate(()=>window.calls.length),1);
});
