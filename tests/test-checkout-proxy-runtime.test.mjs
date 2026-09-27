// Run with MINIFLARE_MODULE=/absolute/path/to/miniflare/dist/src/index.js.
// No network reaches Railway/PortOne: outboundService intercepts every fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {Miniflare,convertV4MiniflareOptions}=await import(process.env.MINIFLARE_MODULE||'miniflare');
const makeRuntime=options=>new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');
test('actual workerd accepts the deployed pin but rejects unauthorized results through the backend',async()=>{
 let calls=0;const mf=makeRuntime({workers:[{modules:true,script:source,compatibilityDate:'2026-09-26',outboundService(req){calls++;assert.equal(new URL(req.url).origin,'https://cjy-test-checkout-staging.up.railway.app');return new Response('{}',{status:403});}}]});
 try{const r=await mf.dispatchFetch('https://cjy.app/api/test/checkout/status',{method:'POST',headers:{Origin:'https://cjy.app'},body:'{}'});assert.equal(r.status,403);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(calls,1);}finally{await mf.dispose();}
});
test('actual workerd forwards exact synthetic signed bytes only to the fixture pin',async()=>{
 const raw=' {"synthetic":"한글"}\n';let calls=0;
 assert.match(source,/const PINNED_TEST_BACKEND_ORIGIN = (?:null|'https:\/\/cjy-test-checkout-staging.up.railway.app');/);
 // In-memory fixture only: every egress is intercepted.
 const fixture=source.replace(/const PINNED_TEST_BACKEND_ORIGIN = [^;]+;/,"const PINNED_TEST_BACKEND_ORIGIN = 'https://synthetic-test-only.up.railway.app';");
 const mf=makeRuntime({workers:[{modules:true,script:fixture,compatibilityDate:'2026-09-26',async outboundService(req){
  calls++;assert.equal(req.url,'https://synthetic-test-only.up.railway.app/api/test/checkout/webhook');
  assert.deepEqual(new Uint8Array(await req.arrayBuffer()),new TextEncoder().encode(raw));
  assert.equal(req.headers.get('webhook-signature'),'v1,synthetic');assert.equal(req.headers.get('authorization'),'Bearer synthetic');assert.equal(req.headers.get('cookie'),null);
  return new Response('{"synthetic":true}',{headers:{'Content-Type':'application/json','Cache-Control':'public','Set-Cookie':'bad=1'}});
 }}]});
 try{
  const r=await mf.dispatchFetch('https://cjy.app/api/test/checkout/webhook',{method:'POST',headers:{'Content-Type':'application/json','webhook-signature':'v1,synthetic','webhook-id':'synthetic','webhook-timestamp':'1',Authorization:'Bearer synthetic',Cookie:'secret=notforwarded'},body:raw});
  assert.equal(r.status,200);assert.equal(await r.text(),'{"synthetic":true}');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('set-cookie'),null);assert.equal(calls,1);
 }finally{await mf.dispose();}
});
