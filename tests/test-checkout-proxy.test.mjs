import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import worker from '../public/_worker.js';
test('legacy checkout and webhook routes have no upstream forwarding for any method',async()=>{
 for(const path of ['/api/test','/api/test/checkout/open','/api/test/checkout/status?receipt=ignored','/api/test/checkout/verify','/api/test/checkout/webhook','/api/test/unknown'])for(const method of ['GET','POST','OPTIONS']){
  const response=await worker.fetch(new Request('https://cjy.app'+path,{method}),{});
  assert.equal(response.status,410);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('location'),null);
 }
 const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');assert.doesNotMatch(source,/railway|createTestProxy|set-cookie|upstreamFetch|__Host-cjy/);
});
test('unknown API paths fail closed, while static and SPA requests preserve asset responses',async()=>{
 for(const path of ['/api','/api/unknown','/api/test-other'])assert.equal((await worker.fetch(new Request('https://cjy.app'+path),{})).status,404);
 for(const path of ['/','/apply','/order','/src/supabase-client.js','/component/CJY.svg']){
  const req=new Request('https://cjy.app'+path);const asset=new Response('asset',{headers:{'Content-Security-Policy':"default-src 'self'",'X-Asset-Test':'preserved'}});
  const response=await worker.fetch(req,{ASSETS:{fetch(r){assert.equal(r,req);return asset;}}});assert.equal(response,asset);assert.equal(response.headers.get('X-Asset-Test'),'preserved');
 }
});
