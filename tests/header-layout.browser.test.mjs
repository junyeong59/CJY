import test from 'node:test';import assert from 'node:assert/strict';import {bankPage} from './fixtures/bank-browser.mjs';
test('home, apply and order share header geometry and logo at all breakpoints',async t=>{
 const {page}=await bankPage(t,async(a,r)=>{if(a==='orders'){await r.fulfill({json:{orders:[]}});return true;}});
 const measure=()=>page.locator('.landing-nav').evaluate(n=>{const rect=x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100);};return {nav:rect(n),gap:getComputedStyle(n).gap,links:[...n.children].map(rect),logo:n.querySelector('img').getAttribute('src')};});
 for(const width of [320,390,650,800,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto('https://cjy.app/');const home=await measure();
  for(const path of ['/order','/apply']){await page.goto('https://cjy.app'+path);assert.deepEqual(await measure(),home,`${width} ${path}`);}
 }
});
