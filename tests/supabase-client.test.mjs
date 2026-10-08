import test from 'node:test';
import assert from 'node:assert/strict';

// Auth and network are external boundaries; the transport itself is real.
test('persisted official Auth identity authorizes direct Edge actions without cookies',async()=>{
 const {createApplyApi,SUPABASE_URL}=await import('../src/supabase-client.js');
 let signs=0;const requests=[];
 const api=createApplyApi({auth:{getSession:async()=>({data:{session:{access_token:'persisted-jwt'}},error:null}),signInAnonymously:async()=>{signs++;}}},async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({status:'pending-review',draftId:'draft'})};},'public-test-key');
 assert.deepEqual(await api('save',{brief:'request'}),{status:'pending-review',draftId:'draft'});
 assert.equal(signs,0);
 assert.equal(requests[0].url,SUPABASE_URL+'/functions/v1/cjy-api/save');
 assert.equal(requests[0].options.headers.Authorization,'Bearer persisted-jwt');
 assert.equal(requests[0].options.headers.apikey,'public-test-key');
 assert.equal(requests[0].options.credentials,'omit');
 assert.deepEqual(JSON.parse(requests[0].options.body),{brief:'request'});
});

test('first anonymous session is shared by concurrent actions and then reused',async()=>{
 const {createApplyApi}=await import('../src/supabase-client.js');let signs=0,session=null;const tokens=[];
 const api=createApplyApi({auth:{getSession:async()=>({data:{session},error:null}),signInAnonymously:async()=>{signs++;await new Promise(r=>setTimeout(r,10));session={access_token:'anonymous-jwt'};return {data:{session},error:null};}}},async(url,o)=>{tokens.push(o.headers.Authorization);return {ok:true,json:async()=>({})};});
 await Promise.all([api('status'),api('orders')]);await api('save');
 assert.equal(signs,1);assert.deepEqual(tokens,Array(3).fill('Bearer anonymous-jwt'));
});

for(const mode of ['read-error','malformed-session','signup-error','edge-401'])test(`${mode} does not silently create a second identity`,async()=>{
 const {createApplyApi}=await import('../src/supabase-client.js');let signs=0,requests=0;
 const api=createApplyApi({auth:{getSession:async()=>({data:{session:mode==='edge-401'?{access_token:'existing'}:mode==='malformed-session'?{}:null},error:mode==='read-error'?Error('read-error'):null}),signInAnonymously:async()=>{signs++;return {data:{session:null},error:Error('signup-error')};}}},async()=>{requests++;return {ok:false,status:401};});
 await assert.rejects(api('status'));await assert.rejects(api('status'));
 assert.equal(signs,mode==='signup-error'?1:0);assert.equal(requests,mode==='edge-401'?2:0);
});

test('loss of an already observed persisted session never creates another identity',async()=>{
 const {createApplyApi}=await import('../src/supabase-client.js');let session={access_token:'owner-jwt'},signs=0;
 const api=createApplyApi({auth:{getSession:async()=>({data:{session},error:null}),signInAnonymously:async()=>{signs++;return {data:{session:{access_token:'new-owner'}},error:null};}}},async()=>({ok:true,json:async()=>({})}));
 await api('status');session=null;await assert.rejects(api('orders'),/auth_unavailable/);assert.equal(signs,0);
});
