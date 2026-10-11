import { renderSiteHeader } from './header.js';
import {PRICING,calculateFirstMonthPrice} from './commercial.js';
import {createPolicyConsentEvidence} from './policy-documents.js';
import {applyApi,loadSdk,validateTestCheckout} from './apply-checkout.js';
import {classifyPaymentResult} from './payment-result.js';
export const DIRECT_CONSENT_VERSION='cjy-direct-test-2026-09-27';
const money=n=>n.toLocaleString('ko-KR')+'₩';
export function renderDirectApplication(){return `<div class="landing application apply-page">${renderSiteHeader()}
<main class="application-main"><h1>서비스 신청하기</h1>
<p data-existing-order hidden class="customer-note" role="status"></p><form id="application-form" data-direct-checkout method="dialog"><div class="application-fields">
<section class="customer-section"><h2 class="application-section-title">고객 정보</h2><div class="customer-fields">
<label class="customer-field">성함<input name="customerName" autocomplete="name" required maxlength="100" /></label>
<label class="customer-field">전화번호<input type="tel" name="customerPhone" autocomplete="tel" required maxlength="30" /></label>
<label class="customer-field">이메일<input type="email" name="testEmail" autocomplete="email" required maxlength="254" /></label></div><p class="customer-note">*결제 확인 후 솔루션 전달을 위해 반드시 필요한 정보이니 정확하게 작성해주세요.</p></section>
<h2 class="application-section-title">서비스 신청</h2>
<label class="form-field">서비스 종류<select name="service"><option value="reels">매일 릴스 솔루션</option></select></label>
<label class="form-field">요금제<select name="plan"><option>Standard</option><option>Deluxe</option><option>Premium</option></select></label>

<label class="form-field">자동 게시 여부<select name="autoPost"><option value="no">사용안함</option><option value="yes">사용함</option></select></label>
<div data-account><label class="form-field">기존 계정 사용 여부<select name="existingAccount"><option value="no">사용하지 않음</option><option value="yes">사용함</option></select></label><p class="customer-note">*기존 계정을 사용 할 시, 별도의 추가 작업이 필요할 수 있습니다</p></div>
<div class="brief-field"><div class="brief-heading"><label for="application-brief">컨텐츠 스타일 및 내용</label><button type="button" class="brief-help" aria-expanded="false" aria-controls="brief-guide">꼭 포함되어야하는 내용</button></div><p id="brief-guide" hidden>브랜드 소개, 주제, 원하는 분위기, 참고 링크와 꼭 포함하거나 제외할 내용을 적어주세요.</p><textarea id="application-brief" name="brief" required maxlength="10000" placeholder="꼭 포함되어야하는 내용을 포함해서 자유롭게 작성해주세요.."></textarea></div>
<fieldset class="delivery" hidden><legend>결과 전달 방법</legend><input type="radio" name="channel" value="manual" checked /><label data-legacy-channel hidden><input type="radio" name="channel" value="telegram" disabled /></label><label data-legacy-channel hidden><input type="radio" name="channel" value="discord" disabled /></label><label data-legacy-channel hidden><input type="radio" name="channel" value="gmail" disabled /></label></fieldset>

<fieldset class="consents"><legend>필수 동의 항목</legend>
<label><input type="checkbox" name="draftPrivacyConsent" /><span>접수 저장을 위한 개인정보 수집에 동의합니다</span></label>
<label><input type="checkbox" name="termsConsent" required /><span><a href="/terms" data-link>이용약관</a> 및 <a href="/refund" data-link>환불 정책</a>에 동의합니다</span></label>
<label><input type="checkbox" name="privacyConsent" required /><span>솔루션 전달을 위한 전화번호 및 성함과 같은 개인정보 수집에 동의합니다</span><a class="consent-policy-link" href="/privacy" data-link>개인정보 처리방침</a></label>
</fieldset>
<section class="application-notices" aria-labelledby="application-notices-title"><h2 id="application-notices-title" class="application-section-title">주의 사항</h2><p>결제일 이후 고객 맞춤 파이프라인 확정을 위해 추가적인 협의가 필요하며, 협의는 <strong>메시지로 진행됩니다.</strong></p><p>컨텐츠 업로드는 파이프 확정 이후, <strong>협의된 날짜부터 시작되며 한달간 진행됩니다.</strong> 이후 추가 이용을 위해선 추가금을 납부해야합니다.</p></section>

</div><div class="payment-dock"><div class="order-summary" aria-live="polite"><div><span>파이프라인 설치 비용</span><strong>${money(PRICING.setupSupplyWon)}</strong></div><div><span id="order-service"></span><strong id="order-price"></strong></div><div><span>부가세 (10%)</span><strong id="order-vat"></strong></div><p class="price-note">설치비·서비스비에 부가세 10%를 포함한 첫 달 금액입니다.</p></div><div class="checkout"><strong id="order-total"></strong><button type="button" data-save-application disabled>저장하기</button><button type="submit" disabled>결제하기</button></div><p id="checkout-status" role="status"></p></div></form></main></div>`;}
export function bindDirectApplication(root){
 const form=root.querySelector('[data-direct-checkout]'),field=n=>form.elements.namedItem(n),submit=form.querySelector('[type=submit]'),existing=root.querySelector('[data-existing-order]'),status=form.querySelector('#checkout-status'),save=form.querySelector('[data-save-application]');
 let current={},busy=false,ready=false,unknown=false,disposed=false,recovering=false;
 const names=['customerName','customerPhone','service','plan','autoPost','existingAccount','brief','channel'];
 const recoverable=()=>Boolean((current.orderId&&current.state==='pending_payment')||(recovering&&current.receipt&&!current.orderId));
 const sync=()=>{const locked=Boolean(current.orderId||(current.receipt&&current.editable!==true))&&!recoverable();save.disabled=!ready||busy||unknown||locked;submit.disabled=!ready||busy||unknown||locked;};
 const show=(r,restore=false)=>{if(disposed)return;if(r.environment&&r.environment!=='test')throw Error('environment');current={...r,draftId:r.draftId??current.draftId};
 if(Object.hasOwn(PRICING.plans,r.plan)){field('plan').value=r.plan;update();}
 existing.hidden=true;existing.textContent='';form.hidden=Boolean(r.receipt&&!r.application&&!recoverable());
 if(r.application&&restore){
  if(names.some(n=>typeof r.application[n]!=='string')||Object.keys(r.application).some(n=>!names.includes(n)))throw Error('invalid_application');
  for(const n of names)field(n).value=r.application[n];
  field('testEmail').value='';for(const n of ['termsConsent','privacyConsent','draftPrivacyConsent'])field(n).checked=false;
  for(const el of form.elements)if(el.name)el.disabled=r.editable!==true||(el.name==='channel'&&el.value!=='manual');
  update();
 }
 sync();};
 const ensureEditable=async()=>{
  if(!recoverable())return true;
  let r=current.orderId?current:await applyApi('application',{draftId:current.draftId});
  if(r.orderId&&r.state==='pending_payment')r=await applyApi('retry-edit',{draftId:r.draftId,...(r.windowId?{windowId:r.windowId}:{}),...(r.cancelled?{cancelled:true}:{})});
  if(r.state==='paid'){location.assign('/order');return false;}
  if(r.editable!==true||r.orderId)throw Error('draft_unresolved');
  recovering=false;show(r);history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));return true;
 };
 const fail=()=>{status.textContent=(unknown||current.orderId)?'결과 미확인 · 재결제하지 말고 결제 상태를 확인해주세요.':'결제 준비에 실패했습니다. 결제하기를 눌러 다시 시도해주세요.';};
 const params=new URLSearchParams(location.search);field('plan').value=Object.hasOwn(PRICING.plans,params.get('plan'))?params.get('plan'):'Standard';
 // Cancel is only permission to edit, never evidence of nonpayment. Resolve an
 // immutable child on save/pay; the next checkout retains server verification.
 const cancelledReturn=(r,restore=false)=>{r={...r,draftId:r.draftId??current.draftId};show({...r,editable:true,cancelled:true},restore);unknown=false;status.textContent='결제창을 닫았습니다. 내용을 수정·저장하거나 다시 결제할 수 있습니다.';history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId)+(r.windowId?'&windowId='+encodeURIComponent(r.windowId):'')+'&code=FAILURE_TYPE_STOPPED');};
 const update=()=>{for(const label of form.querySelectorAll('[data-legacy-channel]'))label.hidden=!label.querySelector('input').checked;const plan=field('plan').value,p=calculateFirstMonthPrice(plan);form.querySelector('#order-service').textContent='매일 릴스 솔루션 ('+plan+')';form.querySelector('#order-price').textContent=money(p.monthlySupplyWon);form.querySelector('#order-vat').textContent=money(p.vatWon);form.querySelector('#order-total').textContent='총 가격: '+money(p.totalWon);form.querySelector('[data-account]').hidden=field('autoPost').value==='no';};form.addEventListener('change',update);update();
 form.querySelector('.brief-help').addEventListener('click',e=>{const g=form.querySelector('#brief-guide');g.hidden=!g.hidden;e.currentTarget.setAttribute('aria-expanded',String(!g.hidden));});
 for(const n of ['customerName','customerPhone','brief'])field(n).addEventListener('input',()=>field(n).setCustomValidity(''));
 form.addEventListener('submit',async event=>{event.preventDefault();if(!ready||busy||unknown||(!recoverable()&&(current.orderId||(current.receipt&&current.editable!==true))))return;
 {const phone=field('customerPhone').value.trim();field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone)&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15?'':'전화번호를 확인해주세요.');field('customerName').setCustomValidity(field('customerName').value.trim()&&new TextEncoder().encode(field('customerName').value.trim()).length<=30?'':'성함은 30바이트 이내로 입력해주세요.');field('brief').setCustomValidity(field('brief').value.trim()?'':'내용을 입력해주세요.');}
 if(!form.reportValidity())return;busy=true;sync();status.textContent='결제 준비 중…';
 try{const sameOriginal=current.orderId&&current.state==='pending_payment'&&names.every(n=>field(n).value.trim()===current.application?.[n]);if(!sameOriginal&&!await ensureEditable())return;const portone=await loadSdk();if(disposed)return;
 const unchanged=sameOriginal||(current.retryOriginal&&names.every(n=>field(n).value.trim()===current.retryOriginal.application?.[n]));
 const paymentDraft=sameOriginal?current.draftId:unchanged?current.retryOriginal.draftId:current.draftId;
 if(!unchanged){const payload=Object.fromEntries(names.map(n=>[n,field(n).value.trim()]));if(payload.autoPost==='no')payload.existingAccount='no';payload.draftId=current.draftId;payload.policyEvidence=createPolicyConsentEvidence();payload.consentBundle={version:DIRECT_CONSENT_VERSION,termsRefund:field('termsConsent').checked,privacy:field('privacyConsent').checked,pilotRights:field('termsConsent').checked,pilotProcessing:field('privacyConsent').checked,pilotVersion:'cjy-firstPilot-2026-09-27'};unknown=true;const saved=await applyApi(current.receipt?'revise':'submit',payload);if(saved.status!=='pending-review'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(saved.receipt??''))throw Error('missing_receipt');show({...saved,draftId:saved.draftId??current.draftId});unknown=false;}
 unknown=true;const r=await applyApi(unchanged?'reopen':'open',{draftId:unchanged?paymentDraft:current.draftId,consentVersion:DIRECT_CONSENT_VERSION,granted:field('termsConsent').checked&&field('privacyConsent').checked});
 if(r.status==='window-active'){unknown=false;status.textContent='다른 결제창이 열려 있습니다. 그 창을 닫은 뒤 다시 눌러주세요. 내용은 수정·저장할 수 있습니다.';return;}
 show(r);
 if(r.state==='paid'){location.assign('/order');return;}
 if(r.status!=='checkout-ready'||r.state!=='pending_payment')return;
 validateTestCheckout(r);if(disposed)return;
 const result=await portone.requestPayment({storeId:r.storeId,channelKey:r.channelKey,paymentId:r.paymentId,orderName:r.orderName,totalAmount:r.totalAmount,currency:'CURRENCY_KRW',noticeUrls:['https://tixshhgyvvfzreefbipm.supabase.co/functions/v1/cjy-webhook'],payMethod:r.payMethod,customer:{...r.customer,email:field('testEmail').value.trim()},redirectUrl:location.origin+'/apply?draftId='+encodeURIComponent(current.draftId)+(r.windowId?'&windowId='+encodeURIComponent(r.windowId):'')}).catch(error=>classifyPaymentResult(error).phase==='cancelled'?error:{localUnknown:true});const safe=classifyPaymentResult(result);
 if(safe.phase==='cancelled'){cancelledReturn(r);return;}
 if(safe.phase!=='cancelled'&&!result?.localUnknown){const verified=await applyApi('verify',{draftId:current.draftId});if(verified.state==='paid'){location.assign('/order');return;}}
 const child=await applyApi('retry-edit',{draftId:current.draftId,...(r.windowId?{windowId:r.windowId}:{})});
 if(child.state==='paid'){location.assign('/order');return;}
 if(child.editable!==true||child.orderId)throw Error('close_unresolved');
 show(child);unknown=false;history.replaceState(null,'','/apply?draftId='+encodeURIComponent(child.draftId));status.textContent=safe.phase==='cancelled'&&child.verification!=='pending-or-unavailable'?'결제창을 닫았습니다. 내용을 수정·저장하거나 다시 결제할 수 있습니다.':'결제 결과를 확인 중입니다. 접수 수정·저장은 가능하며 다음 결제 전 서버에서 다시 확인합니다.';
 }catch(error){const wasUnknown=unknown;unknown=false;recovering=wasUnknown&&Boolean(current.receipt&&!current.orderId);if([400,403,409,429].includes(error.status)){status.textContent='결제 결과를 확인 중이거나 입력·동의 확인이 필요합니다. 다시 누르면 서버에서 확인합니다.';}else if(wasUnknown||current.orderId){status.textContent='결제 결과를 확인 중입니다. 내용을 유지했습니다. 다시 누르면 서버에서 확인합니다.';}else fail();}finally{busy=false;sync();}});
 save.addEventListener('click',async()=>{
 if(!ready||busy||unknown||(!recoverable()&&(current.orderId||(current.receipt&&current.editable!==true))))return;
 if(!field('draftPrivacyConsent').checked){status.textContent='저장용 개인정보 처리 동의를 확인해주세요.';return;}
 const phone=field('customerPhone').value.trim();field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone)&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15?'':'전화번호를 확인해주세요.');field('customerName').setCustomValidity(field('customerName').value.trim()&&new TextEncoder().encode(field('customerName').value.trim()).length<=30?'':'성함은 30바이트 이내로 입력해주세요.');field('brief').setCustomValidity(field('brief').value.trim()?'':'내용을 입력해주세요.');
 for(const n of ['customerName','customerPhone','brief'])if(!field(n).reportValidity())return;
 busy=true;sync();status.textContent='저장 중…';
 try{
  if(!await ensureEditable())return;
  const payload=Object.fromEntries(names.map(n=>[n,field(n).value.trim()]));if(payload.autoPost==='no')payload.existingAccount='no';payload.draftId=current.draftId;payload.policyEvidence=createPolicyConsentEvidence();payload.draftConsent={version:'cjy-draft-2026-10-02',privacy:true};
  unknown=true;const r=await applyApi('save',payload);if(disposed)return;if(!r.receipt||!r.draftId||!r.application)throw Error('invalid_saved_application');show(r,true);unknown=false;history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));status.textContent='접수를 저장했습니다. 결제는 시작되지 않았습니다.';
 }catch(e){unknown=false;status.textContent=[400,403,409,429].includes(e.status)?'저장하지 못했습니다. 입력·동의 또는 기존 접수 상태를 확인해주세요.':'저장 결과를 확인 중입니다. 입력을 유지했습니다. 다시 저장하면 서버에서 확인합니다.';}finally{busy=false;sync();}
 });
 applyApi('status').then(async r=>{if(disposed)return;const active=r,selected=params.get('draftId');if(selected&&!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(selected))throw Error('invalid_selection');if(selected||r.receipt)r=await applyApi('application',{draftId:selected||r.draftId});
 // A stale unpaid revision link is not the editable head. Resolve only after
 // the owner-scoped server confirms both archive and current saved eligibility.
 if(selected&&selected!==active.draftId&&r.receipt&&r.editable===false&&!r.orderId&&active.receipt&&!active.orderId&&active.status==='pending-review'){
  const owned=await applyApi('orders'),old=owned.orders?.find(o=>o.draftId===selected),head=owned.orders?.find(o=>o.draftId===active.draftId);
  if(owned.draftId===active.draftId&&old?.state==='archived'&&!old.orderId&&head?.state==='saved'&&head.editable===true&&!head.orderId){
   const latest=await applyApi('application',{draftId:active.draftId});
   if(latest.draftId===active.draftId&&latest.receipt&&latest.application&&latest.editable===true&&!latest.orderId&&latest.status==='pending-review'){r=latest;if(!disposed)history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));}
  }
 }
 if(r.state==='paid'&&(params.has('paymentId')||params.has('code')||/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(params.get('windowId')??''))){location.assign('/order');return;}
 if(r.orderId&&r.state==='pending_payment'){
  if(classifyPaymentResult({code:params.get('code')}).phase==='cancelled'){
   const windowId=params.get('windowId');cancelledReturn({...r,...(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(windowId??'')?{windowId}:{})},true);ready=true;sync();return;
  }
  const original=r;
  try{r=await applyApi('retry-edit',{draftId:r.draftId,...(params.has('windowId')&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(params.get('windowId'))?{windowId:params.get('windowId')}:{})});}
  catch(error){if(![404,409,503].includes(error.status))throw error;r=original;}
  if(r.orderId&&r.state==='pending_payment')r={...original,editable:true};
  if(r.state==='paid'){location.assign('/order');return;}
  if(r.editable===true&&!r.orderId&&!disposed)history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));
 }
 if(disposed)return;show(r,true);ready=r.status!=='session-expired';if(!ready)status.textContent='보안 세션이 만료되었습니다. 기존 결제는 유지됩니다. 주문 현황의 문의하기로 연락해주세요.';sync();}).catch(()=>{status.textContent='결제 연결을 확인하지 못했습니다. 새로고침해주세요.';});

 return ()=>{disposed=true;};
}
