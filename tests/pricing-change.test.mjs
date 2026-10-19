import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {renderApplication} from '../src/application.js';
import {renderDirectApplication} from '../src/direct-application.js';
import {renderDirectApplication as renderLegacyDirectApplication} from '../src/legacy-direct-application.js';
import {PRICING} from '../src/commercial.js';
import {renderBankDetails} from '../src/bank-transfer.js';

function landing() {
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const section=source.slice(source.indexOf('function renderHome('),source.indexOf('function renderMusicNow('));
 return vm.runInNewContext(section+';renderHome()', {PRICING,escapeHtml:x=>String(x),renderSiteHeader:()=>'',renderFooter:()=>''});
}
test('pricing cards use shared per-item prices and specials stay one-off coming soon',()=>{
 const html=landing();
 for(const amount of [4900,9900,34900]) assert.match(html,new RegExp(amount.toLocaleString('ko-KR')+'₩'));
 assert.doesNotMatch(html,/초기 설치비|설치 비용 미포함/);
 for(const [id,title] of [['Standard','텍스트형'],['Deluxe','이미지형'],['Premium','영상형']]){
  assert.match(html,new RegExp('<h4>'+title+'</h4>'));
  assert.ok(html.includes('plan='+id));
 }
 assert.equal((html.match(/\/건/g)||[]).length,3);
 assert.doesNotMatch(html,/월 요금/);
 const specials=[...html.matchAll(/<article class="price-card price-card--special">([^]*?)<\/article>/g)].map(m=>m[1]);
 assert.equal(specials.length,2);
 assert.match(specials[0],/999,000₩/);assert.match(specials[0],/일회성/);assert.match(specials[1],/가격 협의/);
 for(const card of specials){assert.match(card,/data-product-coming-soon/);assert.match(card,/준비중/);assert.doesNotMatch(card,/href=/);}
});
test('all application variants remove setup fee row but preserve separate VAT',()=>{
 for(const render of [renderApplication,renderDirectApplication,renderLegacyDirectApplication]){
  const html=render();assert.doesNotMatch(html,/파이프라인 설치 비용|설치비|data-setup/);assert.match(html,/부가세 \(10%\)/);
 }
});
test('existing bank orders display their stored snapshot amount, not current plan price',()=>{
 const old={draftId:'a0000000-0000-4000-8000-000000000001',orderId:'existing-order',state:'pending_payment',environment:'live',paymentMethod:'bank_transfer',currency:'KRW',totalAmount:768900,application:{plan:'Deluxe'},bankTransfer:{bankName:'TEST',accountNumber:'TEST',accountHolder:'TEST'}};
 const before=structuredClone(old);
 for(const compact of [false,true]){const html=renderBankDetails(old,{compact});assert.match(html,/768,900₩/);assert.doesNotMatch(html,/218,900₩/);}
 assert.deepEqual(old,before);
});
