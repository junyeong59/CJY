import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
const draft='a0000000-0000-4000-8000-000000000081';
const application={customerName:'TEST',customerPhone:'01000000000',service:'cinematic',plan:'Cinematic',autoPost:'no',existingAccount:'no',brief:'Synthetic request',channel:'manual',quantity:1};
const saved={draftId:draft,receipt:draft,application,environment:'test',status:'pending-review',state:'saved',editable:true};
const submitted={...saved,state:'submitted',editable:false};
test('cinematic: save, restore, submit and owned completion never request payment',async t=>{
 let current,request;const actions=[];
 const {page,fill}=await bankPage(t,async(a,r)=>{
  actions.push(a);
  let json;if(a==='status')json=current??{draftId:draft,editable:true};
  if(a==='save'){request=r.request().postDataJSON();json=current=saved;}
  if(a==='application')json=current;
  if(a==='cinematic-submit'){request=r.request().postDataJSON();json=current=submitted;}
  if(a==='orders')json={draftId:draft,orders:current?[current]:[]};
  if(json){await r.fulfill({json});return true;}
 },{query:'?service=cinematic&plan=Cinematic'});
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 assert.equal(await page.locator('.order-summary').isVisible(),false);
 assert.equal(await page.locator('#order-total').isVisible(),false);
 assert.equal(await page.locator('[type=submit]').textContent(),'신청하기');
 await fill();await page.locator('[name=draftPrivacyConsent]').check();await page.locator('[data-save-application]').click();
 await page.waitForURL('**/apply?draftId=*');assert.equal(request.service,'cinematic');assert.equal(request.plan,'Cinematic');assert.equal(request.quantity,1);
 await page.reload();await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);assert.equal(await page.locator('[name=plan]').inputValue(),'Cinematic');
 for(const n of ['termsConsent','privacyConsent'])await page.locator(`[name=${n}]`).check();
 await page.locator('[type=submit]').click();await page.waitForURL('**/order?draftId=*');await page.getByRole('heading',{name:'신청 완료',exact:true}).waitFor();
 assert.equal(request.service,'cinematic');assert.equal(request.consentBundle.version,'cjy-cinematic-2026-10-25');
 const {mkdir}=await import('node:fs/promises');await mkdir('output/cinematic-ui',{recursive:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:`output/cinematic-ui/complete-${width}.png`,animations:'disabled'});}
 assert.equal(await page.locator('[data-bank-guide]').count(),0);assert.equal(await page.locator('[data-order-progress]').count(),0);
 assert.equal(actions.includes('bank-transfer'),false);assert.equal(actions.includes('open'),false);
 await page.reload();await page.getByRole('heading',{name:'신청 완료',exact:true}).waitFor();
 await page.getByRole('link',{name:'신청 내용 보기'}).click();await page.waitForFunction(()=>document.querySelector('[name=brief]')?.disabled);
 assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.locator('.order-summary').isVisible(),false);
});
test('cinematic error retains form; service switch restores the reel quote',async t=>{
 const {page,fill}=await bankPage(t,async(a,r)=>{if(a==='status'){await r.fulfill({json:{draftId:draft}});return true;}if(a==='cinematic-submit'){await r.fulfill({status:503,json:{error:'unavailable'}});return true;}},{query:'?service=cinematic'});
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);await fill();await page.locator('[type=submit]').click();await page.getByRole('status').filter({hasText:'신청 결과를 확인하지 못했습니다'}).waitFor();
 assert.equal(await page.locator('[name=brief]').inputValue(),'Synthetic request');assert.equal(await page.locator('[type=submit]').isDisabled(),false);
 await page.locator('[name=plan]').selectOption('Deluxe');assert.equal(await page.locator('.order-summary').isVisible(),true);assert.equal(await page.locator('#order-total').textContent(),'총 가격: 10,890₩');assert.equal(await page.locator('[type=submit]').textContent(),'결제하기');
});
test('outline UI fits desktop and mobile with visible pricing and cinematic actions',async t=>{
 const {page}=await bankPage(t,async(a,r)=>{if(a==='status'){await r.fulfill({json:{draftId:draft}});return true;}},{query:'?service=cinematic'});
 const {mkdir}=await import('node:fs/promises');await mkdir('output/cinematic-ui',{recursive:true});
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('[name=customerName]').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.screenshot({path:`output/cinematic-ui/apply-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.locator('.landing-brand').click();await page.waitForURL('https://cjy.app/');
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000});await page.locator('#pricing').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('.price-card').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)),true);
  assert.deepEqual(await page.locator('.price-card:not(.price-card--special) h4').allTextContents(),['텍스트 릴스','이미지 릴스','영상 릴스']);
  assert.equal(await page.locator('.feature-art').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.locator('#pricing').screenshot({path:`output/cinematic-ui/pricing-${width}.png`,animations:'disabled',style:'.landing-header { visibility:hidden !important; } .scroll-reveal { opacity:1 !important; transform:none !important; }'});
 }
 await page.getByRole('link',{name:'시네마틱 광고 신청하기'}).click();await page.waitForURL('**/apply?service=cinematic&plan=Cinematic');assert.equal(await page.locator('[name=plan]').inputValue(),'Cinematic');
});

test('unknown cinematic submission survives reload and resolves the original receipt',async t=>{
 let submittedOnServer=false;const actions=[];
 const {page,fill}=await bankPage(t,async(a,r)=>{actions.push(a);let json;
  if(a==='status')json=submittedOnServer?submitted:{draftId:draft};
  if(a==='cinematic-submit'){submittedOnServer=true;await r.abort();return true;}
  if(a==='application')json=submitted;
  if(a==='orders')json={draftId:draft,orders:[submitted]};
  if(json){await r.fulfill({json});return true;}
 },{query:'?service=cinematic'});
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);await fill();await page.locator('[type=submit]').click();
 await page.getByRole('status').filter({hasText:'신청 결과를 확인하지 못했습니다'}).waitFor();
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('cjy-pending-cinematic-draft')),draft);
 await page.reload();await page.waitForURL('**/order?draftId=*');await page.getByRole('heading',{name:'신청 완료',exact:true}).waitFor();
 assert.equal(actions.filter(a=>a==='cinematic-submit').length,1);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('cjy-pending-cinematic-draft')),null);
});
