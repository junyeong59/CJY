import test from 'node:test';import assert from 'node:assert/strict';import worker from '../public/_worker.js';
test('every legacy apply action is retired regardless of cookies, JWT or request origin',async()=>{
 let assets=0;const env={ASSETS:{fetch(){assets++;throw Error('API reached static assets');}}};
 for(const action of ['session','submit','status','open','verify','orders','new','application','revise','save','retry-edit','reopen','unknown']){
  const response=await worker.fetch(new Request('https://cjy.app/api/test/apply/'+action,{method:'POST',body:'{}',headers:{Origin:'https://evil.invalid',Cookie:'old=ignored',Authorization:'Bearer ignored'}}),env);
  assert.equal(response.status,410,action);assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{error:'legacy_api_retired'});
 }
 assert.equal(assets,0);
});
