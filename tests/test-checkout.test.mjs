import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('checkout diagnostics retain only safe codes and never guess PG cancellation',async()=>{
 const m=await import('../src/payment-result.js').catch(()=>({}));
 assert.equal(typeof m.classifyPaymentResult,'function');
 assert.deepEqual(m.classifyPaymentResult({code:'FAILURE_TYPE_STOPPED',pgCode:'USER_CANCEL',message:'private',pgMessage:'private'}),{phase:'cancelled',sdkCode:'FAILURE_TYPE_STOPPED',pgCode:'USER_CANCEL'});
 assert.equal(m.classifyPaymentResult({code:'FAILURE_TYPE_PG',pgCode:'UNKNOWN'}).phase,'failed');
 assert.equal(m.classifyPaymentResult({}).phase,'unverified');
 assert.equal(m.classifyPaymentResult({code:'bad private text',pgCode:'a@b.com'}).sdkCode,null);
 assert.equal(m.classifyPaymentResult({code:'bad private text',pgCode:'a@b.com'}).pgCode,null);
});
test('public TEST checkout build includes explicit bounded consent and module, not review sandbox',async()=>{
 const html=await readFile(new URL('../public/test/checkout/index.html',import.meta.url),'utf8').catch(()=>'');
 assert.match(html,/실제 출금/);assert.match(html,/cjy-test-2026-09-26/);assert.match(html,/test-checkout.js/);
 assert.doesNotMatch(html,/sandbox\/review/);
});
