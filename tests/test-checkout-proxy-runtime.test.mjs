// Actual workerd verification; all outbound traffic is intercepted.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {Miniflare,convertV4MiniflareOptions}=await import(process.env.MINIFLARE_MODULE||'miniflare');
const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');
test('deployed worker retires legacy APIs and unknown APIs with zero network effects',async()=>{
 let calls=0;const options={workers:[{modules:true,script:source,compatibilityDate:'2026-09-26',outboundService(){calls++;throw Error('retired API egress');}}]};const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 try{for(const [path,status] of [['/api/test/apply/session',410],['/api/test/apply/save',410],['/api/test/checkout/webhook',410],['/api/unknown',404]]){
  const r=await mf.dispatchFetch('https://cjy.app'+path,{method:'POST',body:'{}',headers:{Authorization:'Bearer ignored',Cookie:'old=ignored'}});assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('set-cookie'),null);
 }assert.equal(calls,0);}finally{await mf.dispose();}
});
