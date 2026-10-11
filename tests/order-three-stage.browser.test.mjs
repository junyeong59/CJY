import test from 'node:test';
import assert from 'node:assert/strict';
import {directPage,readyOrder} from './fixtures/direct-browser.mjs';

export const stageTitles=['결제 완료','협의 및 파이프라인 확정','협의 날짜에 따라 작업 시작'];
async function fixture(t,extra={},width=390){
 const calls=[];
 const item={...readyOrder,state:'paid',draftId:'11111111-1111-4111-8111-111111111111',orderId:'real-owned-order',...extra};
 const {page}=await directPage(t,async(a,r)=>{calls.push(a);if(a==='orders'){await r.fulfill({json:{draftId:item.draftId,orders:[item]}});return true;}if(a==='verify'){await r.fulfill({json:item});return true;}},{viewport:{width,height:900}});
 await page.goto('https://cjy.app/order?orderProgressStage=3&status=paid');
 await page.waitForSelector('.owned-order');
 return {page,calls,item};
}
test('paid default uses reference composition with payment as the current bright stage',async t=>{
 const {page,calls}=await fixture(t,{production:'delivered',monthly:{state:'confirmed',provided:9,promised:28}});
 assert.equal(await page.locator('[data-current-stage]').textContent(),'현재 단계: 결제 완료');
 assert.equal(await page.locator('.order-heading .order-number').textContent(),'주문 번호: real-owned-order');
 assert.deepEqual(await page.locator('.order-steps h3').allTextContents(),stageTitles);
 assert.equal(await page.locator('.order-steps [aria-current=step]').getAttribute('data-stage'),'payment');
 assert.equal(await page.locator('.order-steps .is-pending').count(),2);
 assert.doesNotMatch(await page.locator('main').textContent(),/주문 상세 내역|진행 안내|제공 완료|월간 서비스|9 \/ 28/);
 assert.equal(await page.locator('details').count(),0);
 assert.equal(await page.locator('[data-view-draft]').getAttribute('href'),'/apply?draftId='+fixtureDraft);
 assert.equal(await page.locator('.order-record-actions a[href="mailto:cjy.support@gmail.com"]').count(),1);
 assert.deepEqual(calls.filter(a=>a!=='session'&&a!=='status'),['orders']);
 assert.equal(new URL(page.url()).search,'');
});
const fixtureDraft='11111111-1111-4111-8111-111111111111';
for(const stage of [1,2,3])test(`server stage ${stage} activates all reached steps`,async t=>{
 const {page}=await fixture(t,{orderProgressStage:stage});
 assert.equal(await page.locator('[data-current-stage]').textContent(),'현재 단계: '+stageTitles[stage-1]);
 assert.equal(await page.locator('.order-steps .is-complete').count(),stage-1);
 assert.equal(await page.locator('.order-steps .is-current').count(),1);
 assert.equal(await page.locator('.order-steps .is-pending').count(),3-stage);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.deepEqual(await page.locator('.order-steps img').evaluateAll(es=>es.map(e=>Number(getComputedStyle(e).opacity))),[1,2,3].map(n=>n<=stage?1:0.35));
});
