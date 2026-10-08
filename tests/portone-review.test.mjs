import test from 'node:test';
import assert from 'node:assert/strict';

// Synthetic public identifiers only. Never use real channel settings in tests.
const fixture = {PORTONE_REVIEW_UI:'1', PORTONE_TEST_STORE_ID:'store-test-fixture',
  PORTONE_TEST_CHANNEL_KEY:'channel-key-test-fixture', PORTONE_TEST_PG:'inicis_v2',
  PORTONE_TEST_CHANNEL_VERIFIED:'1', PORTONE_TEST_CHANNEL_SOURCE:'synthetic test fixture'};
async function setupServer(t, env={PORTONE_REVIEW_UI:'1'}) {
  const module=await import('../scripts/serve-portone-review.mjs').catch(()=>({}));
  assert.equal(typeof module.createPortOneReviewServer,'function','local review server exists');
  const server=module.createPortOneReviewServer({env});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
  return {server,base:`http://127.0.0.1:${server.address().port}`,module};
}
test('local review is default off and missing TEST provenance fails closed without secrets or production routes',async t=>{
  const {base,module}=await setupServer(t);
  assert.equal(module.createPortOneReviewServer(),null);
  const page=await fetch(base+'/review/apply');
  assert.equal(page.status,200);assert.match(await page.text(),/application-form/);
  const config=await (await fetch(base+'/review/config')).json();assert.equal(config.ready,false);
  assert.ok(config.missing.includes('PORTONE_TEST_CHANNEL_KEY'));
  for(const route of ['/apply?review=1','/src/application.js','/src/app.js','/.env','/api/applications','/review/../package.json'])assert.equal((await fetch(base+route)).status,404);
  assert.equal((await fetch(base+'/review/config',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/review/config',{headers:{Origin:'https://external.invalid'}})).status,403);
  const {get}=await import('node:http');
  assert.equal(await new Promise((resolve,reject)=>get(base+'/review/config',{headers:{Host:'external.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject)),403);
  assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
  const ready=await setupServer(t,{...fixture,PORTONE_API_SECRET:'secret-never-send'});
  const text=await (await fetch(ready.base+'/review/config')).text();
  const publicConfig=JSON.parse(text);assert.equal(publicConfig.ready,true);
  assert.doesNotMatch(text,/secret-never-send|synthetic test fixture|API_SECRET/);
  for(const key of ['PORTONE_TEST_CHANNEL_VERIFIED','PORTONE_TEST_CHANNEL_SOURCE','PORTONE_TEST_PG']){
    const env={...fixture};delete env[key];const blocked=await setupServer(t,env);
    assert.equal((await (await fetch(blocked.base+'/review/config')).json()).ready,false);
  }
});

async function setupBrowser(t, {env=fixture,sdkError=false,sdkHang=false,configError=false}={}) {
  const {base}=await setupServer(t,env);
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||chromium.executablePath()});
  t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1280,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(5000);
  await page.emulateMedia({reducedMotion:'reduce'});
  const requests={sdk:0,external:0};
  await page.route('**/*',route=>{
    const url=route.request().url();
    if(url==='https://cdn.portone.io/v2/browser-sdk.js'){
      requests.sdk++;
      if(sdkError)return route.abort();
      if(sdkHang)return;
      return route.fulfill({contentType:'text/javascript',body:`window.calls=[];window.PortOne={async requestPayment(options){window.calls.push(options);if(window.reply==='throw')throw Error('private provider data');if(window.reply==='pending')return new Promise(resolve=>window.release=resolve);return window.reply??{code:'FAILURE_TYPE_PG',message:'private provider data'};}};`});
    }
    if(configError&&url===base+'/review/config')return route.fulfill({status:503,body:'unavailable'});
    if(url.startsWith(base+'/'))return route.continue();
    requests.external++;return route.abort();
  });
  await page.goto(base+'/review/apply');
  const fill=async()=>{
    await page.locator('[name=customerName]').fill('Review User');
    await page.locator('[name=customerPhone]').fill('01000000000');
    await page.locator('[name=customerEmail]').fill('review@example.invalid');
    await page.locator('[name=brief]').fill('Local review only');
    for(const input of await page.locator('input[type=checkbox]:enabled').all())await input.check();
  };
  return {page,fill,base,requests};
}
test('mock SDK: single local checkout opens KG V2 request with exact price and minimal buyer fields, then cancellation returns safely',async t=>{
  const {page,fill,base,requests}=await setupBrowser(t);
  assert.match(await page.locator('h1').textContent(),/로컬 PG 심사/);
  assert.equal(await page.locator('.checkout button').count(),1);
  assert.equal(requests.sdk,0);
  await fill();await page.locator('[name=plan]').selectOption('Deluxe');
  assert.equal(await page.locator('#order-total').textContent(),'총 가격: 768,900₩');
  await page.evaluate(()=>window.reply={code:'FAILURE_TYPE_STOPPED',message:'provider text not for display'});
  await page.locator('button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('취소'));
  const calls=await page.evaluate(()=>window.calls);assert.equal(calls.length,1);
  const request=calls[0];assert.equal(request.storeId,fixture.PORTONE_TEST_STORE_ID);assert.equal(request.channelKey,fixture.PORTONE_TEST_CHANNEL_KEY);
  assert.equal(request.totalAmount,768900);assert.equal(request.currency,'KRW');assert.equal(request.payMethod,'CARD');
  assert.deepEqual(request.customer,{fullName:'Review User',phoneNumber:'01000000000',email:'review@example.invalid'});
  assert.ok(request.paymentId.length>=1&&request.paymentId.length<=40,'KG oid must contain 1–40 characters');
  assert.match(request.paymentId,/^cjy-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,'retain the entire random UUID v4');
  assert.ok(Buffer.byteLength(request.orderName)<=40);
  assert.equal(request.redirectUrl,base+'/review/apply');
  assert.equal(requests.external,0);assert.equal(requests.sdk,1);
  assert.equal(await page.locator('button[type=submit]').isEnabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  assert.doesNotMatch(JSON.stringify(request),/brief|policyEvidence|productionAuthorized/);
});

test('mock SDK: correlated mobile returns clear URL data, restore plan, never accept unverified success or replay an unresolved attempt',async t=>{
  const {page,fill,base,requests}=await setupBrowser(t);
  await fill();await page.locator('[name=plan]').selectOption('Premium');
  await page.evaluate(()=>window.reply='pending');
  await page.locator('button[type=submit]').click();
  await page.waitForFunction(()=>window.calls?.length===1);
  const id=await page.evaluate(()=>window.calls[0].paymentId);
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('cjy-review-attempt')));
  assert.equal(stored.paymentId,id);assert.equal(stored.plan,'Premium');assert.equal(stored.phase,'pending');
  assert.doesNotMatch(JSON.stringify(stored),/Review User|01000000000|review@example/);
  await page.goto(base+'/review/apply?paymentId='+id+'&code=FAILURE_TYPE_STOPPED&message=private');
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('취소'));
  assert.equal(page.url(),base+'/review/apply');assert.equal(await page.locator('[name=plan]').inputValue(),'Premium');
  assert.equal(await page.locator('button[type=submit]').isEnabled(),true);
  await fill();await page.evaluate(()=>window.reply='pending');await page.locator('button[type=submit]').click();
  await page.waitForFunction(()=>window.calls?.length===1);
  const next=await page.evaluate(()=>window.calls[0].paymentId);assert.notEqual(id,next);
  await page.goto(base+'/review/apply?paymentId='+next+'&transactionType=PAYMENT');
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('서버 검증 전'));
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  assert.equal(page.url(),base+'/review/apply');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('서버 검증 전'));
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(requests.external,0);
  assert.equal(await page.evaluate(()=>window.calls?.length??0),0);
});

test('KG V2 buyer validation and original conditional form controls remain usable without sending invalid inputs',async t=>{
  const {page,fill,requests}=await setupBrowser(t);await fill();
  await page.locator('[name=customerName]').fill('가'.repeat(11));
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('[name=customerName]').evaluate(e=>e.checkValidity()),false);
  assert.equal(requests.sdk,0);
  await page.locator('[name=customerName]').fill('Review User');
  await page.locator('[name=customerPhone]').fill('not-a-phone');await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('[name=customerPhone]').evaluate(e=>e.checkValidity()),false);
  await page.locator('[name=customerPhone]').fill('01000000000');
  await page.locator('[name=customerEmail]').fill('');await page.locator('button[type=submit]').click();assert.equal(requests.sdk,0);
  await page.locator('[name=customerEmail]').fill('review@example.invalid');
  await page.locator('[name=autoPost]').selectOption('no');
  assert.equal(await page.locator('[name=postingConsent]').isDisabled(),true);
  assert.equal(await page.locator('[data-account]').isHidden(),true);
  await page.locator('.brief-help').click();assert.equal(await page.locator('#brief-guide').isVisible(),true);
  await page.evaluate(()=>window.reply={code:'FAILURE_TYPE_STOPPED'});await page.locator('button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('취소'));assert.equal(requests.sdk,1);
});

test('local form fails closed before JS, on missing config and on SDK/config load failures with safe actionable status',async t=>{
  const {base}=await setupServer(t);
  const html=await (await fetch(base+'/review/apply')).text();
  assert.match(html,/<button type="submit" disabled>/);
  assert.match(html,/<form id="application-form" method="post" action="\/review\/blocked">/);
  for(const scenario of [{env:{PORTONE_REVIEW_UI:'1'}},{configError:true},{sdkError:true},{sdkHang:true}]){
    const {page,fill,requests}=await setupBrowser(t,scenario);
    if(scenario.sdkHang)await page.clock.install();
    if(scenario.sdkError||scenario.sdkHang){
      await fill();await page.locator('button[type=submit]').click();
      if(scenario.sdkHang){await page.waitForFunction(()=>!!document.querySelector('script[src="https://cdn.portone.io/v2/browser-sdk.js"]'));await page.clock.fastForward(11000);}
    }
    await page.waitForFunction(()=>/설정|SDK/.test(document.querySelector('#checkout-status').textContent));
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.calls?.length??0),0);assert.equal(requests.external,0);
    if(scenario.env||scenario.configError)assert.equal(requests.sdk,0);
  }
});

test('mock SDK: back navigation and unmatched returns stay unresolved; failures never echo raw data and duplicate clicks never request twice',async t=>{
  const {page,fill,base,requests}=await setupBrowser(t);await fill();
  await page.evaluate(()=>{window.reply='pending';const f=document.querySelector('form');f.requestSubmit();f.requestSubmit();});
  await page.waitForFunction(()=>window.calls?.length===1);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  assert.match(await page.locator('#checkout-status').textContent(),/서버 검증 전/);
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  await page.evaluate(()=>window.release({code:'FAILURE_TYPE_AUTHENTICATION_FAILED',message:'<img src=x>private provider data'}));
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('실패'));
  assert.doesNotMatch(await page.locator('#checkout-status').textContent(),/private|img/);
  await page.evaluate(()=>window.reply={paymentId:'synthetic-success-response'});
  await page.locator('button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('서버 검증 전'));
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(requests.external,0);
  const other=await page.context().newPage();await other.goto(base+'/review/apply?paymentId=not-this-session&code=FAILURE_TYPE_STOPPED');
  await other.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('일치하지'));
  assert.equal(await other.locator('button[type=submit]').isDisabled(),true);assert.equal(other.url(),base+'/review/apply');
});

test('local policy links render unchanged policy metadata; mobile missing-config surface retains one visible checkout without overflow',async t=>{
  const {page,base}=await setupBrowser(t,{env:{PORTONE_REVIEW_UI:'1'}});
  for(const kind of ['terms','privacy','refund']){
    const response=await fetch(base+'/'+kind);assert.equal(response.status,200);
    const html=await response.text();assert.match(html,new RegExp('data-policy-kind="'+kind+'"'));
    assert.match(html,/data-checkout-eligible="false"/);assert.match(html,/data-payment-live="false"/);
  }
  await page.setViewportSize({width:390,height:844});
  // ResizeObserver/layout can settle after the already-present TEST status.
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.waitForFunction(()=>document.querySelector('#checkout-status').textContent.includes('TEST'));
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  assert.equal(await page.locator('.checkout button').count(),1);
  const box=await page.locator('.checkout button').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=844);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.CJY_REVIEW_EVIDENCE_DIR){
    const {mkdir}=await import('node:fs/promises');await mkdir(process.env.CJY_REVIEW_EVIDENCE_DIR,{recursive:true});
    await page.screenshot({path:process.env.CJY_REVIEW_EVIDENCE_DIR+'/local-review-blocked-mobile.png',fullPage:true});
  }
});

test('CSP frame-src permits the exact checkout service origin without widening the review frame allowlist',async t=>{
  const {base}=await setupServer(t);
  const csp=(await fetch(base+'/review/apply')).headers.get('content-security-policy');
  const sources=csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('frame-src ')).split(/\s+/).slice(1);
  assert.ok(sources.includes('https://checkout-service.prod.iamport.co'),'frame-src permits the observed checkout service origin');
  assert.deepEqual(sources.toSorted(),[
    'https://service.iamport.kr','https://*.inicis.com','https://checkout-service.prod.iamport.co'
  ].toSorted(),'only the exact checkout origin is added to the existing frame allowlist');
});

test('CSP permits official SDK dynamic driver scripts and definitions without allowing arbitrary hosts',async t=>{
  const {base}=await setupServer(t);
  const csp=(await fetch(base+'/review/apply')).headers.get('content-security-policy');
  for(const directive of ['script-src','connect-src']){
    const sources=csp.split(';').map(s=>s.trim()).find(s=>s.startsWith(directive+' '));
    assert.ok(sources.split(' ').includes('https://cdn.portone.io/drivers/'),directive+' permits official driver assets');
    assert.ok(!sources.split(' ').includes('*'));assert.doesNotMatch(sources,/railway/);
  }
});
