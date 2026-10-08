import test from 'node:test';
import assert from 'node:assert/strict';
import {directPage, readyOrder} from './fixtures/direct-browser.mjs';

// Browser tests use explicitly synthetic API/PG fixtures, never real transactions.
test('paid legacy order never offers Telegram connection or bot renewal and does not infer fulfillment from production', async t => {
 const actions=[];
 const {page}=await directPage(t,async (action,route)=>{
  actions.push(action);
  if(action==='orders'){await route.fulfill({json:{orders:[{...readyOrder,plan:'Standard',state:'paid',production:'delivered',periodId:'a0000000-0000-4000-8000-000000000002',renewalAmount:163900}]}});return true;}
 });
 await page.goto('https://cjy.app/order');
 await page.waitForFunction(()=>document.querySelector('.owned-order'));
 assert.equal(await page.locator('[data-telegram-connection], [data-monthly-renew], a[href*="t.me/"]').count(),0);
 const text=await page.locator('[data-order-list]').textContent();
 assert.doesNotMatch(text,/Telegram|텔레그램|Pilot|자동 게시 개시/);
 assert.match(text,/운영자.*가이드라인.*시작일.*납품 방법/);
 assert.match(await page.locator('[data-stage=consultation]').textContent(),/운영자 확인 대기/);
 assert.equal(actions.includes('monthly-renew'),false);
});
test('home describes operator review and individually agreed delivery, retaining products', async t => {
 const {page}=await directPage(t);
 await page.goto('https://cjy.app/');
 const text=await page.locator('.landing-main').textContent();
 assert.match(text,/운영자.*직접.*검토/);
 assert.match(text,/납품 방법.*개별 협의/);
 assert.doesNotMatch(text,/자동으로 콘텐츠 업로드|초기 자동화 파이프라인 생성|원하는 메신저.*척척/);
 for(const plan of ['Standard','Deluxe','Premium'])assert.ok((await page.locator('.landing-pricing').textContent()).includes(plan));
});
test('application explains operator-led fulfillment, preserving all plans and contract quantity', async t => {
 const {page}=await directPage(t);
 const text=await page.locator('[data-direct-checkout]').textContent();
 assert.doesNotMatch(text,/Telegram|텔레그램|Pilot|대기열|결제·동의 확인 후.*제작/);
 assert.match(text,/운영자.*가이드라인.*시작일.*납품 방법/);
 assert.match(text,/최대 2회/);
 assert.match(text,/한 달간 달력일마다 매일 영상 1개/);
 assert.deepEqual(await page.locator('[name=plan] option').allTextContents(),['Standard','Deluxe','Premium']);
 assert.equal(await page.locator('[name=autoPost]').inputValue(),'no');
 assert.equal(await page.locator('[name=channel]:checked').inputValue(),'manual');
 assert.match(text,/기존.*약정.*변경되지/);
});
