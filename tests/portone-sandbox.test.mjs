import test from 'node:test';
import assert from 'node:assert/strict';

const url=new URL('../sandbox/portone-browser-sdk.js',import.meta.url);
test('simulated DOM: official script loads once, reports API readiness, never requests payment',async()=>{
  const {createSandboxSdkLoader}=await import(url);const d=dom();let payments=0;
  const load=createSandboxSdkLoader({...d,enabled:true,timeoutMs:30});
  const first=load(),second=load();assert.equal(first,second);assert.equal(d.nodes.length,1);
  assert.equal(d.nodes[0].src,'https://cdn.portone.io/v2/browser-sdk.js');
  d.window.PortOne={requestPayment:()=>{payments++;assert.fail('no payment authorization');}};
  d.nodes[0].onload();assert.deepEqual(await first,{status:'loaded',paymentEnabled:false});
  assert.equal(payments,0);assert.deepEqual(await load(),{status:'loaded',paymentEnabled:false});
  assert.equal(d.nodes.length,1);
});
test('simulated script errors, missing API and timeout fail closed without retry',async()=>{
  const {createSandboxSdkLoader}=await import(url);
  for(const mode of ['error','missing-api','timeout']){
    const d=dom();const load=createSandboxSdkLoader({...d,enabled:true,timeoutMs:5});const result=load();
    if(mode==='error')d.nodes[0].onerror();
    if(mode==='missing-api')d.nodes[0].onload();
    assert.deepEqual(await result,{status:'load_failed',paymentEnabled:false});
    assert.deepEqual(await load(),{status:'load_failed',paymentEnabled:false});assert.equal(d.nodes.length,1);
  }
});

test('local test surface is default-off, fixed allowlist, rejects public Host/origin and has no payment routes',async()=>{
  const sdk=await import('../scripts/serve-portone-sandbox.mjs').catch(()=>({}));
  assert.equal(typeof sdk.createPortOneSandboxServer,'function','local sandbox surface exists');
  assert.equal(sdk.createPortOneSandboxServer({env:{}}),null);
  const server=sdk.createPortOneSandboxServer({env:{PORTONE_SANDBOX_UI:'1'}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    const page=await fetch(base+'/sandbox/portone');assert.equal(page.status,200);
    const html=await page.text();assert.match(html,/Load official SDK only/);assert.doesNotMatch(html,/API_SECRET|WEBHOOK_SECRET/);
    assert.equal((await fetch(base+'/sandbox/portone-browser-sdk.js')).status,200);
    for(const path of ['/api/sandbox/order','/api/sandbox/refund','/src/config.js','/.git/config','/'])assert.equal((await fetch(base+path)).status,404);
    assert.equal((await fetch(base+'/sandbox/portone',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/sandbox/portone',{headers:{Origin:'https://attacker.invalid'}})).status,403);
    assert.match(page.headers.get('content-security-policy'),/connect-src 'none'/);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('headless browser: local button loads intercepted official SDK; zero payment calls or external traffic',async t=>{
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs');
  const {createPortOneSandboxServer}=await import('../scripts/serve-portone-sandbox.mjs');
  const server=createPortOneSandboxServer({env:{PORTONE_SANDBOX_UI:'1'}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||chromium.executablePath()});
  t.after(()=>browser.close());const page=await browser.newPage();
  const base=`http://127.0.0.1:${server.address().port}`;let scripts=0,external=0;
  await page.route('**/*',route=>{
    const target=route.request().url();
    if(target==='https://cdn.portone.io/v2/browser-sdk.js'){
      scripts++;return route.fulfill({contentType:'text/javascript',body:'window.paymentCalls=0;window.PortOne={requestPayment(){window.paymentCalls++;throw Error("payment forbidden")}};'});
    }
    if(target.startsWith(base+'/'))return route.continue();
    external++;return route.abort();
  });
  await page.goto(base+'/sandbox/portone');assert.equal(scripts,0);
  await page.getByRole('button',{name:'Load official SDK only'}).click();
  await page.waitForFunction(()=>document.getElementById('sdk-status').textContent==='Official SDK loaded. Payment remains disabled.');
  assert.equal(scripts,1);assert.equal(external,0);assert.equal(await page.evaluate(()=>window.paymentCalls),0);
  assert.equal(await page.getByRole('button').isDisabled(),true);
});

function dom(){
  const nodes=[];const window={location:{hostname:'127.0.0.1',pathname:'/sandbox/portone'}};
  const document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild(node){nodes.push(node);}}};
  return {window,document,nodes};
}
test('browser SDK remains unloaded by default, or on any public/non-sandbox surface',async()=>{
  const sdk=await import(url).catch(()=>({}));
  assert.equal(typeof sdk.createSandboxSdkLoader,'function','sandbox loader exists');
  for(const changes of [{},{enabled:true,hostname:'cjy.im'},{enabled:true,pathname:'/'}]){
    const d=dom();Object.assign(d.window.location,changes);
    const load=sdk.createSandboxSdkLoader({...d,enabled:changes.enabled});
    assert.deepEqual(await load(),{status:'disabled'});assert.equal(d.nodes.length,0);
  }
});
