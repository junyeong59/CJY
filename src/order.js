import {applyApi} from './apply-checkout.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header = () => `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31"></a><a href="/#product" data-link>Product</a><a href="/apply" data-link>서비스 결제</a><a href="/order" data-link aria-current="page">Order</a></nav></header>`;
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR') : '—';
const labels={paid:'결제 완료',pilot_pending:'결제 완료',pending_payment:'결제 확인 중',manual_hold:'결제 확인 보류',saved:'접수 저장 · 결제 시작 전',cancelled:'취소',refunded:'환불 완료',partially_refunded:'부분 환불',disputed:'분쟁 확인 중'};
export function renderOrderLookup() {
 return `<div class="landing application order-page">${header()}<main class="order-status"><div class="order-heading"><h1>주문 현황</h1><p>테스트 결제 · 실제 청구 없음</p><p>이 브라우저에서 접수한 주문과 서버에서 확인한 결제 내역입니다.</p></div><div data-order-list aria-live="polite">주문을 불러오는 중…</div><p data-order-message role="status"></p><div class="order-actions"><button type="button" class="order-button" data-order-refresh>상태 새로고침</button><button type="button" class="order-button" data-order-new disabled>새 주문</button><a href="mailto:cjy.support@gmail.com">문의하기</a></div><p class="order-hint">다른 브라우저나 보안 세션이 만료된 경우 기존 주문이 표시되지 않습니다. 결제 기록은 삭제되지 않으며, 재결제하지 말고 문의해주세요.</p></main></div>`;
}
// Preserve the existing routes without a fabricated lookup or demonstration receipt.
export const renderOrderStatus=renderOrderLookup;
export const renderOrderDetails=renderOrderLookup;
export function bindOrder(root,navigate) {
 const list=root.querySelector('[data-order-list]');if(!list)return;
 const refresh=root.querySelector('[data-order-refresh]'),create=root.querySelector('[data-order-new]'),message=root.querySelector('[data-order-message]');
 let busy=false,disposed=false,current={orders:[]};
 // The PG query is advisory only. A same-origin JS fetch, not the cross-site
 // navigation request, retrieves the HttpOnly SameSite=Strict owner cookie.
 if(location.search)history.replaceState(null,'',location.pathname);
 function show(result){
  if(disposed)return;
  if(!Array.isArray(result.orders)||result.orders.some(o=>o.environment!=='test'))throw Error('invalid_owned_orders');
  current=result;create.disabled=!result.draftId||busy||result.status==='session-expired';
  list.innerHTML=result.orders.length?result.orders.map(o=>`<article class="owned-order"><h2>${esc(labels[o.state]??'상태 확인 필요')}</h2><p>${['paid','pilot_pending'].includes(o.state)?'가이드라인 상담 및 제작 가능 여부 확인을 기다려주세요. 결제만으로 제작·게시가 시작되지 않습니다.':o.state==='saved'?'입력 정보가 저장되었지만 결제는 시작되지 않았습니다. 새 주문에서 정보를 다시 작성할 수 있습니다.':'결과가 확정되지 않았거나 확인이 필요합니다. 같은 주문을 다시 결제하지 마세요.'}</p><dl><div><dt>${o.orderId?'주문 번호':'접수 번호'}</dt><dd>${esc(o.orderId??o.receipt)}</dd></div><div><dt>서비스 · 요금제</dt><dd>매일 릴스 솔루션 · ${esc(o.plan)}</dd></div><div><dt>금액</dt><dd>${Number.isSafeInteger(o.totalAmount)?esc(o.totalAmount.toLocaleString('ko-KR')+' '+o.currency):'결제 주문 생성 전'}</dd></div><div><dt>접수 / 주문 시각</dt><dd>${esc(date(o.createdAt))}</dd></div><div><dt>결제 확인 시각</dt><dd>${esc(date(o.paidAt))}</dd></div><div><dt>갱신 시각</dt><dd>${esc(date(o.updatedAt))}</dd></div></dl>${o.state==='pending_payment'?`<button type="button" class="order-button" data-verify-draft="${esc(o.draftId)}">결제 상태 확인</button>`:''}</article>`).join(''):'<p>이 브라우저에서 확인할 수 있는 주문이 없습니다.</p>';
 }
 async function load(reconcile=false){
  if(busy||disposed)return;busy=true;refresh.disabled=true;create.disabled=true;message.textContent='';
  try{await applyApi('session');if(disposed)return;show(await applyApi('orders'));
   const pending=current.orders.find(o=>o.state==='pending_payment');
   if(reconcile&&pending){await applyApi('verify',{draftId:pending.draftId});if(!disposed)show(await applyApi('orders'));}
  }catch{if(!disposed){message.textContent='상태 확인이 지연되고 있습니다. 재결제하지 말고 잠시 후 새로고침해주세요.';if(!current.orders.length)list.textContent='주문을 확인하지 못했습니다.';}}
  finally{busy=false;if(!disposed){refresh.disabled=false;create.disabled=!current.draftId||current.status==='session-expired';}}
 }
 refresh.addEventListener('click',()=>load(true));
 list.addEventListener('click',async e=>{const button=e.target.closest('[data-verify-draft]');if(!button||busy)return;busy=true;button.disabled=true;try{await applyApi('verify',{draftId:button.dataset.verifyDraft});show(await applyApi('orders'));message.textContent='서버 상태를 확인했습니다.';}catch{message.textContent='확인 중입니다. 재결제하지 말고 잠시 후 다시 확인해주세요.';}finally{busy=false;if(!disposed){if(button.isConnected)button.disabled=false;create.disabled=!current.draftId||current.status==='session-expired';}}});
 create.addEventListener('click',async()=>{if(busy)return;busy=true;create.disabled=true;try{await applyApi('new',{draftId:current.draftId});if(!disposed)navigate('/apply');}catch{message.textContent='새 주문 준비를 확인하지 못했습니다. 새로고침 후 확인해주세요.';}finally{busy=false;if(!disposed)create.disabled=false;}});
 load(true);return ()=>{disposed=true;};
}
