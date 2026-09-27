import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');
const {createTestProxy}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {createTestProxy};').toString('base64'));
test('apply proxy allows only owned cookie and exact secure Set-Cookie on session bootstrap',async()=>{
 const cookie='__Host-cjy_apply='+'x'.repeat(43),set=cookie+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800';let calls=0;
 const handler=createTestProxy('https://synthetic-test-only.up.railway.app',async(u,o)=>{calls++;assert.equal(o.headers.get('cookie'),cookie);assert.equal(o.headers.get('authorization'),null);return new Response('{}',{headers:{'Set-Cookie':set}});});
 for(const action of ['session','submit','status','open','verify']){const r=await handler.fetch(new Request('https://cjy.app/api/test/apply/'+action,{method:'POST',body:'{}',headers:{Origin:'https://cjy.app',Cookie:'unrelated=private; '+cookie,Authorization:'Bearer private'}}),{});assert.equal(r.status,200);assert.equal(r.headers.get('Set-Cookie'),action==='session'?set:null);}
 assert.equal(calls,5);
 for(const [path,origin,status] of [['status?receipt=private','https://cjy.app',404],['enroll','https://cjy.app',404],['submit','https://evil.test',403]]){const r=await handler.fetch(new Request('https://cjy.app/api/test/apply/'+path,{method:'POST',body:'{}',headers:{Origin:origin}}),{});assert.equal(r.status,status);}
 const bad=createTestProxy('https://synthetic-test-only.up.railway.app',async()=>new Response('{}',{headers:{'Set-Cookie':set+'; Domain=cjy.app'}}));const r=await bad.fetch(new Request('https://cjy.app/api/test/apply/session',{method:'POST',body:'{}',headers:{Origin:'https://cjy.app'}}),{});assert.equal(r.status,502);
});
