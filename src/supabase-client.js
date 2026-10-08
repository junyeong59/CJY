import {createClient} from '@supabase/supabase-js';

export const SUPABASE_URL='https://tixshhgyvvfzreefbipm.supabase.co';
// Public publishable/anon key only. Parent supplies this at build time.
const publicKey=typeof __CJY_SUPABASE_PUBLIC_KEY__==='string'?__CJY_SUPABASE_PUBLIC_KEY__:"sb_publishable_Dd09gRA2FyVNpFa0pMuHVw_GuPFZj6F";

export function createApplyApi(client,request=fetch,key=publicKey){
 let signingIn,observedSession=false;
 async function accessToken(){
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(data.session){
   observedSession=true;
   if(!data.session.access_token)throw Error('auth_unavailable');
   return data.session.access_token;
  }
  if(observedSession)throw Error('auth_unavailable');
  signingIn??=client.auth.signInAnonymously();
  const signed=await signingIn;
  if(signed.error)throw signed.error;
  if(!signed.data.session?.access_token)throw Error('auth_unavailable');
  observedSession=true;
  return signed.data.session.access_token;
 }
 return async function(action,body={}){
  const token=await accessToken();
  const response=await request(`${SUPABASE_URL}/functions/v1/cjy-api/${action}`,{
   method:'POST',credentials:'omit',referrerPolicy:'no-referrer',
   headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,apikey:key},
   body:JSON.stringify(body),signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Object.assign(Error('apply_unavailable'),{status:response.status});
  return response.json();
 };
}
let api;
export async function applyApi(action,body={}){
 if(!publicKey)throw Error('supabase_public_key_missing');
 api??=createApplyApi(createClient(SUPABASE_URL,publicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
 return api(action,body);
}
