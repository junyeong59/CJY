import {applyApi,loadSdk} from './apply-checkout.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header = () => `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31"></a><a href="/#product" data-link>Product</a><a href="/apply" data-link>서비스 결제</a><a href="/order" data-link aria-current="page">Order</a></nav></header>`;
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR') : '—';
const labels={paid:'결제 완료',pilot_pending:'결제 완료',pending_payment:'결제 확인 중',manual_hold:'결제 확인 보류',saved:'접수 저장 · 결제 시작 전',archived:'이전 접수 · 보관',cancelled:'취소',refunded:'환불 완료',partially_refunded:'부분 환불',disputed:'분쟁 확인 중'};
export const productionLabel=state=>({queued:'상담 준비 중',producing:'상담 준비 중',delivered:'상담 확인 대기',hold:'상담 준비 확인 필요',awaiting_payment:'결제 확인 후 상담 준비'})[state]??'상담 확인 대기';
export function monthlyProgress(m){
 if(!m||!Number.isSafeInteger(m.provided)||!Number.isSafeInteger(m.promised)||m.provided<0||m.promised<1||m.provided>m.promised)return '';
 const label={confirmed:'운영자 확정 · 지정 기간',hold:'운영자 확인 중',ended:'기간 종료'}[m.state]??'상태 확인 중';
 return `<div><dt>월간 서비스</dt><dd>${esc(label)} · 제공 완료 ${m.provided} / ${m.promised}<br>${esc(m.startDate)} ~ ${esc(m.endDateExclusive)} (KST · 종료일 미포함)</dd></div>`;
}
// Only fields exposed by the authenticated owned-order response are evidence.
// That response does not expose a CUSTOMER invitation or consultation status.
function orderJourney(o){
 const paid=['paid','pilot_pending','service_scheduled','service_active','completed'].includes(o.state);
 const consultation=!paid?'결제 확인 후 · 확인 필요':o.renewal?'상담 확인 대기':productionLabel(o.production);
 const m=o.monthly,validMonthly=paid&&m&&['confirmed','hold','ended'].includes(m.state)&&Number.isSafeInteger(m.provided)&&Number.isSafeInteger(m.promised)&&m.provided>=0&&m.promised>=1&&m.provided<=m.promised;
 const monthly=validMonthly?`${{confirmed:'기간 확정 · 시작·진행 확인 대기',hold:'운영자 확인 중',ended:'기간 종료'}[m.state]} · 제공 완료 ${m.provided} / ${m.promised}`:'시작 확인 대기';
 const current=!paid?'payment':validMonthly?'monthly':'consultation';
 const payment=paid?'결제 확인 완료':labels[o.state]??'결제 확인 대기';
 const steps=[['payment','payment','결제 확인',payment],['consultation','discussion','상담 · 가이드라인',consultation],['monthly','upload','월간 서비스',monthly]].map(s=>[...s,s[0]===current?'is-current':paid&&s[0]==='payment'?'is-complete':'is-pending']);
 return `<section data-order-progress aria-label="서버에서 확인한 주문 진행"><details class="order-explanation"><summary>진행 안내</summary><p>모든 요금제는 하루 1편 · 달력 기준 1개월입니다. 상담·가이드라인 확정 후 월간 시작을 별도로 확인합니다. 상담 준비 상태는 상담 완료나 가이드라인 확정을 의미하지 않습니다.</p></details><ol class="order-steps">${steps.map(([key,icon,title,status,style])=>`<li data-stage="${key}" class="${style}" ${style==='is-current'?'aria-current="step"':''}><img src="/assets/order/${icon}.png" alt="" width="274" height="274"><h3>${title}</h3><span class="order-step-state">${status}</span></li>`).join('')}</ol></section>`;
}
function telegramConnection(o){const paid=['paid','pilot_pending','service_scheduled','service_active','completed'].includes(o.state);return `${paid?`<section class="order-telegram" data-telegram-connection aria-label="Telegram 고객 연결"><h3>Telegram 고객 연결</h3><p class="order-connection-state">연결 코드 준비 중</p><details><summary>연결 안내</summary><p>고객 연결용 1회용 /start 초대 코드는 현재 주문 조회 응답에서 제공되지 않습니다. 준비 상태는 새로고침으로 확인하거나 문의해주세요.</p></details><a class="order-button" href="https://t.me/cjysolutionbot" target="_blank" rel="noopener noreferrer">고객 봇 열기 · 연결 전</a><details><summary>고객 연결 확인</summary><p>봇을 여는 것만으로 고객 연결이 완료되지 않습니다. 연결 코드가 제공되면 고객 봇에서 /start 로 연결하세요. 봇 API 비밀키나 월간 조회용 10분 코드를 입력하는 절차가 아닙니다.</p></details></section>`:''}`;}
function renewalForm(o){
 if(!/^[a-f0-9-]{36}$/.test(o.periodId??'')||!Number.isSafeInteger(o.renewalAmount)||o.renewalAmount<=0||o.monthly?.state==='hold')return '';
 return `<details data-renew-details><summary>다음 달 결제 준비</summary><form data-monthly-renew data-period="${esc(o.periodId)}" data-amount="${o.renewalAmount}"><p>다음 기간 월 이용료 ${esc(o.renewalAmount.toLocaleString('ko-KR'))}원 (부가세 포함) · 설정비 0원. 최초 주문은 변경되지 않습니다.</p><p>연결된 고객 Telegram 봇에 <code>/renew ${esc(o.periodId)}</code> 를 직접 보내 다음 기간 결제 의사를 확인하고, 받은 10분·1회용 결제 전용 코드를 입력하세요. 조회용 코드는 사용할 수 없습니다.</p><label class="customer-field">결제 전용 코드 <input name="code" type="password" autocomplete="off" minlength="43" maxlength="43" pattern="[A-Za-z0-9_-]{43}" required></label><label class="customer-field">결제 이메일 <input name="email" type="email" autocomplete="email" required></label><label><input name="consent" type="checkbox" required> <a href="/terms" data-link>이용약관</a>·<a href="/privacy" data-link>개인정보 처리방침</a>·<a href="/refund" data-link>환불 안내</a>와 위 금액의 다음 달 TEST 결제에 동의합니다. 결제 후 최준영이 직접 상담하고 별도로 서명 확정해야 다음 기간이 시작됩니다. 자동 갱신·자동 활성화가 아닙니다.</label><button class="order-button" type="submit">다음 달 TEST 결제</button><p data-renew-message role="status"></p></form></details>`;
}

export function renderOrderLookup() {
 return `<div class="landing application order-page">${header()}<main class="order-status"><div class="order-heading"><h1>주문 현황</h1><p>테스트 결제 · 실제 청구 없음</p><p>이 브라우저에서 접수한 주문과 서버에서 확인한 결제 내역입니다.</p></div><div data-order-list aria-live="polite">주문을 불러오는 중…</div><p data-order-message role="status"></p><div class="order-actions"><button type="button" class="order-button" data-order-refresh>상태 새로고침</button><button type="button" class="order-button" data-order-new disabled>저장된 내용 보기</button><a href="mailto:cjy.support@gmail.com">문의하기</a></div><p class="order-hint">다른 브라우저나 보안 세션이 만료된 경우 기존 주문이 표시되지 않습니다. 결제 기록은 삭제되지 않으며, 재결제하지 말고 문의해주세요.</p></main></div>`;
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
  current=result;create.textContent=result.orders.length?'저장된 내용 보기':'새 접수';create.disabled=!result.draftId||busy||result.status==='session-expired';
  list.innerHTML=result.orders.length?result.orders.map(o=>`<article class="owned-order">${o.orderId?`<p class="order-number">주문 번호: ${esc(o.orderId)}</p>`:''}<h2>${esc(labels[o.state]??'상태 확인 필요')}</h2>${orderJourney(o)}<div class="order-record-actions">${o.draftId?`<a class="order-button" data-link data-view-draft="${esc(o.draftId)}" href="/apply?draftId=${encodeURIComponent(o.draftId)}">저장된 내용 보기</a>`:''}${telegramConnection(o)}</div><details class="order-record"><summary>주문 상세 내역</summary><p class="order-state-note">${o.renewal?'다음 달 결제 주문입니다. 결제 확인 후 최준영이 직접 상담하고 별도로 서명 확정해야 다음 기간이 시작됩니다. 자동 활성화는 없습니다.':['paid','pilot_pending'].includes(o.state)?'상담 준비 상황은 상담·가이드라인 단계에서 확인해주세요. 상담 확정 및 월간 제작·자동 게시 개시는 별도로 확인합니다.':o.state==='saved'?'입력 정보가 저장되었지만 결제는 시작되지 않았습니다. 저장된 내용 보기에서 접수 상태를 확인해주세요.':'결과가 확정되지 않았거나 확인이 필요합니다. 같은 주문을 다시 결제하지 마세요.'}</p><dl><div><dt>상담 준비</dt><dd>${esc(o.renewal?'다음 기간 별도 상담·서명 확정 대기':productionLabel(o.production))}</dd></div>${monthlyProgress(o.monthly)}<div><dt>${o.orderId?'주문 번호':'접수 번호'}</dt><dd>${esc(o.orderId??o.receipt)}</dd></div><div><dt>서비스 · 요금제</dt><dd>매일 릴스 솔루션 · ${esc(o.plan)}</dd></div><div><dt>금액</dt><dd>${Number.isSafeInteger(o.totalAmount)?esc(o.totalAmount.toLocaleString('ko-KR')+' '+o.currency):'결제 주문 생성 전'}</dd></div><div><dt>접수 / 주문 시각</dt><dd>${esc(date(o.createdAt))}</dd></div><div><dt>결제 확인 시각</dt><dd>${esc(date(o.paidAt))}</dd></div><div><dt>갱신 시각</dt><dd>${esc(date(o.updatedAt))}</dd></div></dl></details>${renewalForm(o)}${o.state==='pending_payment'?`<button type="button" class="order-button" data-verify-draft="${esc(o.draftId)}">결제 상태 확인</button>`:''}</article>`).join(''):'<p>이 브라우저에서 확인할 수 있는 접수 내역이 없습니다. 기존 고객은 문의해주세요.</p>';
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
 create.addEventListener('click',()=>{if(busy||disposed||create.disabled)return;navigate('/apply');});

 list.addEventListener('submit',async e=>{
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

 load(true);return ()=>{disposed=true;};
}
