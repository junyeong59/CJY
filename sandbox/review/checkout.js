// Local review only. Production's bindApplication is deliberately never loaded.
import {PRICING,calculateFirstMonthPrice} from '/src/commercial.js';
import {classifyPaymentResult} from '/src/payment-result.js';
const form=document.querySelector('#application-form');
const field=name=>form.elements.namedItem(name);
const status=document.querySelector('#checkout-status');
const button=form.querySelector('button[type=submit]');
const money=value=>`${value.toLocaleString('ko-KR')}₩`;
const attemptKey='cjy-review-attempt';
const unverified='결제 결과 미확인 · 서버 검증 전이므로 결제완료가 아니며 paid로 처리하지 않습니다. 재시도하지 말고 관리자에게 확인하세요. 실 접수·제작·게시 없음.';
let busy=false,attempt=null,sdkFailed=false,returnMismatch=false;
try{attempt=JSON.parse(sessionStorage.getItem(attemptKey));}catch{}
const unresolved=()=>attempt&&['pending','unverified'].includes(attempt.phase);
function showResult(code,pgCode){
  const diagnostic=classifyPaymentResult({code,pgCode});
  attempt.phase=diagnostic.phase;
  attempt.diagnostic={sdkCode:diagnostic.sdkCode,pgCode:diagnostic.pgCode};
  sessionStorage.setItem(attemptKey,JSON.stringify(attempt));
  status.textContent=attempt.phase==='cancelled'?'결제창이 취소·중단되었습니다. 실 접수·제작·게시 없음.':attempt.phase==='failed'?'결제창 요청이 실패했습니다. 실 접수·제작·게시 없음.':unverified;
}
button.disabled=true;
document.querySelector('h1').textContent='서비스 신청하기 · 로컬 PG 심사';
button.textContent='테스트 결제창 열기';
document.querySelector('.checkout-note').textContent='로컬 심사 전용 · KG이니시스 V2 TEST 채널의 결제창·카드사 목록만 확인하고 닫으세요. 테스트 결제도 실제 출금될 수 있습니다. 카드정보 입력·인증·승인 금지. 실 접수·고객 등록·제작·게시는 실행하지 않습니다.';
document.querySelector('#customer-note').textContent='로컬 심사 전용: 이름·전화번호·이메일만 PG 결제창 요청에 전달됩니다. 신청 내용은 서버에 접수하거나 저장하지 않습니다. 실제 고객 정보는 입력하지 마세요.';
field('privacyConsent').parentElement.lastChild.textContent=' 로컬 심사에서 구매자 이름·전화번호·이메일이 PortOne 및 KG이니시스에 전달됨을 이해합니다 (실 접수·저장 없음)';
document.querySelector('.customer-fields').insertAdjacentHTML('beforeend','<label class="customer-field">이메일 (KG이니시스 필수)<input type="email" name="customerEmail" required maxlength="254" autocomplete="off" /></label>');
for(const name of ['customerName','customerPhone','brief'])field(name).addEventListener('input',()=>field(name).setCustomValidity(''));
form.querySelector('.brief-help').addEventListener('click',event=>{
  const guide=document.querySelector('#brief-guide');guide.hidden=!guide.hidden;
  event.currentTarget.setAttribute('aria-expanded',String(!guide.hidden));
});
const sync=()=>{
  const autoPost=field('autoPost').value==='yes';
  form.querySelector('[data-account]').hidden=!autoPost;
  field('existingAccount').disabled=!autoPost;
  field('postingConsent').required=autoPost;field('postingConsent').disabled=!autoPost;
  if(!autoPost)field('postingConsent').checked=false;
  form.querySelector('[data-posting-consent]').hidden=!autoPost;
  const plan=field('plan').value;
  const price=calculateFirstMonthPrice(plan);
  document.querySelector('#order-service').textContent=`매일 릴스 솔루션 (${plan})`;
  document.querySelector('#order-price').textContent=money(PRICING.plans[plan]);
  document.querySelector('#order-vat').textContent=money(price.vatWon);
  document.querySelector('#order-total').textContent=`총 가격: ${money(price.totalWon)}`;
};
if(attempt&&Object.hasOwn(PRICING.plans,attempt.plan))field('plan').value=attempt.plan;
form.addEventListener('change',sync);sync();
const params=new URLSearchParams(location.search);
if(params.has('paymentId')||params.has('code')){
  history.replaceState(null,'','/review/apply');
  if(attempt?.paymentId===params.get('paymentId')&&attempt.phase==='pending')showResult(params.get('code'),params.get('pgCode'));
  else{returnMismatch=true;status.textContent='복귀 정보가 현재 요청과 일치하지 않습니다. '+unverified;}
}else if(unresolved())status.textContent=unverified;
const dock=form.querySelector('.payment-dock');
new ResizeObserver(()=>{form.style.paddingBottom=`${dock.getBoundingClientRect().height+40}px`;}).observe(dock);
const config=await fetch('/review/config',{credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('config_unavailable');return r.json();}).catch(()=>({ready:false}));
if(config.ready)button.disabled=returnMismatch||Boolean(unresolved());
else status.textContent='TEST 채널 설정 및 TEST 증빙이 없어 결제창을 열 수 없습니다.';
window.addEventListener('pageshow',event=>{
  if(event.persisted&&unresolved()){busy=false;button.disabled=true;status.textContent=unverified;}
});
let sdk;
function loadSdk(){
  return sdk??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://cdn.portone.io/v2/browser-sdk.js';
    let settled=false;
    const finish=success=>{
      if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;
      if(success)resolve(window.PortOne);
      else{sdkFailed=true;script.remove();reject(new Error('sdk_unavailable'));}
    };
    const timer=setTimeout(()=>finish(false),10000);
    script.onload=()=>finish(typeof window.PortOne?.requestPayment==='function');
    script.onerror=()=>finish(false);
    document.head.appendChild(script);
  });
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||sdkFailed||returnMismatch||unresolved()||!config.ready)return;
  const name=field('customerName').value.trim(),phone=field('customerPhone').value.trim();
  field('customerName').setCustomValidity(name&&new TextEncoder().encode(name).length<=30?'':'구매자 이름은 공백 없이 입력하고 30바이트 이하로 작성해주세요.');
  field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone)&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15?'':'전화번호를 확인해주세요.');
  field('brief').setCustomValidity(field('brief').value.trim()?'':'내용을 입력해주세요.');
  if(!form.reportValidity())return;
  busy=true;button.disabled=true;status.textContent='테스트 결제창을 여는 중입니다. 카드정보를 입력하지 마세요.';
  try{
    const portone=await loadSdk();
    const plan=field('plan').value;
    attempt={paymentId:`cjy-${crypto.randomUUID()}`,plan,phase:'pending'};
    sessionStorage.setItem(attemptKey,JSON.stringify(attempt));
    const result=await portone.requestPayment({
      storeId:config.storeId,channelKey:config.channelKey,
      paymentId:attempt.paymentId,orderName:`CJY Reels ${plan}`,
      totalAmount:calculateFirstMonthPrice(plan).totalWon,currency:'KRW',payMethod:'CARD',
      customer:{fullName:field('customerName').value.trim(),phoneNumber:field('customerPhone').value.trim(),email:field('customerEmail').value.trim()},
      redirectUrl:location.origin+'/review/apply'
    });
    showResult(result?.code,result?.pgCode);
  }catch{status.textContent=sdkFailed?'SDK 로드 실패. 네트워크를 확인한 뒤 페이지를 새로고침하세요. 결제 요청은 전송하지 않았습니다.':unverified;}
  finally{busy=false;button.disabled=sdkFailed||Boolean(unresolved());}
});
