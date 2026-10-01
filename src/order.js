import {applyApi,loadSdk} from './apply-checkout.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header = () => `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31"></a><a href="/#product" data-link>Product</a><a href="/apply" data-link>서비스 결제</a><a href="/order" data-link aria-current="page">Order</a></nav></header>`;
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR') : '—';
const labels={paid:'결제 완료',pilot_pending:'결제 완료',pending_payment:'결제 확인 중',manual_hold:'결제 확인 보류',saved:'접수 저장 · 결제 시작 전',cancelled:'취소',refunded:'환불 완료',partially_refunded:'부분 환불',disputed:'분쟁 확인 중'};
export const productionLabel=state=>({queued:'첫 Pilot 제작 대기',producing:'첫 Pilot 제작 중',delivered:'첫 Pilot 운영자 전달 완료',hold:'첫 Pilot 확인 필요',awaiting_payment:'결제 확인 후 첫 Pilot 대기'})[state]??'제작 가능 여부 확인';
export function monthlyProgress(m){
 if(!m||!Number.isSafeInteger(m.provided)||!Number.isSafeInteger(m.promised)||m.provided<0||m.promised<1||m.provided>m.promised)return '';
 const label={confirmed:'운영자 확정 · 지정 기간',hold:'운영자 확인 중',ended:'기간 종료'}[m.state]??'상태 확인 중';
 return `<div><dt>월간 서비스</dt><dd>${esc(label)} · 제공 완료 ${m.provided} / ${m.promised}<br>${esc(m.startDate)} ~ ${esc(m.endDateExclusive)} (KST · 종료일 미포함)</dd></div>`;
}
function renewalForm(o){
 if(!/^[a-f0-9-]{36}$/.test(o.periodId??'')||!Number.isSafeInteger(o.renewalAmount)||o.renewalAmount<=0||o.monthly?.state==='hold')return '';
 return `<details data-renew-details><summary>다음 달 결제 준비</summary><form data-monthly-renew data-period="${esc(o.periodId)}" data-amount="${o.renewalAmount}"><p>다음 기간 월 이용료 ${esc(o.renewalAmount.toLocaleString('ko-KR'))}원 (부가세 포함) · 설정비 0원. 최초 주문은 변경되지 않습니다.</p><p>연결된 고객 Telegram 봇에 <code>/renew ${esc(o.periodId)}</code> 를 직접 보내 다음 기간 결제 의사를 확인하고, 받은 10분·1회용 결제 전용 코드를 입력하세요. /order 읽기 전용 코드는 사용할 수 없습니다.</p><label class="customer-field">결제 전용 코드 <input name="code" type="password" autocomplete="off" minlength="43" maxlength="43" pattern="[A-Za-z0-9_-]{43}" required></label><label class="customer-field">결제 이메일 <input name="email" type="email" autocomplete="email" required></label><label><input name="consent" type="checkbox" required> <a href="/terms" data-link>이용약관</a>·<a href="/privacy" data-link>개인정보 처리방침</a>·<a href="/refund" data-link>환불 안내</a>와 위 금액의 다음 달 TEST 결제에 동의합니다. 결제 후 최준영이 직접 상담하고 별도로 서명 확정해야 다음 기간이 시작됩니다. 자동 갱신·자동 활성화가 아닙니다.</label><button class="order-button" type="submit">다음 달 TEST 결제</button><p data-renew-message role="status"></p></form></details>`;
}
export function monthlyReadOnlyOrders(result){
 if(result?.status!=='read-only'||!Array.isArray(result.orders))throw Error('invalid_monthly_orders');
 return result.orders.map(o=>`<article class="owned-order"><h2>월간 서비스 · 읽기 전용</h2><p>${esc(o.plan)} · ${esc(o.orderId)}</p><dl>${monthlyProgress(o.monthly)}</dl>${renewalForm(o)}</article>`).join('');
}
const monthlyRecovery=()=>`<section aria-label="월간 주문 재조회"><h2>연결된 Telegram으로 월간 현황 재조회</h2><p>이미 고객 연결을 완료했다면 고객 봇에 /order 를 보내세요. 받은 10분·1회용 코드를 아래에 입력하면 1시간 동안 현황만 조회합니다. 결제·변경 권한은 복구되지 않습니다.</p><form data-monthly-recover><label class="customer-field">읽기 전용 코드 <input name="code" type="password" autocomplete="off" minlength="43" maxlength="43" pattern="[A-Za-z0-9_-]{43}" required></label><button type="submit" class="order-button">월간 현황 조회</button></form><div data-monthly-list aria-live="polite"></div></section>`;
export function renderOrderLookup() {
 return `<div class="landing application order-page">${header()}<main class="order-status"><div class="order-heading"><h1>주문 현황</h1><p>테스트 결제 · 실제 청구 없음</p><p>이 브라우저에서 접수한 주문과 서버에서 확인한 결제 내역입니다.</p></div><div data-order-list aria-live="polite">주문을 불러오는 중…</div><p data-order-message role="status"></p><div class="order-actions"><button type="button" class="order-button" data-order-refresh>상태 새로고침</button><button type="button" class="order-button" data-order-new disabled>새 주문</button><a href="mailto:cjy.support@gmail.com">문의하기</a></div><p class="order-hint">다른 브라우저나 보안 세션이 만료된 경우 기존 주문이 표시되지 않습니다. 결제 기록은 삭제되지 않으며, 재결제하지 말고 문의해주세요.</p>${monthlyRecovery()}</main></div>`;
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
  list.innerHTML=result.orders.length?result.orders.map(o=>`<article class="owned-order"><h2>${esc(labels[o.state]??'상태 확인 필요')}</h2><p>${o.renewal?'다음 달 결제 주문입니다. 결제 확인 후 최준영이 직접 상담하고 별도로 서명 확정해야 다음 기간이 시작됩니다. 첫 Pilot 재제작이나 자동 활성화는 없습니다.':['paid','pilot_pending'].includes(o.state)?'첫 Pilot 진행 상황은 아래 제작 상태에서 확인해주세요. 운영자 전달 후 가이드라인 상담을 진행하며, 월간 제작·자동 게시 개시와는 별개입니다.':o.state==='saved'?'입력 정보가 저장되었지만 결제는 시작되지 않았습니다. 새 주문에서 정보를 다시 작성할 수 있습니다.':'결과가 확정되지 않았거나 확인이 필요합니다. 같은 주문을 다시 결제하지 마세요.'}</p><dl><div><dt>제작 상태</dt><dd>${esc(o.renewal?'다음 기간 별도 상담·서명 확정 대기':productionLabel(o.production))}</dd></div>${monthlyProgress(o.monthly)}<div><dt>${o.orderId?'주문 번호':'접수 번호'}</dt><dd>${esc(o.orderId??o.receipt)}</dd></div><div><dt>서비스 · 요금제</dt><dd>매일 릴스 솔루션 · ${esc(o.plan)}</dd></div><div><dt>금액</dt><dd>${Number.isSafeInteger(o.totalAmount)?esc(o.totalAmount.toLocaleString('ko-KR')+' '+o.currency):'결제 주문 생성 전'}</dd></div><div><dt>접수 / 주문 시각</dt><dd>${esc(date(o.createdAt))}</dd></div><div><dt>결제 확인 시각</dt><dd>${esc(date(o.paidAt))}</dd></div><div><dt>갱신 시각</dt><dd>${esc(date(o.updatedAt))}</dd></div></dl>${o.state==='pending_payment'?`<button type="button" class="order-button" data-verify-draft="${esc(o.draftId)}">결제 상태 확인</button>`:''}</article>`).join(''):'<p>이 브라우저에서 확인할 수 있는 주문이 없습니다.</p>';
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
 const recovery=root.querySelector('[data-monthly-recover]'),monthlyList=root.querySelector('[data-monthly-list]');
 async function readMonthly(){const r=await applyApi('monthly-orders');if(!disposed&&monthlyList)monthlyList.innerHTML=monthlyReadOnlyOrders(r);}
 recovery?.addEventListener('submit',async e=>{e.preventDefault();if(busy||disposed)return;const field=recovery.elements.namedItem('code'),code=field.value.trim();field.value='';if(!/^[A-Za-z0-9_-]{43}$/.test(code))return;busy=true;const button=recovery.querySelector('button');button.disabled=true;try{await applyApi('monthly-recover',{code});await readMonthly();}catch{if(!disposed)monthlyList.textContent='코드가 만료되었거나 연결 확인이 필요합니다. 고객 봇에서 /order 로 새 코드를 받아주세요.';}finally{busy=false;if(!disposed)button.disabled=false;}});
 monthlyList?.addEventListener('submit',async e=>{
  const form=e.target.closest('[data-monthly-renew]');if(!form)return;e.preventDefault();if(busy||disposed||form.dataset.sent)return;
  const field=form.elements.namedItem('code'),code=field.value.trim(),email=form.elements.namedItem('email').value.trim(),notice=form.querySelector('[data-renew-message]'),button=form.querySelector('button');
  if(!form.reportValidity()||!form.elements.namedItem('consent').checked)return;
  busy=true;button.disabled=true;let attempted=false;
  try{
   const portone=await loadSdk();if(disposed)return;
   attempted=true;form.dataset.sent='true';field.value='';
   const r=await applyApi('monthly-renew',{periodId:form.dataset.period,code,granted:true,consentVersion:'cjy-direct-test-2026-09-27'});
   if(r.environment!=='test'||r.currency!=='KRW'||r.totalAmount!==Number(form.dataset.amount)||r.activationAuthorized!==false||!r.draftId)throw Error('invalid_renewal');
   if(r.state==='pending_payment'&&r.checkoutCreated===true)await portone.requestPayment({storeId:r.storeId,channelKey:r.channelKey,paymentId:r.paymentId,orderName:r.orderName,totalAmount:r.totalAmount,currency:'CURRENCY_KRW',payMethod:r.payMethod,customer:{...r.customer,email},redirectUrl:location.origin+'/order'});
   await applyApi('verify',{draftId:r.draftId});show(await applyApi('orders'));notice.textContent='서버 상태를 확인했습니다. 결제 후 최준영의 상담·별도 확정을 기다려주세요.';
  }catch{notice.textContent=attempted?'결과 미확인 · 재결제하지 마세요. 이 브라우저에서 상태 새로고침으로 확인해주세요. 코드·세션 문제는 Telegram 연결을 확인하거나 문의해주세요.':'결제창을 불러오지 못했습니다. 아직 주문을 만들지 않았습니다. 다시 시도해주세요.';}
  finally{busy=false;if(!disposed)button.disabled=attempted;}
 });
 readMonthly().catch(()=>{});
 load(true);return ()=>{disposed=true;};
}
