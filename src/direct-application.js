import { renderSiteHeader } from './header.js';
import {renderServiceQuantity} from './service-quantity.js';
import {PRICING,calculateFirstMonthPrice} from './commercial.js';
import {createPolicyConsentEvidence} from './policy-documents.js';
import {applyApi} from './apply-checkout.js';
import {validateBankOrder} from './bank-transfer.js';
export const DIRECT_CONSENT_VERSION='cjy-bank-transfer-2026-10-14';
const money=n=>n.toLocaleString('ko-KR')+'₩';
export function renderDirectApplication(){return `<div class="landing application apply-page">${renderSiteHeader()}
<main class="application-main"><h1>서비스 신청하기</h1>
<form id="application-form" data-direct-checkout method="dialog"><div class="application-fields">
<section class="customer-section"><h2 class="application-section-title">고객 정보</h2><div class="customer-fields">
<label class="customer-field">성함<input name="customerName" autocomplete="name" required maxlength="100" /></label>
<label class="customer-field">전화번호<input type="tel" name="customerPhone" autocomplete="tel" required maxlength="30" /></label>
</div><p class="customer-note">*결제 확인 후 솔루션 전달을 위해 반드시 필요한 정보이니 정확하게 작성해주세요.</p></section>
<h2 class="application-section-title">서비스 신청</h2>
${renderServiceQuantity()}

<input type="hidden" name="autoPost" value="no" />
<input type="hidden" name="existingAccount" value="no" />
<div class="brief-field"><div class="brief-heading"><label for="application-brief">컨텐츠 스타일 및 내용</label><button type="button" class="brief-help" aria-expanded="false" aria-controls="brief-guide">꼭 포함되어야하는 내용</button></div><p id="brief-guide" hidden>브랜드 소개, 주제, 원하는 분위기, 참고 링크와 꼭 포함하거나 제외할 내용을 적어주세요.</p><textarea id="application-brief" name="brief" required maxlength="10000" placeholder="꼭 포함되어야하는 내용을 포함해서 자유롭게 작성해주세요.."></textarea></div>
<fieldset class="delivery" hidden><legend>결과 전달 방법</legend><input type="radio" name="channel" value="manual" checked /><label data-legacy-channel hidden><input type="radio" name="channel" value="telegram" disabled /></label><label data-legacy-channel hidden><input type="radio" name="channel" value="discord" disabled /></label><label data-legacy-channel hidden><input type="radio" name="channel" value="gmail" disabled /></label></fieldset>

<fieldset class="consents"><legend>필수 동의 항목</legend>
<label><input type="checkbox" name="draftPrivacyConsent" /><span>접수 저장을 위한 개인정보 수집에 동의합니다</span></label>
<label><input type="checkbox" name="termsConsent" required /><span><a href="/terms" data-link>이용약관</a> 및 <a href="/refund" data-link>환불 정책</a>에 동의합니다</span></label>
<label><input type="checkbox" name="privacyConsent" required /><span>솔루션 전달을 위한 전화번호 및 성함과 같은 개인정보 수집에 동의합니다</span><a class="consent-policy-link" href="/privacy" data-link>개인정보 처리방침</a></label>
</fieldset>
<section class="application-notices" aria-labelledby="application-notices-title"><h2 id="application-notices-title" class="application-section-title">주의 사항</h2><p>결제일 이후 고객 맞춤 파이프라인 확정을 위해 추가적인 협의가 필요하며, 협의는 <strong>메시지로 진행됩니다.</strong></p><p>가이드라인 확정 이후, <strong>선택한 수량의 콘텐츠를 협의된 일정에 제작·전달합니다.</strong></p></section>

</div><div class="payment-dock"><div class="order-summary" aria-live="polite"><div><span id="order-service"></span><strong id="order-price"></strong></div><div><span>부가세 (10%)</span><strong id="order-vat"></strong></div><p class="price-note">건당 서비스비는 부가세 별도이며, 아래 합계에는 부가세 10%가 포함됩니다.</p></div><div class="checkout"><strong id="order-total"></strong><button type="button" data-save-application disabled>저장하기</button><button type="submit" disabled>결제하기</button></div><p id="checkout-status" role="status"></p></div></form></main></div>`;}
export function bindDirectApplication(root){
 const form=root.querySelector('[data-direct-checkout]');if(!form)return;
 const field=n=>form.elements.namedItem(n),submit=form.querySelector('[type=submit]'),save=form.querySelector('[data-save-application]'),status=form.querySelector('#checkout-status');
 const names=['customerName','customerPhone','service','plan','autoPost','existingAccount','brief','channel'];
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
 let current={},busy=false,ready=false,disposed=false;
 const params=new URLSearchParams(location.search);
 const sync=()=>{const locked=Boolean(current.orderId||(current.receipt&&current.editable!==true));save.disabled=submit.disabled=!ready||busy||locked;};
 const isCinematic=()=>field('plan').value==='Cinematic';
 const update=()=>{const cinematic=isCinematic();field('service').value=cinematic?'cinematic':'reels';
  form.querySelector('.order-summary').hidden=cinematic;form.querySelector('#order-total').hidden=cinematic;
  field('quantity').closest('label').hidden=cinematic;form.querySelector('[data-quantity-note]').hidden=cinematic;
  submit.textContent=cinematic?'신청하기':'결제하기';root.querySelector('.apply-page').classList.toggle('apply-page--cinematic',cinematic);
  form.querySelector('.customer-section .customer-note').textContent=cinematic?'*신청 검토와 연락에 필요한 정보이니 정확하게 작성해주세요.':'*결제 확인 후 솔루션 전달을 위해 반드시 필요한 정보이니 정확하게 작성해주세요.';
  form.querySelector('.application-notices p').innerHTML=cinematic?'신청 내용을 확인한 후 메시지로 상담을 진행합니다. 가격과 제작 일정은 협의 후 정해집니다.':'결제일 이후 고객 맞춤 파이프라인 확정을 위해 추가적인 협의가 필요하며, 협의는 <strong>메시지로 진행됩니다.</strong>';
  if(cinematic)return;
  for(const label of form.querySelectorAll('[data-legacy-channel]'))label.hidden=!label.querySelector('input').checked;const plan=field('plan').value,quantity=Number(field('quantity').value),p=calculateFirstMonthPrice(plan,quantity);form.querySelector('#order-service').textContent='릴스 솔루션('+field('plan').selectedOptions[0].textContent+') × '+quantity;form.querySelector('#order-price').textContent=money(p.monthlySupplyWon);form.querySelector('#order-vat').textContent=money(p.vatWon);form.querySelector('#order-total').textContent='총 가격: '+money(p.totalWon);};
 field('plan').value=params.get('service')==='cinematic'||params.get('plan')==='Cinematic'?'Cinematic':Object.hasOwn(PRICING.plans,params.get('plan'))?params.get('plan'):'Standard';form.addEventListener('change',update);update();
 form.querySelector('.brief-help').addEventListener('click',e=>{const g=form.querySelector('#brief-guide');g.hidden=!g.hidden;e.currentTarget.setAttribute('aria-expanded',String(!g.hidden));});
 for(const n of ['customerName','customerPhone','brief'])field(n).addEventListener('input',()=>field(n).setCustomValidity(''));
 const validate=()=>{const phone=field('customerPhone').value.trim();field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone)&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15?'':'전화번호를 확인해주세요.');field('customerName').setCustomValidity(field('customerName').value.trim()&&new TextEncoder().encode(field('customerName').value.trim()).length<=30?'':'성함은 30바이트 이내로 입력해주세요.');field('brief').setCustomValidity(field('brief').value.trim()?'':'내용을 입력해주세요.');return ['customerName','customerPhone','brief'].every(n=>field(n).reportValidity());};
 const payload=()=>{const p=Object.fromEntries(names.map(n=>[n,field(n).value.trim()]));p.autoPost='no';p.existingAccount='no';if(isCinematic()){p.channel='manual';}if(p.autoPost==='no')p.existingAccount='no';return {...p,quantity:isCinematic()?1:Number(field('quantity').value),draftId:current.draftId,policyEvidence:createPolicyConsentEvidence()};};
 const show=r=>{
  if(disposed)return;
  if(r.environment&&r.environment!=='test'&&!(r.environment==='live'&&r.paymentMethod==='bank_transfer'))throw Error('environment');
  if(!uuid.test(r.draftId??''))throw Error('invalid_draft');
  current=r;
  if(r.application){if(names.some(n=>typeof r.application[n]!=='string')||Object.keys(r.application).some(n=>!names.includes(n)&&n!=='quantity'))throw Error('invalid_application');for(const n of names)field(n).value=r.application[n];const q=r.application.quantity;if(q!==undefined&&(!Number.isSafeInteger(q)||q<1||q>30))throw Error('invalid_quantity');field('quantity').value=String(q??1);for(const n of ['termsConsent','privacyConsent','draftPrivacyConsent'])field(n).checked=false;for(const el of form.elements)if(el.name)el.disabled=r.editable!==true||(el.name==='channel'&&el.value!=='manual');update();}
  if(r.orderId){
   if(r.application?.quantity===undefined){field('quantity').closest('label').style.display='none';form.querySelector('[data-quantity-note]').hidden=true;}
   for(const el of form.elements)if(el.name)el.disabled=true;
   // Stored orders are evidence, not fresh quotes. Do not infer a new unit or
   // reconstruct a supply/VAT breakdown absent from their immutable snapshot.
   if(Number.isSafeInteger(r.totalAmount)&&r.totalAmount>0){
    form.querySelector('#order-service').textContent='확정 주문 금액 (부가세 포함)';
    form.querySelector('#order-price').textContent=money(r.totalAmount);
    form.querySelector('#order-vat').textContent='확정 주문 금액에 포함';
    form.querySelector('#order-total').textContent='총 가격: '+money(r.totalAmount);
    form.querySelector('.price-note').textContent='기존 주문의 확정 금액과 당시 약관이 적용됩니다.';
   }
  }
  sync();
 };
 form.addEventListener('submit',async e=>{e.preventDefault();if(!ready||busy||submit.disabled||!validate()||!form.reportValidity())return;busy=true;sync();status.textContent=isCinematic()?'신청 접수 중…':'입금 안내 준비 중…';
  try{if(isCinematic()){
    sessionStorage.setItem('cjy-pending-cinematic-draft',current.draftId);
    const r=await applyApi('cinematic-submit',{...payload(),consentBundle:{version:'cjy-cinematic-2026-10-25',termsRefund:field('termsConsent').checked,privacy:field('privacyConsent').checked}});
    if(disposed)return;
    if(r.draftId!==current.draftId||!r.receipt||r.application?.service!=='cinematic'||r.state!=='submitted'||r.orderId)throw Error('invalid_cinematic_receipt');
    sessionStorage.removeItem('cjy-pending-cinematic-draft');
    location.assign('/order?draftId='+encodeURIComponent(r.draftId));return;
   }sessionStorage.setItem('cjy-pending-bank-draft',current.draftId);const r=await applyApi('bank-transfer',{...payload(),consentBundle:{version:DIRECT_CONSENT_VERSION,termsRefund:field('termsConsent').checked,privacy:field('privacyConsent').checked}});if(disposed)return;validateBankOrder(r,current.draftId);sessionStorage.removeItem('cjy-pending-bank-draft');if(r.state==='paid'){location.assign('/order');return;}if(r.state!=='pending_payment')throw Error('bank_hold');location.assign('/order');}
  catch{if(!disposed)status.textContent=isCinematic()?'신청 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해주세요.':'주문 결과를 확인하지 못했습니다. 입력과 요청 번호를 유지했습니다. 다시 누르면 같은 요청을 확인합니다. 재입금하지 마세요.';}finally{busy=false;if(!disposed)sync();}
 });
 save.addEventListener('click',async()=>{if(!ready||busy||save.disabled)return;if(!field('draftPrivacyConsent').checked){status.textContent='저장용 개인정보 처리 동의를 확인해주세요.';return;}if(!validate())return;busy=true;sync();status.textContent='저장 중…';
  try{const r=await applyApi('save',{...payload(),draftConsent:{version:'cjy-draft-2026-10-02',privacy:true}});if(disposed)return;if(!r.receipt||!r.application)throw Error('invalid_saved_application');show(r);history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));status.textContent='접수를 저장했습니다. 결제는 시작되지 않았습니다.';}
  catch{if(!disposed)status.textContent='저장 결과를 확인하지 못했습니다. 입력과 요청 번호를 유지했습니다. 다시 저장하면 서버에서 확인합니다.';}finally{busy=false;if(!disposed)sync();}
 });
 applyApi('status').then(async r=>{const pending=sessionStorage.getItem('cjy-pending-bank-draft'),pendingCinematic=sessionStorage.getItem('cjy-pending-cinematic-draft'),selected=params.get('draftId')||pendingCinematic||pending;if(selected&&!uuid.test(selected))throw Error('invalid_selection');const active=r;if(!selected&&params.has('service')&&r.receipt){r=await applyApi('new');}if(selected||r.receipt){const requested=selected||r.draftId;r=await applyApi('application',{draftId:requested});if(r.draftId!==requested)throw Error('draft_binding');}
 if(selected&&selected!==active.draftId&&r.receipt&&r.editable===false&&!r.orderId&&active.receipt&&!active.orderId&&active.status==='pending-review'){
  const owned=await applyApi('orders'),old=owned.orders?.find(o=>o.draftId===selected),head=owned.orders?.find(o=>o.draftId===active.draftId);
  if(owned.draftId===active.draftId&&old?.state==='archived'&&!old.orderId&&head?.state==='saved'&&head.editable===true&&!head.orderId){
   const latest=await applyApi('application',{draftId:active.draftId});
   if(latest.draftId===active.draftId&&latest.receipt&&latest.application&&latest.editable===true&&!latest.orderId&&latest.status==='pending-review'){r=latest;if(!disposed)history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));}
  }
 }
 if(disposed)return;if(pendingCinematic===r.draftId&&r.application?.service==='cinematic'&&r.state==='submitted'&&r.receipt&&!r.orderId){sessionStorage.removeItem('cjy-pending-cinematic-draft');location.assign('/order?draftId='+encodeURIComponent(r.draftId));return;}if(r.status==='session-expired')throw Error('session_expired');if(pending===r.draftId&&r.paymentMethod==='bank_transfer'&&r.orderId){validateBankOrder(r,pending);sessionStorage.removeItem('cjy-pending-bank-draft');}if(r.paymentMethod==='bank_transfer'&&r.state==='paid'){validateBankOrder(r,r.draftId);if(!params.get('draftId')){location.assign('/order');return;}}show(r);ready=true;sync();}).catch(()=>{if(!disposed)status.textContent='신청 연결을 확인하지 못했습니다. 세션 만료 또는 접근 오류일 수 있습니다. 새로고침하거나 운영자에게 문의해주세요.';});
 return ()=>{disposed=true;};
}
