import {FEATURE_VISUALS} from '../src/feature-visuals.js';
import test from 'node:test';
import {LANDING_VISUALS} from '../src/landing-visuals.js';
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
 return vm.runInNewContext(section+';renderHome()', {PRICING,LANDING_VISUALS,FEATURE_VISUALS,escapeHtml:x=>String(x),renderSiteHeader:()=>'',renderFooter:()=>''});
}
test('pricing cards show per-item prices and a consultation-only cinematic banner',()=>{
 const html=landing();
 for(const amount of [4900,9900,34900]) assert.ok(html.includes('₩'+amount.toLocaleString('ko-KR')));
 assert.doesNotMatch(html,/초기 설치비|설치 비용 미포함/);
 for(const [id,title] of [['Standard','텍스트 릴스'],['Deluxe','이미지 릴스'],['Premium','영상 릴스']]){
  assert.match(html,new RegExp('<h4>'+title+'</h4>'));assert.ok(html.includes('plan='+id));
 }
 assert.equal((html.match(/\/건/g)||[]).length,3);
 assert.match(html,/시네마틱 광고 상품의 가격은 협의 후에 정해집니다/);
 assert.match(html,/href="\/apply\?service=cinematic&plan=Cinematic"/);
 assert.doesNotMatch(html,/AI 인플루언서|AI 드라마.*스타트팩|data-product-coming-soon/);
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
