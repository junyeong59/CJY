// Opt-in offline contract: DTOs must be produced by real local SQL + Edge handler.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {directPage} from './fixtures/direct-browser.mjs';
test('real local SQL -> owned Edge DTO -> existing browser stage UI',{skip:!process.env.CJY_ORDER_CONTRACT_DTOS},async t=>{
 const rows=JSON.parse(await readFile(process.env.CJY_ORDER_CONTRACT_DTOS,'utf8'));let row=rows[0];
 const {page}=await directPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:row.response});return true;}});
 for(row of rows){
  await page.goto('https://cjy.app/order');await page.waitForSelector('.owned-order');
  assert.equal(await page.locator('.order-number').textContent(),'주문 번호: '+row.response.orders[0].orderId);
  assert.equal(await page.locator('.order-steps .is-complete,.order-steps .is-current').count(),row.expectedStage);
  assert.equal(await page.locator('.order-steps .is-pending').count(),3-row.expectedStage);
 }
});
