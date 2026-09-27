import {classifyPaymentResult} from './payment-result.js';
export async function applyApi(action,body={}){
 const r=await fetch('/api/test/apply/'+action,{method:'POST',credentials:'same-origin',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Object.assign(Error('apply_unavailable'),{status:r.status});return r.json();
}
let sdk;
export function loadSdk(){return sdk??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.portone.io/v2/browser-sdk.js';const fail=()=>{clearTimeout(timeout);s.remove();reject(Error('sdk_unavailable'));};const timeout=setTimeout(fail,10000);s.onload=()=>{clearTimeout(timeout);typeof window.PortOne?.requestPayment==='function'?resolve(window.PortOne):fail();};s.onerror=fail;document.head.appendChild(s);}).catch(error=>{sdk=undefined;throw error;});}
export function bindApplyCheckout(form,onReceipt){
 const status=form.querySelector('#checkout-status'),controls=form.querySelector('[data-test-controls]'),pay=form.querySelector('[data-test-pay]'),check=form.querySelector('[data-test-check]');
 let current=null,busy=false,disposed=false,openUnknown=false;
 const sync=()=>{controls.hidden=!current?.receipt;pay.disabled=busy||openUnknown||Boolean(current?.orderId)||current?.status==='checkout-expired';check.disabled=busy;};
 const fail=()=>{status.textContent='결과 미확인 · 같은 브라우저에서 상태 확인을 눌러주세요. 다시 신청·결제하지 마세요. 세션 만료·통신 오류는 운영자에게 문의해주세요.';};
 function show(r){
  if(disposed)return;
  if(r.receipt){current=r;onReceipt(r);}
  if(r.environment&&r.environment!=='test')throw Error('environment');
  if(!r.receipt)return;
  const msg=r.state==='pilot_pending'?'서버 결제 확인 완료 · 사전 승인된 첫 시안 1건의 운영자 전달 대기. 정기 운영·게시는 시작되지 않습니다.':r.state==='manual_hold'?'결제 확인 보류 · 취소·실패·통신 오류는 운영자 확인이 필요합니다. 재결제하지 마세요.':r.state?'서버 결제 확인 대기 · 다시 결제하지 말고 상태를 확인해주세요.':r.status==='checkout-expired'?'TEST 결제 창이 만료되었습니다. 재결제하지 말고 운영자에게 문의해주세요.':'신청이 검토 대기로 접수되었습니다. Standard 텍스트·음성 시안만 사전 승인 후 TEST 결제가 가능합니다. Deluxe·Premium 및 다른 형식은 별도 검토하며 결제하지 않습니다.';
  status.textContent=`${msg} 접수번호: ${r.receipt}`;sync();
 }
 async function refresh(){if(busy)return;busy=true;sync();try{const r=await applyApi(current?.state==='pending_payment'?'verify':'status');show(r);}catch{fail();}finally{busy=false;sync();}}
 async function open(){
  if(busy||openUnknown||current?.orderId)return;
  if(!form.elements.namedItem('testConsent').checked){status.textContent='TEST 결제 및 운영자 전용 첫 시안 안내에 동의해주세요. 신청 접수는 유지됩니다.';return;}
  const emailField=form.elements.namedItem('testEmail'),email=emailField.value.trim();
  if(!email||!emailField.reportValidity()){status.textContent='TEST 결제용 이메일을 입력해주세요. 신청 접수는 유지됩니다.';emailField.focus();return;}
  busy=true;sync();status.textContent='TEST 결제 준비 중 · 잠시 기다려주세요.';
  try{
   const portone=await loadSdk();if(disposed)return;
   // A known SDK failure is retryable only before the order request is sent.
   openUnknown=true;
   const r=await applyApi('open',{consentVersion:'cjy-test-2026-09-26',granted:true});show(r);
   if(r.status!=='checkout-ready'||r.environment!=='test'||r.state!=='pending_payment'){
    if(r.status==='pending-review'&&!r.orderId)openUnknown=false;
    return;
   }
   if(r.currency!=='KRW'||r.totalAmount!==273900)throw Error('invalid_checkout');
   if(disposed)return;
   // Server identity and amount only; no browser paid authority or receipt parameter.
   const result=await portone.requestPayment({storeId:r.storeId,channelKey:r.channelKey,paymentId:r.paymentId,orderName:r.orderName,totalAmount:r.totalAmount,currency:'CURRENCY_KRW',payMethod:r.payMethod,customer:{fullName:r.customer.fullName,phoneNumber:r.customer.phoneNumber,email},redirectUrl:location.origin+'/apply'});
   const safe=classifyPaymentResult(result);
   status.textContent=`결제창 ${safe.phase==='cancelled'?'취소':safe.phase==='failed'?'실패':'종료'} · 서버에서 확인하고 있습니다. 재결제하지 마세요.`;
   show(await applyApi('verify'));
  }catch{fail();}finally{busy=false;sync();}
 }
 pay.addEventListener('click',open);check.addEventListener('click',refresh);
 const query=new URLSearchParams(location.search);
 if(query.has('paymentId')||query.has('code'))history.replaceState(null,'','/apply');
 const ready=applyApi('session').then(()=>applyApi('status')).then(r=>{show(r);return r;});
 return {ready,show,open,dispose(){disposed=true;}};
}
