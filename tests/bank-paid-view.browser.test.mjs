import test from 'node:test';
import assert from 'node:assert/strict';
import {bankPage} from './fixtures/bank-browser.mjs';
const draft='a0000000-0000-4000-8000-000000000001',active='a0000000-0000-4000-8000-000000000002';
const application={customerName:'원본 <img src=x onerror=alert(1)>',customerPhone:'01012345678',service:'reels',plan:'Premium',autoPost:'yes',existingAccount:'yes',brief:'선택한 원본 & <script>window.injected=true</script>',channel:'manual'};
const bank={environment:'live',paymentMethod:'bank_transfer',state:'paid',status:'order-existing',orderId:'owned-bank',totalAmount:273900,currency:'KRW',draftId:draft,receipt:draft,editable:false,application,bankTransfer:{bankName:'토스뱅크',accountNumber:'1001-9981-6571',accountHolder:'최준영'}};
for(const built of [false,true])for(const stage of [2,3,4])test(`${built?'built':'source'} paid stage ${stage} order application-view click stays on original owned readonly application`,async t=>{
 const actions=[],lookups=[];
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='orders'){await r.fulfill({json:{orders:[{...bank,orderProgressStage:stage}],draftId:draft}});return true;}if(a==='status'){await r.fulfill({json:{status:'session-ready',draftId:active}});return true;}if(a==='application'){lookups.push(r.request().postDataJSON());await r.fulfill({json:{...bank,orderProgressStage:stage}});return true;}},{path:'/order',built});
 await page.locator('[data-view-draft]').waitFor();assert.equal(await page.locator('[data-order-new]').count(),0);
 await page.locator('[data-view-draft]').click();await page.waitForURL('**/apply?draftId='+draft);
 await page.waitForFunction(()=>location.pathname==='/order'||document.querySelector('[name=customerName]')?.value.startsWith('원본'));
 assert.equal(new URL(page.url()).pathname,'/apply');assert.equal(new URL(page.url()).searchParams.get('draftId'),draft);
 for(const [name,value] of Object.entries(application)){assert.equal(await page.locator(`[name=${name}]`).first().inputValue(),value);assert.equal(await page.locator(`[name=${name}]`).first().isDisabled(),true);}
 assert.equal(await page.locator('[data-save-application]').isDisabled(),true);assert.equal(await page.locator('[type=submit]').isDisabled(),true);
 assert.equal(await page.locator('[data-existing-order]').count(),0);
 await page.evaluate(()=>{document.querySelector('[data-save-application]').dispatchEvent(new MouseEvent('click',{bubbles:true}));document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 assert.equal(await page.locator('script:not([src]), [onerror]').count(),0);
 assert.deepEqual(actions,['orders','status','application']);assert.deepEqual(lookups,[{draftId:draft}]);
});
for(const built of [false,true])for(const failure of ['foreign','unknown','mismatch','expired'])test(`${built?'built':'source'} explicit paid view ${failure} fails closed`,async t=>{
 const actions=[];
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='status'){await r.fulfill({json:{status:'session-ready',draftId:active}});return true;}if(a==='application'){if(['foreign','unknown'].includes(failure))await r.fulfill({status:failure==='foreign'?403:404,json:{error:failure}});else await r.fulfill({json:{...bank,...(failure==='mismatch'?{draftId:active}:{status:'session-expired'})}});return true;}},{query:'?draftId='+draft,built});
 await page.getByText(/신청 연결을 확인하지 못했습니다/).waitFor();assert.equal(new URL(page.url()).pathname,'/apply');
 assert.equal(await page.locator('[name=brief]').inputValue(),'');assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.locator('[data-save-application]').isDisabled(),true);assert.deepEqual(actions,['status','application']);
});
for(const built of [false,true])for(const stage of [2,3,4])test(`${built?'built':'source'} ordinary paid resume stage ${stage} still redirects`,async t=>{
 const actions=[];const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(['status','application'].includes(a)){await r.fulfill({json:{...bank,orderProgressStage:stage}});return true;}if(a==='orders'){await r.fulfill({json:{orders:[{...bank,orderProgressStage:stage}],draftId:draft}});return true;}},{built});
 await page.waitForURL('**/order');await page.locator('.owned-order').waitFor();assert.deepEqual(actions,['status','application','orders']);
});
for(const built of [false,true])test(`${built?'built':'source'} paid bank submit replay retains redirect even on explicit draft route`,async t=>{
 const actions=[];const {page,fill}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='status'){await r.fulfill({json:{status:'session-ready',draftId:draft}});return true;}if(a==='application'){await r.fulfill({json:{status:'session-ready',draftId:draft}});return true;}if(a==='bank-transfer'){await r.fulfill({json:bank});return true;}if(a==='orders'){await r.fulfill({json:{orders:[bank],draftId:draft}});return true;}},{query:'?draftId='+draft,built});
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);await fill();await page.locator('[type=submit]').click();await page.waitForURL('**/order');await page.locator('.owned-order').waitFor();assert.deepEqual(actions,['status','application','bank-transfer','orders']);assert.equal(await page.evaluate(()=>sessionStorage.getItem('cjy-pending-bank-draft')),null);
});
for(const built of [false,true])for(const state of ['pending_payment','refunded','cancelled','manual_hold','PG-paid'])test(`${built?'built':'source'} explicit ${state} remains readonly without mutations`,async t=>{
 const actions=[];const record={...bank,state:state==='PG-paid'?'paid':state,...(state==='PG-paid'?{environment:'test',paymentMethod:'card'}:{})};
 const {page}=await bankPage(t,async(a,r)=>{actions.push(a);if(a==='status'){await r.fulfill({json:{status:'session-ready',draftId:active}});return true;}if(a==='application'){await r.fulfill({json:record});return true;}},{query:'?draftId='+draft,built});
 await page.waitForFunction(()=>document.querySelector('[name=brief]')?.value.startsWith('선택한 원본'));
 assert.equal(new URL(page.url()).pathname,'/apply');assert.equal(await page.locator('[name=brief]').isDisabled(),true);assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.locator('[data-save-application]').isDisabled(),true);
 assert.equal(await page.locator('[data-existing-order]').count(),0);
 assert.deepEqual(actions,['status','application']);
});
