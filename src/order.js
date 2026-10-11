import { renderSiteHeader } from './header.js';
import {applyApi} from './apply-checkout.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={paid:'결제 완료',pilot_pending:'결제 완료',pending_payment:'결제 확인 중',manual_hold:'결제 확인 보류',saved:'접수 저장 · 결제 시작 전',archived:'이전 접수 · 보관',cancelled:'취소',refunded:'환불 완료',partially_refunded:'부분 환불',disputed:'분쟁 확인 중'};
export const productionLabel=()=> '운영자 확인 대기';
// Payment authority is separate from operator-managed display progress.
export function orderJourney(o){
 const paid=o.state==='paid'||o.state==='pilot_pending';
 const stage=paid?([1,2,3].includes(o.orderProgressStage)?o.orderProgressStage:1):0;
 const titles=['결제 완료','협의 및 파이프라인 확정','협의 날짜에 따라 작업 시작'];
 const steps=[['payment','payment'],['consultation','discussion'],['monthly','upload']];
 const current=stage?titles[stage-1]:labels[o.state]??'상태 확인 필요';
 return `<section data-order-progress aria-label="서버에서 확인한 주문 진행"><h2 data-current-stage>현재 단계: ${esc(current)}</h2><ol class="order-steps">${steps.map(([key,icon],i)=>{
  const style=stage===i+1?'is-current':stage>i+1?'is-complete':'is-pending';
  return `<li data-stage="${key}" class="${style}" ${style==='is-current'?'aria-current="step"':''}><img src="/assets/order/${icon}.png" alt="" width="274" height="274"><h3>${i===0&&!paid?esc(current):titles[i]}</h3></li>`;
 }).join('')}</ol></section>`;
}
export function renderOrderLookup() {
 return `<div class="landing application order-page">${renderSiteHeader({ active: 'order' })}<main class="order-status"><div class="order-heading"><h1>주문 현황</h1><div data-order-identity></div><p data-order-description hidden>이 브라우저에서 접수한 주문과 서버에서 확인한 결제 내역입니다.</p></div><div data-order-list aria-live="polite">주문을 불러오는 중…</div><p data-order-message role="status"></p><div data-empty-actions hidden><button type="button" class="order-button" data-order-new disabled>새 주문</button><a href="mailto:cjy.support@gmail.com">문의하기</a></div></main></div>`;
}
// Preserve the existing routes without a fabricated lookup or demonstration receipt.
export const renderOrderStatus=renderOrderLookup;
export const renderOrderDetails=renderOrderLookup;
export function bindOrder(root,navigate) {
 const list=root.querySelector('[data-order-list]');if(!list)return;
 const create=root.querySelector('[data-order-new]'),message=root.querySelector('[data-order-message]');
 let busy=false,disposed=false,current={orders:[]};
 const selectCurrent=result=>{const meaningful=result.orders.filter(o=>o.state!=='archived'&&(o.receipt||o.orderId));return meaningful.find(o=>o.draftId===result.draftId)??meaningful.find(o=>o.orderId&&o.state!=='saved')??meaningful[0];};
 // The PG query is advisory only. Official persisted Supabase Auth, not URL
 // parameters or browser payment results, authorizes owner-scoped API reads.
 if(location.search)history.replaceState(null,'',location.pathname);
 function show(result){
  if(disposed)return;
  if(!Array.isArray(result.orders)||result.orders.some(o=>o.environment!=='test'))throw Error('invalid_owned_orders');
  const selected=selectCurrent(result);current={...result,orders:selected?[selected]:[]};create.hidden=Boolean(selected);root.querySelector('[data-empty-actions]').hidden=Boolean(selected);if(selected)create.remove();else if(!create.isConnected)root.querySelector('[data-empty-actions]').prepend(create);create.textContent='새 주문';create.disabled=!result.draftId||busy||result.status==='session-expired';
  root.querySelector('[data-order-description]').hidden=!selected||selected.state==='saved';
  root.querySelector('[data-order-identity]').innerHTML=selected&&selected.state!=='saved'?`<p class="order-number">${selected.orderId?'주문 번호':'접수 번호'}: ${esc(selected.orderId??selected.receipt)}</p>`:'';
  list.innerHTML=current.orders.length?current.orders.map(o=>`<article class="owned-order">${orderJourney(o)}<div class="order-record-actions ${o.state==='saved'?'order-record-actions--saved':''}">${o.draftId?`<a class="order-button" data-link data-view-draft="${esc(o.draftId)}" href="/apply?draftId=${encodeURIComponent(o.draftId)}">${o.state==='saved'?'신청하러 가기':'신청 내용 보기'}</a>`:''}${o.state==='saved'?'':'<a class="order-button" href="mailto:cjy.support@gmail.com">문의하기</a>'}</div>${o.state==='pending_payment'?`<button type="button" class="order-button" data-verify-draft="${esc(o.draftId)}">결제 상태 확인</button>`:''}</article>`).join(''):'<div class="order-empty-copy"><p>이 브라우저에서 접수한 주문 내역이 없습니다</p><p class="order-empty-hint">기존 주문은 당시 신청한 브라우저로 접속하시거나 문의하기를 이용해주세요.</p></div>';
 }
 async function load(reconcile=false){
  if(busy||disposed)return;busy=true;create.disabled=true;message.textContent='';
  try{if(disposed)return;show(await applyApi('orders'));
   const pending=current.orders.find(o=>o.state==='pending_payment');
   if(reconcile&&pending){await applyApi('verify',{draftId:pending.draftId});if(!disposed)show(await applyApi('orders'));}
  }catch{if(!disposed){message.textContent='상태 확인이 지연되고 있습니다. 재결제하지 말고 잠시 후 새로고침해주세요.';if(!current.orders.length)list.textContent='';}}
  finally{busy=false;if(!disposed){create.disabled=!current.draftId||current.status==='session-expired';}}
 }
 list.addEventListener('click',async e=>{const button=e.target.closest('[data-verify-draft]');if(!button||busy)return;busy=true;button.disabled=true;try{await applyApi('verify',{draftId:button.dataset.verifyDraft});show(await applyApi('orders'));message.textContent='서버 상태를 확인했습니다.';}catch{message.textContent='확인 중입니다. 재결제하지 말고 잠시 후 다시 확인해주세요.';}finally{busy=false;if(!disposed){if(button.isConnected)button.disabled=false;create.disabled=!current.draftId||current.status==='session-expired';}}});
 create.addEventListener('click',()=>{if(busy||disposed||create.disabled)return;navigate('/apply');});

 load(true);return ()=>{disposed=true;};
}
