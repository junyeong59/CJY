import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {renderApplication} from '../src/application.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs');
async function setup(t){
 const server=createServer(async(req,res)=>{
  if(req.url.startsWith('/src/styles.css')){res.setHeader('Content-Type','text/css');res.end(await readFile(new URL('../src/styles.css',import.meta.url)));}
  else if(req.url.startsWith('/src/application.js')){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('../src/application.js',import.meta.url)));}
  else if(req.url.startsWith('/src/commercial.js')){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('../src/commercial.js',import.meta.url)));}
  else if(req.url.startsWith('/src/policy-documents.js')){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('../src/policy-documents.js',import.meta.url)));}
  else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${renderApplication()}<script type="module">import {bindApplication} from '/src/application.js';bindApplication(document);window.bound=true;</script></body></html>`);}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||chromium.executablePath()});t.after(()=>browser.close());
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/apply`);await page.waitForFunction(()=>window.bound);
 const fill=async()=>{await page.locator('[name=customerName]').fill('TEST browser non-customer');await page.locator('[name=customerPhone]').fill('00000000000');await page.locator('[name=brief]').fill('TEST ONLY — no production or contact.');await page.locator('[name=autoPost]').selectOption('no');for(const name of ['termsConsent','refundConsent','processingConsent','privacyConsent','noticeConsent'])await page.locator(`[name=${name}]`).check();};
 return {page,fill};
}
test('application displays exact first-month totals for every confirmed plan',async t=>{
 const {page}=await setup(t);
 assert.equal(await page.locator('[data-setup] strong').textContent(),'100,000₩');
 const expected={Standard:['24,900₩','총 가격: 273,900₩'],Deluxe:['69,900₩','총 가격: 768,900₩'],Premium:['109,900₩','총 가격: 1,208,900₩']};
 for(const [plan,[vat,total]] of Object.entries(expected)){
  await page.locator('[name=plan]').selectOption(plan);
  assert.equal(await page.locator('#order-vat').textContent(),vat);
  assert.equal(await page.locator('#order-total').textContent(),total);
 }
 const notices=await page.locator('.application-notices').textContent();
 assert.match(notices,/가이드라인 수정을 최대 2회/);assert.match(notices,/개별 콘텐츠마다 제공되는 수정 권리가 아닙니다/);
 for(const href of ['/terms','/privacy','/refund'])assert.equal(await page.locator(`.policy-links a[href="${href}"]`).count(),1);
});
test('narrow viewport keeps receipt and the single checkout button within the screen',async t=>{
 const {page}=await setup(t);await page.addStyleTag({url:'/src/styles.css'});await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>getComputedStyle(document.body).margin==='0px');
 await page.setViewportSize({width:320,height:740});await page.locator('#checkout-status').evaluate(e=>e.textContent='신청이 검토 대기로 접수되었습니다. 접수번호: 10000000-0000-4000-8000-000000000001. 결제·제작·게시는 시작되지 않았습니다.');
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,mode:document.compatMode,margin:getComputedStyle(document.body).margin,sheets:[...document.styleSheets].map(s=>({href:s.href,rules:[...s.cssRules].slice(0,5).map(r=>r.cssText),disabled:s.disabled})),nodes:[...document.querySelectorAll('*')].map(e=>({tag:e.tagName,cls:e.className,id:e.id,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1).slice(0,12)}));
 assert.equal(overflow.scroll<=overflow.width,true,JSON.stringify(overflow));
 for(const button of await page.locator('.checkout button').all()){const box=await button.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=320);}
});
test('invalid local fields never send; server errors and invalid success bodies never claim receipt',async t=>{
 const {page,fill}=await setup(t);let requests=0;let code=429;
 await page.route('**/api/applications',route=>{requests++;return route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(code===200?{receipt:'<img src=x onerror=alert(1)>',status:'registered'}:{error:'not_for_display'})});});
 await fill();await page.locator('[name=customerPhone]').fill('abc');await page.locator('button[type=submit]').click();assert.equal(requests,0);
 await page.locator('[name=customerPhone]').fill('00000000000');await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('요청이 많'));
 code=400;await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('입력'));
 code=409;await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('이전 신청'));
 code=200;await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('확인하지 못'));
 assert.equal(await page.getByRole('button',{name:'결제하기',exact:true}).isEnabled(),true);
 assert.match(await page.locator('.checkout-note').textContent(),/결제 서비스가 연결되지 않아/);
 assert.equal(await page.locator('#checkout-status img').count(),0);assert.equal(requests,4);
});
test('network failure keeps same idempotency key; duplicate events do not submit twice',async t=>{
 const {page,fill}=await setup(t);const keys=[];let release;
 await page.route('**/api/applications',async route=>{keys.push(route.request().headers()['idempotency-key']);if(keys.length===1){await new Promise(r=>release=r);return route.abort('failed');}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending-review',receipt:'10000000-0000-4000-8000-000000000002'})});});
 await fill();await page.evaluate(()=>{const f=document.querySelector('form');f.dispatchEvent(new Event('submit',{cancelable:true}));f.dispatchEvent(new Event('submit',{cancelable:true}));});
 await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('접수하고'));await new Promise(r=>setTimeout(r,300));assert.equal(keys.length,1);release();
 await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('10000000-0000-4000-8000-000000000002'));assert.equal(keys[0],keys[1]);
});
test('single 결제하기 CTA submits intake once without charging or leaving the review receipt',async t=>{
 const {page,fill}=await setup(t);let captured;let requests=0;const initialUrl=page.url();
 await page.route('**/api/applications',route=>{requests++;captured=route.request();return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({status:'pending-review',receipt:'10000000-0000-4000-8000-000000000001'})});});
 assert.equal(await page.locator('.checkout button').count(),1,'checkout has a single CTA');
 const checkout=page.getByRole('button',{name:'결제하기',exact:true});
 assert.equal(await checkout.isEnabled(),true);assert.equal(await checkout.getAttribute('type'),'submit');
 assert.equal(await page.locator('.checkout-note').isVisible(),true);
 assert.match(await page.locator('.checkout-note').textContent(),/결제 서비스가 연결되지 않아/);
 assert.match(await page.locator('.checkout-note').textContent(),/검토 대기 접수만/);
 await checkout.click();assert.equal(requests,0,'required fields block intake');
 await fill();await checkout.click();
 await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('10000000-0000-4000-8000-000000000001'));
 assert.equal(captured.url(),'https://customer-gateway-staging.up.railway.app/api/applications');
 assert.equal(captured.method(),'POST');assert.match(captured.headers()['idempotency-key'],/^[a-f0-9-]{36}$/);
 const payload=captured.postDataJSON();
 assert.equal(payload.autoPost,'no');assert.equal(payload.postingConsent,false);assert.equal(payload.termsConsent,true);assert.equal(payload.refundConsent,true);assert.equal(payload.productionAuthorized,undefined);
 assert.deepEqual(payload.policyEvidence,{schemaVersion:1,effectiveState:'effective-current-service-payment-disabled',documents:[
  {kind:'terms',versionDate:'2026-09-22',canonicalSha256:'62b6587c8267a0cc108ae58754c1406ee600f8e5a736527fbda313a825c169af'},
  {kind:'privacy',versionDate:'2026-09-22',canonicalSha256:'21bef12f8afb99e0837f41f9ced44b35d3d8e2853a82379bdea61a7b3055bc45'},
  {kind:'refund',versionDate:'2026-09-22',canonicalSha256:'337bca0be7f4246fee9e0062a1723cf1df83dc41dd5cc69b9bc2fea6923da49e'}
 ]});
 assert.equal('collectedAt' in payload.policyEvidence,false);
 assert.equal(await page.locator('.checkout button').count(),1);
 assert.equal(await page.getByRole('button',{name:'접수 완료',exact:true}).isDisabled(),true);
 assert.match(await page.locator('#checkout-status').textContent(),/검토 대기로 접수/);
 assert.match(await page.locator('#checkout-status').textContent(),/결제·제작·게시는 시작되지 않았습니다/);
 await page.locator('form').evaluate(f=>f.dispatchEvent(new Event('submit',{cancelable:true})));
 assert.equal(requests,1);assert.equal(page.url(),initialUrl);
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 assert.doesNotMatch(page.url(),/policyEvidence|canonicalSha256|termsConsent|refundConsent/);
});

test('terms and refund agreements are independently required while posting remains conditional',async t=>{
 const {page,fill}=await setup(t);let requests=0;
 await page.route('**/api/applications',route=>{requests++;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({status:'pending-review',receipt:'10000000-0000-4000-8000-000000000009'})});});
 await fill();
 for(const name of ['termsConsent','refundConsent']){
  await page.locator(`[name=${name}]`).uncheck();await page.locator('button[type=submit]').click();assert.equal(requests,0);await page.locator(`[name=${name}]`).check();
 }
 assert.equal(await page.locator('[name=postingConsent]').isDisabled(),true);
 await page.locator('[name=autoPost]').selectOption('yes');
 assert.equal(await page.locator('[name=postingConsent]').isEnabled(),true);
 await page.locator('button[type=submit]').click();assert.equal(requests,0);
 await page.locator('[name=postingConsent]').check();await page.locator('button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('10000000-0000-4000-8000-000000000009'));
 assert.equal(requests,1);
});
