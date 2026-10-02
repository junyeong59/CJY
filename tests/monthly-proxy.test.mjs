import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/_worker.js',import.meta.url),'utf8');const {createTestProxy}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {createTestProxy};').toString('base64'));
const owner='__Host-cjy_apply='+'a'.repeat(43),monthly='__Host-cjy_monthly='+'m'.repeat(43);
const request=(action,cookie=owner+'; '+monthly,extra={})=>new Request('https://cjy.app/api/test/apply/'+action,{method:'POST',body:'{}',headers:{origin:'https://cjy.app',cookie,...extra}});
test('readonly recovery is retired without upstream effects; owned and renewal forward owner only',async()=>{
 const seen=[];const proxy=createTestProxy('https://synthetic-test-only.up.railway.app',async(u,o)=>{seen.push([u.split('/').at(-1),o.headers.get('cookie')]);assert.equal(o.headers.get('authorization'),null);return new Response('{}');});
 for(const action of ['monthly-recover','monthly-orders'])assert.equal((await proxy.fetch(request(action),{})).status,404);assert.equal(seen.length,0);
 for(const action of ['orders','monthly-renew'])assert.equal((await proxy.fetch(request(action,'other=secret; '+owner+'; '+monthly,{authorization:'secret'}),{})).status,200);
 assert.deepEqual(seen,[['orders',owner],['monthly-renew',owner]]);
 assert.equal((await proxy.fetch(request('monthly-renew',owner,{origin:'https://evil.test'}),{})).status,403);assert.equal((await proxy.fetch(request('monthly-renew',owner,{'content-length':'65537'}),{})).status,413);
});
