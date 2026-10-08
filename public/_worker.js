// Cloudflare Pages advanced mode; all service API traffic goes directly to
// Supabase Edge Functions with official Auth. Old writable paths stay retired.
const SAFE_HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export default {
 async fetch(request,env){
  const {pathname}=new URL(request.url);
  if(pathname==='/api/test'||pathname.startsWith('/api/test/'))return new Response('{"error":"legacy_api_retired"}',{status:410,headers:SAFE_HEADERS});
  if(pathname==='/api'||pathname.startsWith('/api/'))return new Response('{"error":"not_found"}',{status:404,headers:SAFE_HEADERS});
  return env.ASSETS.fetch(request);
 }
};
