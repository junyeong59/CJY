import test from 'node:test';import assert from 'node:assert/strict';import {bankPage} from './fixtures/bank-browser.mjs';import {mkdir} from 'node:fs/promises';
const draft='a0000000-0000-4000-8000-000000000081';
test('cinematic keeps reel button columns at desktop, tablet and mobile widths',async t=>{
 const {page}=await bankPage(t,async(a,r)=>{if(a==='status'){await r.fulfill({json:{draftId:draft}});return true;}});
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,390,800,1440]){
  await page.setViewportSize({width,height:1000});await page.locator('[name=plan]').selectOption('Standard');
  const boxes=async()=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return page.locator('.checkout').evaluate(n=>['[data-save-application]','[type=submit]'].map(s=>{const r=n.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));};
  const reel=await boxes();await page.locator('[name=plan]').selectOption('Cinematic');const cinematic=await boxes();
  for(let i=0;i<2;i++)for(const key of ['x','y','width','height'])assert.ok(Math.abs(reel[i][key]-cinematic[i][key])<=1,`${width}: button ${i} ${key}: ${reel[i][key]} vs ${cinematic[i][key]}`);
  assert.equal(await page.locator('.order-summary').isVisible(),false);
 }
});
test('pricing proportions, tax placement and request illustration stay within their cards',async t=>{
 const {page}=await bankPage(t);await page.locator('.landing-brand').click();await page.waitForURL('https://cjy.app/');await page.emulateMedia({reducedMotion:'reduce'});await page.addStyleTag({content:'.scroll-reveal{opacity:1!important;transform:none!important;transition:none!important}'});
 await mkdir('output/cinematic-ui',{recursive:true});
 for(const width of [320,390,800,1440]){
  await page.setViewportSize({width,height:1000});
  const cards=page.locator('.price-card:not(.cinematic-card)');
  assert.equal(await cards.evaluateAll(nodes=>nodes.every(n=>n.scrollHeight<=n.clientHeight&&n.scrollWidth<=n.clientWidth)),true,`card overflow ${width}`);
  for(const card of await cards.all()){
   const metrics=await card.evaluate(n=>{
    const rect=s=>n.querySelector(s).getBoundingClientRect();
    const tax=rect('.price-tax-note'),button=rect('.price-label'),desc=rect('.price-description'),price=rect('.price-amount');
    return {gap:tax.top-button.bottom,priceGap:price.top-desc.bottom,alignment:getComputedStyle(n.querySelector('.price-tax-note')).textAlign};
   });
   assert.ok(metrics.gap>=0&&metrics.gap<=10,`${width}: tax/button gap ${metrics.gap}`);
   assert.equal(metrics.alignment,'center');assert.ok(metrics.priceGap>=27);

  }
  const panel=page.locator('.feature-art--custom');
  assert.equal(await panel.locator('[data-node-id="214:269"]').count(),0);
  for(const sentence of ['당신이 상상하는 컨텐츠를 현실로','AI 영상을 이용해서 병원 마케팅 영상을 만들어줘','흥미로운 건축 이야기를 담은 바이럴 릴스 만들어줘']){
   await panel.locator('.typing-request').evaluate((n,s)=>n.textContent=s,sentence);
   assert.equal(await panel.locator('.typing-request').evaluate(n=>getComputedStyle(n).whiteSpace),'nowrap');
   const outer=await panel.boundingBox(),bubble=await panel.locator('.request-capsule').boundingBox();assert.ok(bubble.x>=outer.x&&bubble.x+bubble.width>outer.x+outer.width);
   assert.equal(await panel.locator('.figma-scene').evaluate(n=>getComputedStyle(n).overflow),'hidden');
  }
  if(width===390||width===1440){
   await panel.screenshot({path:`output/cinematic-ui/feature-custom-fixed-${width}.png`,animations:'disabled'});
   await page.locator('#pricing').screenshot({path:`output/cinematic-ui/pricing-fixed-${width}.png`,animations:'disabled',style:'.landing-header{visibility:hidden!important}.scroll-reveal{opacity:1!important;transform:none!important}'});
  }
 }
});
