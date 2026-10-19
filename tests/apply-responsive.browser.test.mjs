import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';

test('application controls and price dock fit mobile, tablet and desktop viewports', async t => {
 const {page}=await bankPage(t);
 await page.locator('[name=autoPost]').selectOption('yes');
 await page.locator('[name=plan]').selectOption('Premium');
 await page.locator('[name=quantity]').selectOption('30');
 for(const width of [320,390,430,768,1440]) {
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`page overflow at ${width}`);
  for(const selector of ['[name=plan]','[name=quantity]','.quantity-note','.account-inline-note','.order-summary','#order-total','[data-save-application]','button[type=submit]']) {
   const rect=await page.locator(selector).boundingBox();
   assert.ok(rect.x>=0 && rect.x+rect.width<=width+1,`${selector} overflows at ${width}`);
  }
  const dock=await page.locator('.payment-dock').boundingBox();
  const button=await page.locator('button[type=submit]').boundingBox();
  assert.ok(button.y+button.height<=dock.y+dock.height+1,`checkout clipped at ${width}`);
  const quantity=await page.locator('[name=quantity]').boundingBox();
  const note=await page.locator('.quantity-note').boundingBox();
  assert.ok(note.y>=quantity.y+quantity.height+12,`note overlaps controls at ${width}`);
  await page.locator('[data-account]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/cjy-apply-${width}.png`});
 }
});
