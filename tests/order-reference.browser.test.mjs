import test from 'node:test';import assert from 'node:assert/strict';import {directPage,readyOrder} from './fixtures/direct-browser.mjs';import {readFile} from 'node:fs/promises';
for(const width of [1440,390])for(const state of ['empty','saved','paid'])test(`reference minimalist order ${state} ${width}`,async t=>{
 const actions=[];const item={...readyOrder,plan:'Standard',state,production:'queued',draftId:'11111111-1111-4111-8111-111111111111',...(state==='paid'?{periodId:'22222222-2222-4222-8222-222222222222',renewalAmount:163900,monthly:{state:'confirmed',provided:0,promised:28,startDate:'2027-01-31',endDateExclusive:'2027-02-28'}}:{})};
 const {page}=await directPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){await r.fulfill({json:{status:'owned',draftId:item.draftId,orders:state==='empty'?[]:[item]}});return true;}},{viewport:{width,height:900}});
 await page.route('https://cjy.app/assets/order/*.png',async r=>r.fulfill({contentType:'image/png',body:await readFile(new URL('../public'+new URL(r.request().url()).pathname,import.meta.url))}));
 await page.goto('https://cjy.app/order');await page.waitForFunction(()=>!document.querySelector('[data-order-list]').textContent.includes('불러오는 중'));await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-monthly-recover]').count(),0);assert.ok(!actions.some(a=>['monthly-orders','monthly-recover'].includes(a)));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(state==='empty'){assert.equal(await page.locator('[data-order-new]').textContent(),'새 접수');assert.equal(await page.locator('[data-order-new]').isEnabled(),true);assert.equal(await page.locator('.order-actions a[href="mailto:cjy.support@gmail.com"]').count(),1);}
 else{
  assert.equal(await page.locator('.order-steps').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
  assert.equal(await page.locator('.owned-order').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await page.locator('[data-order-progress] li').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  const op=await page.locator('[data-stage=payment] img').evaluate(e=>Number(getComputedStyle(e).opacity));assert.equal(op,state==='paid'?1:0.35);
  if(state==='paid'){const restore=await page.locator('[data-view-draft]').boundingBox(),bot=await page.locator('[data-telegram-connection] a').boundingBox();assert.ok(Math.abs(restore.y-bot.y)<8,'paid reference pairs application and messenger actions');assert.equal(await page.locator('[data-monthly-renew]').count(),1);assert.equal(await page.locator('[data-monthly-renew]').getAttribute('data-period'),item.periodId);}
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:`/Users/choi/.hermes/cache/cjy-final-order-${state}-${width}.png`,fullPage:true,animations:'disabled'});
});
