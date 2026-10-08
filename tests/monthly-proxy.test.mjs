import test from 'node:test';import assert from 'node:assert/strict';import worker from '../public/_worker.js';
test('retired monthly and contact paths cannot revive legacy cookie authority',async()=>{
 for(const action of ['monthly-recover','monthly-orders','monthly-renew','contact-link','orders','retry-edit','reopen']){
  const response=await worker.fetch(new Request('https://cjy.app/api/test/apply/'+action,{method:'POST',body:'{}',headers:{cookie:'__Host-cjy_apply=ignored; __Host-cjy_monthly=ignored'}}),{});
  assert.equal(response.status,410);assert.equal(response.headers.get('set-cookie'),null);
 }
});
