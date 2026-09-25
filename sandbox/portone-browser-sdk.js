// Explicit local inspection only; not imported by app.js or copied to dist/.
// Official installation: https://developers.portone.io/sdk/ko/v2-sdk/readme
export const PORTONE_BROWSER_SDK_URL='https://cdn.portone.io/v2/browser-sdk.js';
export function createSandboxSdkLoader({window,document,enabled=false,timeoutMs=10000}) {
  let pending;
  return ()=>{
    if(enabled!==true||!['127.0.0.1','localhost','[::1]'].includes(window?.location?.hostname)||
      window.location.pathname!=='/sandbox/portone')return Promise.resolve({status:'disabled'});
    if(pending)return pending;
    pending=new Promise(resolve=>{
      const script=document.createElement('script');let settled=false;
      const finish=success=>{
        if(settled)return;settled=true;clearTimeout(timer);
        script.onload=null;script.onerror=null;
        if(!success)script.remove();
        resolve({status:success?'loaded':'load_failed',paymentEnabled:false});
      };
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.src=PORTONE_BROWSER_SDK_URL;script.async=true;script.referrerPolicy='no-referrer';
      script.onload=()=>finish(typeof window.PortOne?.requestPayment==='function');
      script.onerror=()=>finish(false);
      try{document.head.appendChild(script);}catch{finish(false);}
    });
    return pending;
  };
}
