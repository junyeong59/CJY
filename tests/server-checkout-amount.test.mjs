import test from 'node:test';import assert from 'node:assert/strict';
test('checkout accepts any positive server amount rather than a fixed Standard test total',async()=>{
 const {validateTestCheckout}=await import('../src/apply-checkout.js');
 for(const totalAmount of [273900,768900,1208900,100])assert.doesNotThrow(()=>validateTestCheckout({environment:'test',currency:'KRW',totalAmount}));
 for(const r of [{environment:'live',currency:'KRW',totalAmount:100},{environment:'test',currency:'USD',totalAmount:100},{environment:'test',currency:'KRW',totalAmount:0},{environment:'test',currency:'KRW',totalAmount:1.5},{currency:'KRW',totalAmount:100}])assert.throws(()=>validateTestCheckout(r),/checkout_binding/);
});
