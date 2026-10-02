import {PRICING,calculateFirstMonthPrice} from './commercial.js';
import {createPolicyConsentEvidence} from './policy-documents.js';
import {applyApi,loadSdk} from './apply-checkout.js';
import {classifyPaymentResult} from './payment-result.js';
export const DIRECT_CONSENT_VERSION='cjy-direct-test-2026-09-27';
const money=n=>n.toLocaleString('ko-KR')+'₩';
export function renderDirectApplication(){return `<div class="landing application"><header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31" /></a><a href="/#product" data-link>Product</a><a href="/#pricing" data-link>Pricing</a><a href="/order" data-link>Order</a></nav></header>
<main class="application-main"><h1>서비스 결제</h1><p class="customer-note">테스트 결제 · 실제 청구 없음</p>
<section data-existing-order hidden class="customer-note"><h2>저장된 내용</h2><p>저장된 접수 내용입니다. 결제·보관된 접수는 읽기 전용입니다. 결과 미확인 상태에서는 재결제하지 말고 주문 현황에서 결제 상태를 확인해주세요.</p><a href="/order" data-link>주문 현황 보기</a> <a href="mailto:cjy.support@gmail.com">문의하기</a></section><dialog data-discard-dialog aria-labelledby="discard-question"><form method="dialog"><p id="discard-question">기존 접수가 있습니다. 기존 접수를 삭제한 후 새 접수를 하시겠습니까?</p><p>결제 전 접수만 보관 처리하며 결제·접수 이력은 영구 삭제하지 않습니다.</p><button type="button" value="cancel" data-discard-cancel autofocus>취소</button><button type="button" value="confirm" data-discard-confirm>삭제 후 새 접수</button></form></dialog><button type="button" class="order-button" data-new-application hidden>새 접수 작성</button><form id="application-form" data-direct-checkout method="dialog"><div class="application-fields">
<section class="customer-section"><h2 class="application-section-title">고객 정보</h2><div class="customer-fields">
<label class="customer-field">성함<input name="customerName" autocomplete="name" required maxlength="100" /></label>
<label class="customer-field">연락 가능한 전화번호<input type="tel" name="customerPhone" autocomplete="tel" required maxlength="30" /></label>
<label class="customer-field">결제 이메일<input type="email" name="testEmail" autocomplete="email" required maxlength="254" /></label></div></section>
<h2 class="application-section-title">서비스 선택</h2>
<label class="form-field">서비스 종류<select name="service"><option value="reels">매일 릴스 솔루션</option></select></label>
<label class="form-field">요금제<select name="plan"><option>Standard</option><option>Deluxe</option><option>Premium</option></select></label>
<p class="customer-note" data-plan-description></p>
<label class="form-field">자동 게시 희망 여부<select name="autoPost"><option value="yes">사용함</option><option value="no">사용하지 않음</option></select></label>
<div data-account><label class="form-field">기존 계정 사용 여부<select name="existingAccount"><option value="no">사용하지 않음</option><option value="yes">사용함</option></select></label><p class="customer-note">기존 계정은 추가 작업이 필요할 수 있습니다.</p></div>
<div class="brief-field"><div class="brief-heading"><label for="application-brief">콘텐츠 스타일 및 내용</label><button type="button" class="brief-help" aria-expanded="false" aria-controls="brief-guide">작성 가이드</button></div><p id="brief-guide" hidden>브랜드 소개, 주제, 원하는 분위기, 참고 링크와 꼭 포함하거나 제외할 내용을 적어주세요.</p><textarea id="application-brief" name="brief" required maxlength="10000" placeholder="원하는 콘텐츠와 참고 사항을 작성해주세요."></textarea></div>
<fieldset class="delivery"><legend>결과 전달 희망 채널</legend><div class="delivery-options"><label data-legacy-channel hidden><input type="radio" name="channel" value="discord" disabled /><span>디스코드 · 이전 선택 (현재 지원 안 함)</span></label><label><input type="radio" name="channel" value="telegram" checked /><span>텔레그램</span></label><label data-legacy-channel hidden><input type="radio" name="channel" value="gmail" disabled /><span>지메일 · 이전 선택 (현재 지원 안 함)</span></label></div></fieldset>
<p class="customer-note">결제·동의 확인 후 첫 Pilot을 제작합니다. 첫 Pilot은 운영자 최준영에게만 전달하며 고객에게 자동 전달하지 않습니다. 이후 가이드라인 상담을 진행합니다. 초기 가이드라인 수정은 최대 2회이며, 개별 콘텐츠 수정 횟수가 아닙니다. Standard·Deluxe·Premium 모든 상품은 가이드라인 확정 후 선택한 시작일부터 한 달간 달력일마다 매일 영상 1개를 제공합니다. 약정 수량은 시작일·종료일에 따라 계약 시 확정하며 임의로 변경하지 않습니다. 연장은 매달 직접 결제합니다. 자동 정기결제는 하지 않습니다.</p>
<fieldset class="consents"><legend>필수 동의</legend>
<label><input type="checkbox" name="draftPrivacyConsent" /><span>접수 저장을 위해 성함·전화번호·요청 내용·선택 항목의 처리에 동의합니다. 저장만으로 결제·첫 Pilot 제작·월간 제작을 시작하지 않습니다. 저장하려면 성함·전화번호·요청 내용을 작성하고 이 저장 동의가 필요합니다. 결제 이메일은 저장하지 않습니다. 삭제 후 새 접수는 보관 이력을 남기며 즉시 영구 파기가 아닙니다. <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a></span></label>
<label><input type="checkbox" name="termsConsent" required /><span><a href="/terms" target="_blank" rel="noopener">이용약관</a> 및 <a href="/refund" target="_blank" rel="noopener">환불 정책</a>과 아래 테스트 결제 안내에 동의합니다. 제공한 요청·자료를 상업용 콘텐츠 제작에 사용할 권리가 있음을 확인합니다.</span></label>
<label><input type="checkbox" name="privacyConsent" required /><span>주문 저장·결제 확인·상담을 위한 성함, 전화번호, 요청 내용, 선택·동의 항목의 처리에 동의합니다. 결제 시 성함·전화번호·이메일은 PortOne·KG이니시스 결제창으로 전달되며 이메일은 CJY 신청 서버에 저장하지 않습니다. 첫 Pilot 제작에 필요한 요청 내용·대본·이미지·음성의 OpenAI·ElevenLabs·Runway 처리와 운영자 Telegram 전달에 동의합니다. 이름·전화번호·결제 이메일은 제작 입력으로 보내지 않습니다. 자동 게시 및 월간 제작 개시는 별도입니다. 동의하지 않으면 결제를 진행할 수 없습니다. <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a></span></label>
</fieldset>
<details class="customer-note"><summary>테스트 결제 안내</summary><p>이 화면은 PortOne·KG이니시스 TEST 결제로 실제 청구나 유료 서비스 개시가 아닙니다. 기존 약관의 결제 활성화 제한과 별개로 이 테스트만 진행합니다. 결제와 위 제작 동의를 확인한 주문은 운영 한도 안에서 첫 Pilot 제작 대기열에 등록됩니다. 실행 환경이 오프라인이거나 한도가 소진되면 대기하며, 결제 상태와 제작 상태는 별도로 표시합니다. 월간 제작·자동 게시·정식 서비스 개시는 이 테스트에 포함되지 않습니다.</p><p>이 테스트는 LIVE 결제의 개인정보·국외 이전 고지가 완결되었다는 의미가 아닙니다. 처리 국가·수령 법인·보유 기간 등 미확인 사항은 확인 후 별도 고지합니다. TEST에도 입력 정보가 처리되므로 민감정보나 제3자의 개인정보를 요청 내용에 적지 마세요. 보유·파기 및 권리 요청은 개인정보처리방침을 확인해주세요.</p></details>
</div><div class="payment-dock"><div class="order-summary" aria-live="polite"><div><span>파이프라인 설치 비용</span><strong>${money(PRICING.setupSupplyWon)}</strong></div><div><span id="order-service"></span><strong id="order-price"></strong></div><div><span>부가세 (10%)</span><strong id="order-vat"></strong></div></div><p class="price-note">설치비·서비스비에 부가세 10%를 포함한 첫 달 금액입니다.</p><div class="checkout"><strong id="order-total"></strong><button type="button" data-save-application disabled>저장하기</button><button type="submit" disabled>결제하기</button></div><p id="checkout-status" role="status"></p></div></form></main></div>`;}
export function bindDirectApplication(root){
 const form=root.querySelector('[data-direct-checkout]'),field=n=>form.elements.namedItem(n),submit=form.querySelector('[type=submit]'),existing=root.querySelector('[data-existing-order]'),status=form.querySelector('#checkout-status'),save=form.querySelector('[data-save-application]'),create=root.querySelector('[data-new-application]'),discard=root.querySelector('[data-discard-dialog]');
 let current={},busy=false,ready=false,unknown=false,disposed=false;
 const names=['customerName','customerPhone','service','plan','autoPost','existingAccount','brief','channel'];
 const sync=()=>{create.hidden=!(current.receipt&&current.editable===true);create.disabled=!ready||busy||unknown;save.disabled=!ready||busy||unknown||Boolean(current.orderId||(current.receipt&&current.editable!==true));submit.disabled=!ready||busy||unknown||Boolean(current.orderId||(current.receipt&&current.editable!==true));};
 const show=(r,restore=false)=>{if(disposed)return;if(r.environment&&r.environment!=='test')throw Error('environment');current={...r,draftId:r.draftId??current.draftId};
 if(Object.hasOwn(PRICING.plans,r.plan)){field('plan').value=r.plan;update();}
 existing.hidden=!r.receipt;form.hidden=Boolean(r.receipt&&!r.application);
 if(r.application&&restore){
  if(names.some(n=>typeof r.application[n]!=='string')||Object.keys(r.application).some(n=>!names.includes(n)))throw Error('invalid_application');
  for(const n of names)field(n).value=r.application[n];
  field('testEmail').value='';for(const n of ['termsConsent','privacyConsent','draftPrivacyConsent'])field(n).checked=false;
  for(const el of form.elements)if(el.name)el.disabled=r.editable!==true||(el.name==='channel'&&el.value!=='telegram');
  update();
 }
 sync();};
 const fail=()=>{status.textContent=(unknown||current.orderId)?'결과 미확인 · 재결제하지 말고 결제 상태를 확인해주세요.':'결제 준비에 실패했습니다. 결제하기를 눌러 다시 시도해주세요.';};
 const params=new URLSearchParams(location.search);field('plan').value=Object.hasOwn(PRICING.plans,params.get('plan'))?params.get('plan'):'Standard';if(params.has('paymentId')||params.has('code')){location.replace('/order');return ()=>{disposed=true;};}
 const update=()=>{for(const label of form.querySelectorAll('[data-legacy-channel]'))label.hidden=!label.querySelector('input').checked;const plan=field('plan').value,p=calculateFirstMonthPrice(plan);form.querySelector('[data-plan-description]').textContent={Standard:'타이포그래피 편집 · TTS · 자막',Deluxe:'생성형 이미지 중심 편집 · TTS · 자막',Premium:'고퀄리티 영상 중심 편집 · 생성형 이미지 · TTS · 자막'}[plan];form.querySelector('#order-service').textContent='매일 릴스 솔루션 ('+plan+')';form.querySelector('#order-price').textContent=money(p.monthlySupplyWon);form.querySelector('#order-vat').textContent=money(p.vatWon);form.querySelector('#order-total').textContent='총 가격: '+money(p.totalWon);form.querySelector('[data-account]').hidden=field('autoPost').value==='no';};form.addEventListener('change',update);update();
 form.querySelector('.brief-help').addEventListener('click',e=>{const g=form.querySelector('#brief-guide');g.hidden=!g.hidden;e.currentTarget.setAttribute('aria-expanded',String(!g.hidden));});
 for(const n of ['customerName','customerPhone','brief'])field(n).addEventListener('input',()=>field(n).setCustomValidity(''));
 form.addEventListener('submit',async event=>{event.preventDefault();if(!ready||busy||unknown||current.orderId||(current.receipt&&current.editable!==true))return;
 {const phone=field('customerPhone').value.trim();field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone)&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15?'':'전화번호를 확인해주세요.');field('customerName').setCustomValidity(field('customerName').value.trim()&&new TextEncoder().encode(field('customerName').value.trim()).length<=30?'':'성함은 30바이트 이내로 입력해주세요.');field('brief').setCustomValidity(field('brief').value.trim()?'':'내용을 입력해주세요.');}
 if(!form.reportValidity())return;busy=true;sync();status.textContent='결제 준비 중…';
 try{const portone=await loadSdk();if(disposed)return;
 {const payload=Object.fromEntries(names.map(n=>[n,field(n).value.trim()]));if(payload.autoPost==='no')payload.existingAccount='no';payload.draftId=current.draftId;payload.policyEvidence=createPolicyConsentEvidence();payload.consentBundle={version:DIRECT_CONSENT_VERSION,termsRefund:field('termsConsent').checked,privacy:field('privacyConsent').checked,pilotRights:field('termsConsent').checked,pilotProcessing:field('privacyConsent').checked,pilotVersion:'cjy-firstPilot-2026-09-27'};unknown=true;const saved=await applyApi(current.receipt?'revise':'submit',payload);if(saved.status!=='pending-review'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(saved.receipt??''))throw Error('missing_receipt');show({...saved,draftId:saved.draftId??current.draftId});unknown=false;}
 unknown=true;const r=await applyApi('open',{draftId:current.draftId,consentVersion:DIRECT_CONSENT_VERSION,granted:field('termsConsent').checked&&field('privacyConsent').checked});show(r);
 if(r.status!=='checkout-ready'||r.state!=='pending_payment')return;
 if(r.environment!=='test'||r.currency!=='KRW'||!Number.isSafeInteger(r.totalAmount)||r.totalAmount<=0)throw Error('checkout_binding');if(disposed)return;
 const result=await portone.requestPayment({storeId:r.storeId,channelKey:r.channelKey,paymentId:r.paymentId,orderName:r.orderName,totalAmount:r.totalAmount,currency:'CURRENCY_KRW',payMethod:r.payMethod,customer:{...r.customer,email:field('testEmail').value.trim()},redirectUrl:location.origin+'/order'});const safe=classifyPaymentResult(result);status.textContent=`결제창 ${safe.phase==='cancelled'?'취소':safe.phase==='failed'?'실패':'종료'} · 결제를 확인하고 있습니다.`;await applyApi('verify',{draftId:current.draftId});location.assign('/order');
 }catch(error){if([400,403,409,429].includes(error.status)){unknown=false;status.textContent='입력·동의 내용을 확인해주세요. 요청이 많으면 잠시 후 다시 시도해주세요.';}else if(unknown||current.orderId){location.assign('/order');}else fail();}finally{busy=false;sync();}});
 for(const value of ['cancel','confirm'])discard.querySelector('[data-discard-'+value+']').addEventListener('click',()=>discard.close(value));
 create.addEventListener('click',()=>{if(!ready||busy||unknown||!current.receipt||current.editable!==true)return;discard.returnValue='cancel';discard.showModal();discard.querySelector('[data-discard-cancel]').focus();});
 discard.addEventListener('close',async()=>{
 if(discard.returnValue!=='confirm'||!ready||busy||unknown||!current.receipt||current.editable!==true)return;
 busy=true;sync();
 try{const r=await applyApi('new',{draftId:current.draftId,discard:true});if(disposed)return;if(r.status!=='session-ready'||r.receipt||!r.draftId)throw Error('new_not_empty');
 form.reset();for(const el of form.elements)if(el.name)el.disabled=false;show(r);update();history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));status.textContent='이전 접수를 보관 처리했습니다. 새 접수를 작성해주세요.';
 }catch{status.textContent='기존 접수를 유지합니다. 서버 상태를 확인한 후 다시 시도해주세요.';}finally{busy=false;sync();}
 });
 save.addEventListener('click',async()=>{
 if(!ready||busy||unknown||current.orderId||(current.receipt&&current.editable!==true))return;
 if(!field('draftPrivacyConsent').checked){status.textContent='저장용 개인정보 처리 동의를 확인해주세요.';return;}
 const phone=field('customerPhone').value.trim();field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone)&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15?'':'전화번호를 확인해주세요.');field('customerName').setCustomValidity(field('customerName').value.trim()&&new TextEncoder().encode(field('customerName').value.trim()).length<=30?'':'성함은 30바이트 이내로 입력해주세요.');field('brief').setCustomValidity(field('brief').value.trim()?'':'내용을 입력해주세요.');
 for(const n of ['customerName','customerPhone','brief'])if(!field(n).reportValidity())return;
 busy=true;sync();status.textContent='저장 중…';
 try{
  const payload=Object.fromEntries(names.map(n=>[n,field(n).value.trim()]));if(payload.autoPost==='no')payload.existingAccount='no';payload.draftId=current.draftId;payload.policyEvidence=createPolicyConsentEvidence();payload.draftConsent={version:'cjy-draft-2026-10-02',privacy:true};
  unknown=true;const r=await applyApi('save',payload);if(disposed)return;if(!r.receipt||!r.draftId||!r.application)throw Error('invalid_saved_application');show(r,true);unknown=false;history.replaceState(null,'','/apply?draftId='+encodeURIComponent(r.draftId));status.textContent='접수를 저장했습니다. 결제는 시작되지 않았습니다.';
 }catch(e){if([400,403,409,429].includes(e.status)){unknown=false;status.textContent='저장하지 못했습니다. 입력·동의 또는 기존 접수 상태를 확인해주세요.';}else location.assign('/order');}finally{busy=false;sync();}
 });
 applyApi('session').then(()=>applyApi('status')).then(async r=>{if(disposed)return;const selected=params.get('draftId');if(selected&&!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(selected))throw Error('invalid_selection');if(selected||r.receipt)r=await applyApi('application',{draftId:selected||r.draftId});if(disposed)return;show(r,true);ready=r.status!=='session-expired';if(!ready)status.textContent='보안 세션이 만료되었습니다. 기존 결제는 유지됩니다. 주문 현황의 문의하기로 연락해주세요.';sync();}).catch(()=>{status.textContent='결제 연결을 확인하지 못했습니다. 새로고침해주세요.';});

 return ()=>{disposed=true;};
}
