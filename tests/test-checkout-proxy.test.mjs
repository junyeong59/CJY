import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');
// Add a test-only export in memory; the deployed module has only a default entrypoint.
const proxy=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {createTestProxy};').toString('base64'));
const origin='https://synthetic-test-only.up.railway.app';
test('bounded POST forwarding preserves raw signed bytes and authorization without cookies',async()=>{
 assert.equal(typeof proxy.createTestProxy,'function');
 const raw=new Uint8Array([123,32,34,120,34,58,34,237,149,156,34,125,10]);
 let calls=0;
 const handler=proxy.createTestProxy(origin,async(url,options)=>{
  calls++;assert.equal(url,origin+'/api/test/checkout/webhook');assert.equal(options.redirect,'manual');
  assert.deepEqual(new Uint8Array(options.body),raw);
  assert.equal(options.headers.get('webhook-signature'),'v1,synthetic');
  assert.equal(options.headers.get('authorization'),'Bearer synthetic');
  assert.equal(options.headers.get('cookie'),null);assert.equal(options.headers.get('x-forwarded-host'),null);
  return new Response('{"ok":true}',{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=900','Set-Cookie':'bad=1'}});
 });
 const r=await handler.fetch(new Request('https://cjy.app/api/test/checkout/webhook',{method:'POST',body:raw,headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic','webhook-id':'synthetic','webhook-timestamp':'1','webhook-signature':'v1,synthetic',Cookie:'private=1','x-forwarded-host':'evil.invalid'}}),{});
 assert.equal(calls,1);assert.equal(r.status,200);assert.equal(await r.text(),'{"ok":true}');assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Set-Cookie'),null);
});
test('allowlist rejects non-TEST routes, queries, methods and cross-origin checkout before forwarding',async()=>{
 let calls=0;const handler=proxy.createTestProxy(origin,async()=>{calls++;return new Response('{}');});
 const cases=[['/api/test/checkout/open?url=https://evil.invalid','POST','https://cjy.app',404],['/api/test/checkout/nope','POST','https://cjy.app',404],['/api/test/checkout/open/','POST','https://cjy.app',404],['/api/test/checkout/open','GET','https://cjy.app',405],['/api/test/checkout/open','POST','https://evil.invalid',403],['/api/test/checkout/status','POST',null,403],['/api/test/checkout/webhook','OPTIONS',null,405]];
 for(const [path,method,originHeader,status] of cases){const r=await handler.fetch(new Request('https://cjy.app'+path,{method,headers:originHeader?{Origin:originHeader}:{}}),{});assert.equal(r.status,status,path);}
 assert.equal(calls,0);
 let assets=0;const r=await handler.fetch(new Request('https://cjy.app/apply'),{ASSETS:{fetch(){assets++;return new Response('existing apply');}}});assert.equal(await r.text(),'existing apply');assert.equal(assets,1);
 const options=await handler.fetch(new Request('https://cjy.app/api/test/checkout/open',{method:'OPTIONS',headers:{Origin:'https://cjy.app'}}),{});assert.equal(options.status,204);assert.equal(calls,0);
});
test('invalid backend pins, oversized bodies and encoded bodies cannot egress',async()=>{
 for(const pin of ['http://test.up.railway.app','https://evil.invalid','https://u:p@test.up.railway.app','https://test.up.railway.app/path','https://customer-gateway-staging.up.railway.app','https://test.up.railway.app:444'])assert.throws(()=>proxy.createTestProxy(pin));
 let calls=0;const handler=proxy.createTestProxy(origin,async()=>{calls++;return new Response('{}');});
 for(const [body,headers,status] of [[new Uint8Array(65537),{},413],['{}',{'content-length':'65537'},413],['{}',{'content-encoding':'gzip'},415]]){
  const r=await handler.fetch(new Request('https://cjy.app/api/test/checkout/webhook',{method:'POST',body,headers}),{});assert.equal(r.status,status);
 }
 assert.equal(calls,0);
});
test('redirects and upstream failures are opaque no-store failures without retries',async()=>{
 for(const send of [async()=>new Response(null,{status:302,headers:{Location:'https://evil.invalid'}}),async()=>{throw Error('synthetic secret');}]){
  let calls=0;const h=proxy.createTestProxy(origin,async(...args)=>{calls++;return send(...args);});
  const r=await h.fetch(new Request('https://cjy.app/api/test/checkout/webhook',{method:'POST',body:'{}'}),{});
  assert.equal(r.status,502);assert.equal(r.headers.get('location'),null);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.text()).includes('synthetic'),false);assert.equal(calls,1);
 }
});
test('upstream response bytes are bounded and fetch has a finite abort deadline',async()=>{
 let signal;
 const h=proxy.createTestProxy(origin,async(_url,options)=>{signal=options.signal;return new Response(new Uint8Array(65537));});
 const r=await h.fetch(new Request('https://cjy.app/api/test/checkout/webhook',{method:'POST',body:'{}'}),{});
 assert.equal(r.status,502);assert.ok(signal instanceof AbortSignal);
});
test('Pages build includes the actual worker and only invokes it on TEST API paths',async()=>{
 const {readFile}=await import('node:fs/promises');
 const routes=JSON.parse(await readFile(new URL('../public/_routes.json',import.meta.url),'utf8'));
 assert.deepEqual(routes,{version:1,include:['/api/test/*'],exclude:[]});
});
const moduleUrl=new URL('../public/_worker.js',import.meta.url);
test('Pages advanced worker exists and fails closed without a verified backend pin',async()=>{
 assert.ok(existsSync(moduleUrl),'missing actual Pages advanced-mode worker');
 const worker=proxy.createTestProxy(null);
 const r=await worker.fetch(new Request('https://cjy.app/api/test/checkout/status',{method:'POST',headers:{Origin:'https://cjy.app'},body:'{}'}),{});
 assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');
});
