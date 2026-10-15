import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
test('public bank application prices monthly supply and separate VAT with no installation row',async t=>{
 const {page}=await bankPage(t);
 for(const [plan,supply,vat,total] of [['Standard',99000,9900,108900],['Deluxe',199000,19900,218900],['Premium',499000,49900,548900]]){
  await page.locator('[name=plan]').selectOption(plan);
  assert.equal(await page.locator('#order-price').textContent(),supply.toLocaleString('ko-KR')+'₩');
  assert.equal(await page.locator('#order-vat').textContent(),vat.toLocaleString('ko-KR')+'₩');
  assert.equal(await page.locator('#order-total').textContent(),'총 가격: '+total.toLocaleString('ko-KR')+'₩');
 }
 assert.doesNotMatch(await page.locator('.payment-dock').textContent(),/설치 비용|설치비/);
 assert.equal(await page.locator('[name=service] option:disabled').count(),2);
 await page.locator('.landing-brand').click();await page.waitForURL('https://cjy.app/');
 const special=page.locator('.price-card--special');assert.equal(await special.count(),2);
 assert.match(await special.nth(0).textContent(),/일회성 구매[^]*999,000₩/);
 assert.match(await special.nth(1).textContent(),/가격 협의/);
 assert.equal(await special.locator('a').count(),0);
 for(const button of await special.locator('button').all()){
  const dialog=page.waitForEvent('dialog').then(async d=>{assert.match(d.message(),/준비중/);await d.dismiss();});await button.click();await dialog;assert.equal(new URL(page.url()).pathname,'/');
 }
});
