import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFirstMonthPrice} from '../src/commercial.js';
import {POLICY_DOCUMENTS} from '../src/policy-documents.js';
test('new policy binds selected quantity without changing old monthly documents',()=>{
 const text=JSON.stringify(POLICY_DOCUMENTS);
 assert.match(text,/선택한 수량/);
 assert.match(text,/2개 이상.*매일 하나씩/);
 assert.doesNotMatch(text,/신규 구매는 콘텐츠 1건입니다|각 구매는 콘텐츠 1건에 대한/);
});
test('normal item quotes multiply unit supply and VAT for quantities 1, 2, 30',()=>{
 for(const [plan,unit] of [['Standard',4900],['Deluxe',9900],['Premium',34900]])for(const quantity of [1,2,30]){
  const p=calculateFirstMonthPrice(plan,quantity);
  assert.equal(p.supplyTotalWon,unit*quantity);
  assert.equal(p.vatWon,unit*quantity/10);
  assert.equal(p.totalWon,unit*quantity*11/10);
 }
 for(const quantity of [0,-1,1.5,31,'2',null,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>calculateFirstMonthPrice('Standard',quantity),RangeError);
 for(const plan of ['AI Influencer Start-pack','AI Cinema Start-pack'])assert.throws(()=>calculateFirstMonthPrice(plan,2),RangeError);
 assert.equal(calculateFirstMonthPrice('Standard').totalWon,5390);
});
