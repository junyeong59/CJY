import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
const draft='a0000000-0000-4000-8000-000000000001';
const reply=async(r,json)=>{await r.fulfill({json});return true;};
test('service and quantity controls quote, save, restore and send numeric quantity to bank order',async t=>{
 let saved;const calls=[];
 const {page,fill}=await bankPage(t,async(action,r)=>{
  const p=r.request().postDataJSON();calls.push([action,p]);
  if(action==='status')return reply(r,{status:'session-ready',draftId:draft});
  if(action==='application')return reply(r,saved);
  if(action==='save'){const {customerName,customerPhone,service,plan,quantity,autoPost,existingAccount,brief,channel}=p;saved={status:'pending-review',draftId:draft,receipt:draft,editable:true,application:{customerName,customerPhone,service,plan,quantity,autoPost,existingAccount,brief,channel}};return reply(r,saved);}
  if(action==='bank-transfer')return reply(r,{...saved,environment:'live',paymentMethod:'bank_transfer',state:'pending_payment',orderId:'owned-bank',editable:false,totalAmount:1151700,currency:'KRW',bankTransfer:{bankName:'토스뱅크',accountNumber:'1001-9981-6571',accountHolder:'최준영'}});
  if(action==='orders')return reply(r,{draftId:draft,orders:[{...saved,environment:'live',paymentMethod:'bank_transfer',state:'pending_payment',orderId:'owned-bank',editable:false,totalAmount:1151700,currency:'KRW',bankTransfer:{bankName:'토스뱅크',accountNumber:'1001-9981-6571',accountHolder:'최준영'}}]});
 },{viewport:{width:1440,height:1000}});
 assert.deepEqual(await page.locator('[name=quantity] option').allTextContents(),Array.from({length:30},(_,i)=>String(i+1)));
 assert.equal(await page.locator('[name=quantity]').inputValue(),'1');
 assert.match(await page.locator('[name=plan]').locator('..').textContent(),/서비스 종류/);
 assert.deepEqual(await page.locator('[name=plan] option:not(:disabled)').allTextContents(),['텍스트형','이미지형','영상형']);
 assert.equal(await page.locator('[name=plan] option:disabled').count(),2);
 for(const [plan,unit] of [['Standard',4900],['Deluxe',9900],['Premium',34900]])for(const q of [1,2,30]){
  await page.locator('[name=plan]').selectOption(plan);await page.locator('[name=quantity]').selectOption(String(q));
  assert.equal(await page.locator('#order-price').textContent(),(unit*q).toLocaleString('ko-KR')+'₩');
  assert.equal(await page.locator('#order-vat').textContent(),(unit*q/10).toLocaleString('ko-KR')+'₩');
  assert.equal(await page.locator('#order-total').textContent(),'총 가격: '+(unit*q*11/10).toLocaleString('ko-KR')+'₩');
 }
 assert.equal(await page.locator('[data-quantity-note]').textContent(),'*2개 이상의 수량을 선택할 시 콘텐츠는 매일 하나씩 전달됩니다');
 assert.match(await page.locator('.application-notices').textContent(),/선택한 수량/);
 assert.doesNotMatch(await page.locator('.application-notices').textContent(),/콘텐츠 1건을 제공합니다/);
 await page.locator('[name=autoPost]').selectOption('yes');
 const account=await page.locator('[data-account]').textContent();assert.match(account,/기존 계정 사용 여부 \(기존 계정을 사용 할 시, 별도의 추가 작업이 필요할 수 있습니다\)/);assert.equal(await page.locator('[data-account] .customer-note').count(),0);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  const a=await page.locator('[name=plan]').boundingBox(),b=await page.locator('[name=quantity]').boundingBox();
  if(width===1440){assert.equal(Math.round(a.y),Math.round(b.y));assert.ok(b.x>a.x);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(width!==320)await page.locator('.application-fields').screenshot({path:`/Users/choi/cache/cjy-quantity-selection/form-${width}.png`,style:'.payment-dock,.landing-header {visibility:hidden !important;}'});
 }
 await fill();await page.locator('[name=draftPrivacyConsent]').check();await page.locator('[data-save-application]').click();await page.getByText('접수를 저장했습니다. 결제는 시작되지 않았습니다.',{exact:true}).waitFor();
 assert.equal(calls.find(([a])=>a==='save')[1].quantity,30);
 await page.reload();await page.waitForFunction(()=>document.querySelector('[name=brief]').value==='Synthetic request');
 assert.equal(await page.locator('[name=quantity]').inputValue(),'30');assert.equal(await page.locator('[name=plan]').inputValue(),'Premium');
 for(const n of ['termsConsent','privacyConsent'])await page.locator(`[name=${n}]`).check();await page.locator('[type=submit]').click();await page.waitForURL('https://cjy.app/order');
 assert.equal(calls.find(([a])=>a==='bank-transfer')[1].quantity,30);await page.getByText('1,151,700₩',{exact:true}).waitFor();
 assert.match(await page.locator('[data-order-selection]').textContent(),/영상형.*30건/);
});

test('historic monthly order has no invented quantity and retains stored total',async t=>{
 const order={bankTransfer:{bankName:'TEST',accountNumber:'TEST',accountHolder:'TEST'},draftId:draft,receipt:draft,orderId:'old-order',editable:false,state:'paid',environment:'live',paymentMethod:'bank_transfer',currency:'KRW',totalAmount:768900,application:{customerName:'TEST',customerPhone:'01000000000',service:'reels',plan:'Deluxe',autoPost:'no',existingAccount:'no',brief:'Synthetic old order',channel:'manual'}};
 const {page}=await bankPage(t,async(a,r)=>{if(['status','application'].includes(a))return reply(r,order);},{query:'?draftId='+draft});
 await page.waitForFunction(()=>document.querySelector('[name=plan]').disabled);
 assert.equal(await page.locator('[name=quantity]').isVisible(),false);
 assert.equal(await page.locator('#order-total').textContent(),'총 가격: 768,900₩');
 assert.doesNotMatch(await page.locator('#order-service').textContent(),/1건/);
});
