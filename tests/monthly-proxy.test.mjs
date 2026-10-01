import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');
const {createTestProxy}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {createTestProxy};').toString('base64'));
const owner='__Host-cjy_apply='+'a'.repeat(43), monthly='__Host-cjy_monthly='+'m'.repeat(43),set=monthly+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600';
const request=(action,cookie=owner+'; '+monthly,extra={})=>new Request('https://cjy.app/api/test/apply/'+action,{method:'POST',body:'{}',headers:{origin:'https://cjy.app',cookie,...extra}});
test('monthly routes forward only required cookies and exact recovery response',async()=>{
 let seen=[];const proxy=createTestProxy('https://synthetic-test-only.up.railway.app',async(u,o)=>{seen.push([u.split('/').at(-1),o.headers.get('cookie')]);assert.equal(o.headers.get('authorization'),null);return new Response('{}',{headers:{'Set-Cookie':set}});});
 for(const action of ['monthly-recover','monthly-orders','monthly-renew']){const r=await proxy.fetch(request(action,'other=secret; '+owner+'; '+monthly,{authorization:'secret'}),{});assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),action==='monthly-recover'?set:null);}
 assert.deepEqual(seen,[['monthly-recover',owner],['monthly-orders',owner+'; '+monthly],['monthly-renew',owner]]);
 for(const c of [monthly+'; '+monthly,'__Host-cjy_monthly=bad',owner+'; '+owner])assert.equal((await proxy.fetch(request('monthly-orders',c),{})).status,403);
 assert.equal((await proxy.fetch(request('monthly-orders?x=1'),{})).status,404);
 assert.equal((await proxy.fetch(request('monthly-renew',owner,{origin:'https://evil.test'}),{})).status,403);
 assert.equal((await proxy.fetch(request('monthly-renew',owner,{'content-length':'65537'}),{})).status,413);
});
test('monthly response rejects cookie ambiguity, extra attributes and non-success',async()=>{
 for(const [cookie,status] of [[set+'; Domain=cjy.app',200],[set+', '+set,200],[set.replace('Strict','Lax'),200],[set,400]]){const proxy=createTestProxy('https://synthetic-test-only.up.railway.app',async()=>new Response('{}',{status,headers:{'Set-Cookie':cookie}}));assert.equal((await proxy.fetch(request('monthly-recover'),{})).status,502);}
});
