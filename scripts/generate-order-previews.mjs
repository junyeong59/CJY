import {mkdir,writeFile} from 'node:fs/promises';
import {renderOrderLookup,orderJourney} from '../src/order.js';
import {renderFooter} from '../src/policies.js';
const directory=new URL('../dist/previews/',import.meta.url);
await mkdir(directory,{recursive:true});
for(const [state,label] of [['empty','주문 없음'],['saved','접수 저장'],['paid','결제 완료']]) {
 let markup=renderOrderLookup();
 const record=state==='empty'?`<div class="order-empty-copy"><p>이 브라우저에서 접수한 주문 내역이 없습니다</p><p class="order-empty-hint">기존 주문은 당시 신청한 브라우저로 접속하시거나 문의하기를 이용해주세요.</p></div>`:`<article class="owned-order">${orderJourney({state,orderProgressStage:1})}<div class="order-record-actions ${state==='saved'?'order-record-actions--saved':''}"><button class="order-button" type="button">${state==='saved'?'신청하러 가기':'신청 내용 보기'}</button>${state==='saved'?'':'<button class="order-button" type="button">문의하기</button>'}</div></article>`;
 markup=markup.replace('주문을 불러오는 중…',record).replace('<div data-order-identity></div>',state!=='paid'?'':`<div data-order-identity><p class="order-number">${state==='saved'?'접수':'주문'} 번호: PREVIEW-12345678</p></div>`).replace('<div data-empty-actions hidden>',`<div data-empty-actions${state==='empty'?'':' hidden'}>`).replace('data-order-new disabled','data-order-new');
 if(state==='paid')markup=markup.replace('data-order-description hidden','data-order-description');
 markup=markup.replace('</main></div>',`</main>${renderFooter()}</div>`);
 await writeFile(new URL(state+'.html',directory),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label} 미리보기 | CJY</title><link rel="stylesheet" href="/src/styles.css"><style>.preview-switch{position:fixed;bottom:12px;left:12px;z-index:30;padding:10px 16px;background:#222;border:1px solid #555;border-radius:12px;font:14px sans-serif;color:white}.preview-switch a{color:white;margin-left:12px}.order-record-actions button:first-child{background:transparent;color:white}.order-record-actions--saved button:first-child{background:white;color:black}</style></head><body>${markup}<aside class="preview-switch">샘플 미리보기 · 실제 주문 아님 ${['empty','saved','paid'].map((s,i)=>`<a href="${s}.html">${['주문 없음','접수 저장','결제 완료'][i]}</a>`).join('')}</aside></body></html>`);
}
console.log('Order previews written to dist/previews/');
