import {applyApi} from './apply-checkout.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header = () => `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31"></a><a href="/#product" data-link>Product</a><a href="/apply" data-link>서비스 결제</a><a href="/order" data-link aria-current="page">Order</a></nav></header>`;
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR') : '—';
const labels={paid:'결제 완료',pilot_pending:'결제 완료',pending_payment:'결제 확인 중',manual_hold:'결제 확인 보류',saved:'접수 저장 · 결제 시작 전',archived:'이전 접수 · 보관',cancelled:'취소',refunded:'환불 완료',partially_refunded:'부분 환불',disputed:'분쟁 확인 중'};
export const productionLabel=()=> '운영자 확인 대기';
export function monthlyProgress(m){
 if(!m||!Number.isSafeInteger(m.provided)||!Number.isSafeInteger(m.promised)||m.provided<0||m.promised<1||m.provided>m.promised)return '';
 const label={confirmed:'운영자 확정 · 지정 기간',hold:'운영자 확인 중',ended:'기간 종료'}[m.state]??'상태 확인 중';
 return `<div><dt>월간 서비스</dt><dd>${esc(label)} · 제공 완료 ${m.provided} / ${m.promised}<br>${esc(m.startDate)} ~ ${esc(m.endDateExclusive)} (KST · 종료일 미포함)</dd></div>`;
}
// Only fields exposed by the authenticated owned-order response are evidence.
// That response does not expose a CUSTOMER invitation or consultation status.
function orderJourney(o){
 const paid=['paid','pilot_pending','service_scheduled','service_active','completed'].includes(o.state);
 const consultation=!paid?'결제 확인 후 · 확인 필요':productionLabel(o.production);
 const m=o.monthly,validMonthly=paid&&m&&['confirmed','hold','ended'].includes(m.state)&&Number.isSafeInteger(m.provided)&&Number.isSafeInteger(m.promised)&&m.provided>=0&&m.promised>=1&&m.provided<=m.promised;
 const monthly=validMonthly?`${{confirmed:'기간 확정 · 시작·진행 확인 대기',hold:'운영자 확인 중',ended:'기간 종료'}[m.state]} · 제공 완료 ${m.provided} / ${m.promised}`:'시작 확인 대기';
 const current=!paid?'payment':validMonthly?'monthly':'consultation';
 const payment=paid?'결제 확인 완료':labels[o.state]??'결제 확인 대기';
 const steps=[['payment','payment','결제 확인',payment],['consultation','discussion','상담 · 가이드라인',consultation],['monthly','upload','월간 서비스',monthly]].map(s=>[...s,s[0]===current?'is-current':paid&&s[0]==='payment'?'is-complete':'is-pending']);
 return `<section data-order-progress aria-label="서버에서 확인한 주문 진행"><details class="order-explanation"><summary>진행 안내</summary><p>모든 요금제는 하루 1편 · 달력 기준 1개월입니다. 운영자가 접수·결제를 검토하고 가이드라인·시작일·납품 방법을 개별 협의합니다. 결제 확인이나 과거 제작 상태는 제작 개시·납품 완료를 의미하지 않습니다.</p></details><ol class="order-steps">${steps.map(([key,icon,title,status,style])=>`<li data-stage="${key}" class="${style}" ${style==='is-current'?'aria-current="step"':''}><img src="/assets/order/${icon}.png" alt="" width="274" height="274"><h3>${title}</h3><span class="order-step-state">${status}</span></li>`).join('')}</ol></section>`;
}
export function renderOrderLookup() {
 return `<div class="landing application order-page">${header()}<main class="order-status"><div class="order-heading"><h1>주문 현황</h1><p>테스트 결제 · 실제 청구 없음</p><p>이 브라우저에서 접수한 주문과 서버에서 확인한 결제 내역입니다.</p></div><div data-order-list aria-live="polite">주문을 불러오는 중…</div><p data-order-message role="status"></p><div data-empty-actions hidden><button type="button" class="order-button" data-order-new disabled>새 접수</button><a href="mailto:cjy.support@gmail.com">문의하기</a></div></main></div>`;
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
  const selected=selectCurrent(result);current={...result,orders:selected?[selected]:[]};create.hidden=Boolean(selected);root.querySelector('[data-empty-actions]').hidden=Boolean(selected);if(selected)create.remove();else if(!create.isConnected)root.querySelector('[data-empty-actions]').prepend(create);create.textContent='새 접수';create.disabled=!result.draftId||busy||result.status==='session-expired';
  list.innerHTML=current.orders.length?current.orders.map(o=>`<article class="owned-order">${o.orderId?`<p class="order-number">주문 번호: ${esc(o.orderId)}</p>`:''}<h2>${esc(labels[o.state]??'상태 확인 필요')}</h2>${orderJourney(o)}<div class="order-record-actions">${o.draftId?`<a class="order-button" data-link data-view-draft="${esc(o.draftId)}" href="/apply?draftId=${encodeURIComponent(o.draftId)}">${o.state==='saved'?'저장된 내용 보기':'신청 내용 보기'}</a>`:''}<a class="order-button" href="mailto:cjy.support@gmail.com">문의하기</a></div><details class="order-record"><summary>주문 상세 내역</summary><p class="order-state-note">${o.renewal?'다음 달 결제 주문입니다. 결제 확인 후 최준영이 직접 상담하고 별도로 서명 확정해야 다음 기간이 시작됩니다. 자동 활성화는 없습니다.':['paid','pilot_pending'].includes(o.state)?'운영자가 접수·결제를 검토한 후 직접 안내합니다. 가이드라인·시작일·납품 방법은 개별 협의하며 결제만으로 제작·전달·게시를 시작하지 않습니다.':o.state==='saved'?'입력 정보가 저장되었지만 결제는 시작되지 않았습니다. 저장된 내용 보기에서 접수 상태를 확인해주세요.':'결과가 확정되지 않았거나 확인이 필요합니다. 같은 주문을 다시 결제하지 마세요.'}</p><dl><div><dt>상담 준비</dt><dd>${esc(o.renewal?'다음 기간 운영자 확인 대기':productionLabel(o.production))}</dd></div>${monthlyProgress(o.monthly)}<div><dt>${o.orderId?'주문 번호':'접수 번호'}</dt><dd>${esc(o.orderId??o.receipt)}</dd></div><div><dt>서비스 · 요금제</dt><dd>매일 릴스 솔루션 · ${esc(o.plan)}</dd></div><div><dt>금액</dt><dd>${Number.isSafeInteger(o.totalAmount)?esc(o.totalAmount.toLocaleString('ko-KR')+' '+o.currency):'결제 주문 생성 전'}</dd></div><div><dt>접수 / 주문 시각</dt><dd>${esc(date(o.createdAt))}</dd></div><div><dt>결제 확인 시각</dt><dd>${esc(date(o.paidAt))}</dd></div><div><dt>갱신 시각</dt><dd>${esc(date(o.updatedAt))}</dd></div></dl></details>${o.state==='pending_payment'?`<button type="button" class="order-button" data-verify-draft="${esc(o.draftId)}">결제 상태 확인</button>`:''}</article>`).join(''):'<p>이 브라우저에서 확인할 수 있는 접수 내역이 없습니다. 기존 고객은 문의해주세요.</p>';
 }
 async function load(reconcile=false){
  if(busy||disposed)return;busy=true;create.disabled=true;message.textContent='';
  try{if(disposed)return;show(await applyApi('orders'));
   const pending=current.orders.find(o=>o.state==='pending_payment');
   if(reconcile&&pending){await applyApi('verify',{draftId:pending.draftId});if(!disposed)show(await applyApi('orders'));}
  }catch{if(!disposed){message.textContent='상태 확인이 지연되고 있습니다. 재결제하지 말고 잠시 후 새로고침해주세요.';if(!current.orders.length)list.textContent='주문을 확인하지 못했습니다.';}}
  finally{busy=false;if(!disposed){create.disabled=!current.draftId||current.status==='session-expired';}}
 }
 list.addEventListener('click',async e=>{const button=e.target.closest('[data-verify-draft]');if(!button||busy)return;busy=true;button.disabled=true;try{await applyApi('verify',{draftId:button.dataset.verifyDraft});show(await applyApi('orders'));message.textContent='서버 상태를 확인했습니다.';}catch{message.textContent='확인 중입니다. 재결제하지 말고 잠시 후 다시 확인해주세요.';}finally{busy=false;if(!disposed){if(button.isConnected)button.disabled=false;create.disabled=!current.draftId||current.status==='session-expired';}}});
 create.addEventListener('click',()=>{if(busy||disposed||create.disabled)return;navigate('/apply');});

 load(true);return ()=>{disposed=true;};
}
