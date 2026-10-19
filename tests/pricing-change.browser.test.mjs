import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
test('public bank application prices per-item supply and separate VAT with no installation row',async t=>{
 const {page}=await bankPage(t);
 for(const [plan,supply,vat,total] of [['Standard',4900,490,5390],['Deluxe',9900,990,10890],['Premium',34900,3490,38390]]){
  await page.locator('[name=plan]').selectOption(plan);
  assert.equal(await page.locator('#order-price').textContent(),supply.toLocaleString('ko-KR')+'₩');
  assert.equal(await page.locator('#order-vat').textContent(),vat.toLocaleString('ko-KR')+'₩');
  assert.equal(await page.locator('#order-total').textContent(),'총 가격: '+total.toLocaleString('ko-KR')+'₩');
 }
 assert.doesNotMatch(await page.locator('.payment-dock').textContent(),/설치 비용|설치비|월 서비스비/);
 assert.deepEqual(await page.locator('[name=plan] option:not(:disabled)').allTextContents(),['텍스트형','이미지형','영상형']);
 assert.match(await page.locator('#order-service').textContent(),/영상형.*× 1/);
 assert.doesNotMatch(await page.locator('.application-notices').textContent(),/한달간|한 달간/);
 assert.equal(await page.locator('[name=plan] option:disabled').count(),2);
 await page.locator('.landing-brand').click();await page.waitForURL('https://cjy.app/');
 const cards=page.locator('.price-card:not(.price-card--special)');
 assert.deepEqual(await cards.locator('h4').allTextContents(),['텍스트형','이미지형','영상형']);
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  assert.equal(await cards.evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)),true);
 }
 // Screenshot-only: omit the fixed header overlay; product CSS is untouched.
 await page.mouse.move(0,0);
 await page.locator('#pricing').screenshot({path:'/tmp/cjy-pricing-pricing-desktop.png',style:'.landing-header { visibility: hidden !important; }'});
 await page.setViewportSize({width:390,height:844});
 await page.locator('#pricing').screenshot({path:'/tmp/cjy-pricing-pricing-mobile.png',style:'.landing-header { visibility: hidden !important; }'});
 const special=page.locator('.price-card--special');assert.equal(await special.count(),2);
 assert.match(await special.nth(0).textContent(),/일회성 구매[^]*999,000₩/);
 assert.match(await special.nth(1).textContent(),/가격 협의/);
 assert.equal(await special.locator('a').count(),0);
 for(const button of await special.locator('button').all()){
  const dialog=page.waitForEvent('dialog').then(async d=>{assert.match(d.message(),/준비중/);await d.dismiss();});await button.click();await dialog;assert.equal(new URL(page.url()).pathname,'/');
 }
});
