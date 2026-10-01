// Cloudflare Pages advanced mode; build.mjs copies this to dist/_worker.js.
// Verified dedicated TEST /readyz; existing customer gateway is not an upstream.
// This pin is source-controlled, never supplied by a request or Pages variable.
const PINNED_TEST_BACKEND_ORIGIN = 'https://cjy-test-checkout-staging.up.railway.app';
const SITE_ORIGIN = 'https://cjy.app';
const LIMIT = 65536;
const APPLY_PATHS = new Set(['session','submit','status','open','verify','orders','new','monthly-recover','monthly-orders','monthly-renew'].map(s=>'/api/test/apply/'+s));
const PATHS = new Set([...APPLY_PATHS,...['open','status','verify','webhook'].map(s=>'/api/test/checkout/'+s)]);
const SAFE_HEADERS = {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=status=>new Response(status===204?null:'{"error":"test_proxy_unavailable"}',{status,headers:SAFE_HEADERS});
async function readBounded(stream,signal){
 if(!stream)return new Uint8Array();
 const reader=stream.getReader(),chunks=[];let size=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};
 signal.addEventListener('abort',abort,{once:true});
 try{
  signal.throwIfAborted();
  for(;;){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.byteLength;if(size>LIMIT){await reader.cancel();throw 413;}chunks.push(value);}
 }finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}return body;
}
// Tests exercise this factory through an in-memory module; only default is a Worker entrypoint.
function createTestProxy(backendOrigin,upstreamFetch=fetch){
 if(backendOrigin!==null){
  const u=new URL(backendOrigin);
  if(u.origin!==backendOrigin||u.protocol!=='https:'||u.port||!/^[-a-z0-9]+\.up\.railway\.app$/.test(u.hostname)||u.hostname.startsWith('customer-gateway-'))throw Error('invalid_test_backend_pin');
 }
 return {async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/test/'))return env.ASSETS.fetch(request);
  if(!PATHS.has(url.pathname)||url.search||url.hash)return reply(404);
  const apply=APPLY_PATHS.has(url.pathname);
  const webhook=url.pathname.endsWith('/webhook');
  if(request.method!=='POST'&&!(request.method==='OPTIONS'&&!webhook))return reply(405);
  if(!webhook&&request.headers.get('origin')!==SITE_ORIGIN)return reply(403);
  if(request.method==='OPTIONS')return reply(204);
  if(!backendOrigin)return reply(503);
  if(request.headers.has('content-encoding'))return reply(415);
  if(Number(request.headers.get('content-length'))>LIMIT)return reply(413);
  const signal=AbortSignal.timeout(10000);
  let body;try{body=await readBounded(request.body,signal);}catch(error){return reply(error===413?413:408);}
  const headers=new Headers();
  for(const name of ['content-type','authorization','origin','webhook-id','webhook-timestamp','webhook-signature'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
  if(apply){
   headers.delete('authorization');
   const incoming=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()),forward=[];
   for(const name of ['__Host-cjy_apply',...(url.pathname==='/api/test/apply/monthly-orders'?['__Host-cjy_monthly']:[])]){
    const cookies=incoming.filter(x=>x.startsWith(name+'='));
    if(cookies.length>1||cookies.some(x=>!new RegExp('^'+name+'=[A-Za-z0-9_-]{43}$').test(x)))return reply(403);
    forward.push(...cookies);
   }
   if(forward.length)headers.set('cookie',forward.join('; '));
  }
  try{
   const upstream=await upstreamFetch(backendOrigin+url.pathname,{method:'POST',headers,body,signal,redirect:'manual',cache:'no-store'});
   if(upstream.status>=300&&upstream.status<400){await upstream.body?.cancel();return reply(502);}
   const responseBody=await readBounded(upstream.body,signal);
   const responseHeaders=new Headers(SAFE_HEADERS);
   const cookie=upstream.headers.get('set-cookie');
   if(['/api/test/apply/session','/api/test/apply/monthly-recover'].includes(url.pathname)&&cookie){
    const pattern=url.pathname.endsWith('/session')?/^__Host-cjy_apply=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800$/:/^__Host-cjy_monthly=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600$/;
    if(upstream.status!==200||!pattern.test(cookie))return reply(502);
    responseHeaders.set('Set-Cookie',cookie);
   }
   return new Response([204,205].includes(upstream.status)?null:responseBody,{status:upstream.status,headers:responseHeaders});
  }catch{return reply(502);}
 }};
}
export default createTestProxy(PINNED_TEST_BACKEND_ORIGIN);
