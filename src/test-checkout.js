import {classifyPaymentResult} from './payment-result.js';
const form=document.querySelector('#test-checkout'),status=document.querySelector('#checkout-status'),diagnostic=document.querySelector('#checkout-diagnostic'),button=form.querySelector('button[type=submit]'),check=document.querySelector('#check-status');
const field=n=>form.elements.namedItem(n),key='cjy-test-checkout-v1';let saved,busy=false,sdk;
try{saved=JSON.parse(sessionStorage.getItem(key));}catch{}
if(saved?.capability)field('capability').value=saved.capability;
const persist=()=>sessionStorage.setItem(key,JSON.stringify(saved));
function display(r){
 if(r.environment!=='test')throw Error('environment');
 status.textContent=r.state==='pilot_pending'?'초기 시안 작업 접수 · 사전 승인된 첫 시안 1건 제작 대기 (운영자 전달 전용 · 정기 운영·게시 없음)':r.state==='manual_hold'?'결제 결과 확인 보류 · 재결제하지 말고 관리자에게 확인하세요.':'서버 결제 확인 대기 · 다시 결제하지 마세요.';
 if(r.initialPilotId)status.textContent+=` · 작업 ${r.initialPilotId}`;
}
async function api(action,body={}){
 const response=await fetch('/api/test/checkout/'+action,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(saved?.capability||field('capability').value.trim())},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('unavailable');return response.json();
}
function loadSdk(){return sdk??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.portone.io/v2/browser-sdk.js';const timer=setTimeout(()=>reject(Error('sdk_timeout')),10000);script.onload=()=>{clearTimeout(timer);typeof window.PortOne?.requestPayment==='function'?resolve(window.PortOne):reject(Error('sdk_unavailable'));};script.onerror=()=>{clearTimeout(timer);reject(Error('sdk_unavailable'));};document.head.appendChild(script);});}
const sync=()=>{button.disabled=busy||Boolean(saved?.started);check.disabled=busy;};
const fail=()=>{status.textContent='결과 미확인 · 초대 만료 또는 통신 오류일 수 있습니다. 재결제하지 말고 관리자에게 확인하세요.';};
async function refresh(verify=false){if(busy)return;busy=true;sync();try{display(await api(verify?'verify':'status'));}catch{fail();}finally{busy=false;sync();}}
check.addEventListener('click',()=>refresh(true));
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||saved?.started||!form.reportValidity())return;
 const capability=field('capability').value.trim();if(!/^[A-Za-z0-9_-]{43,128}$/.test(capability))return;
 const fullName=field('fullName').value.trim(),phoneNumber=field('phoneNumber').value.trim(),email=field('email').value.trim();
 if(!fullName||new TextEncoder().encode(fullName).length>30||!/^\+?[0-9 ()-]{7,30}$/.test(phoneNumber))return;
 busy=true;sync();
 try{
  // Load SDK before creating the durable order, so SDK failure creates no attempt.
  const portone=await loadSdk();
  saved={capability,started:true};persist();sync();
  const order=await api('open',{consentVersion:'cjy-test-2026-09-26',granted:field('consent').checked});
  if(order.environment!=='test'||order.state!=='pending_payment')return display(order);
  saved={...saved,orderId:order.orderId,paymentId:order.paymentId};persist();
  if(order.currency!=='KRW')throw Error('currency');
  // Browser SDK enum differs from the REST/DB currency code.
  const currency='CURRENCY_KRW';
  const result=await portone.requestPayment({storeId:order.storeId,channelKey:order.channelKey,paymentId:order.paymentId,orderName:order.orderName,totalAmount:order.totalAmount,currency,payMethod:order.payMethod,customer:{fullName,phoneNumber,email},redirectUrl:location.origin+'/test/checkout/'});
  const safe=classifyPaymentResult(result);saved.diagnostic=safe;persist();diagnostic.textContent=`결제창 상태: ${safe.phase} · SDK ${safe.sdkCode??'없음'} · PG ${safe.pgCode??'없음'} (서버 확인이 우선합니다)`;
  // Browser cancellation never overrides authoritative PAID evidence.
  display(await api('verify'));
 }catch{fail();}finally{busy=false;sync();}
});
const params=new URLSearchParams(location.search);
if(params.has('paymentId')||params.has('code')){
 history.replaceState(null,'','/test/checkout/');
 if(saved?.paymentId&&params.get('paymentId')===saved.paymentId){saved.diagnostic=classifyPaymentResult({code:params.get('code'),pgCode:params.get('pgCode')});persist();refresh(true);}else{button.disabled=true;busy=true;fail();}
}else if(saved?.started)refresh(false);
// Native method=dialog never sends form data; enable only after safe handler setup.
form.querySelector('fieldset').disabled=false;
sync();
