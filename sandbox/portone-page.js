import {createSandboxSdkLoader} from './portone-browser-sdk.js';
const load=createSandboxSdkLoader({window,document,enabled:true});
const button=document.getElementById('load-sdk'),status=document.getElementById('sdk-status');
button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Loading SDK only. Payment disabled.';
  const result=await load();
  status.textContent=result.status==='loaded'?'Official SDK loaded. Payment remains disabled.':'SDK unavailable. Payment remains disabled. Reload to retry manually.';
});
