import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderApplication} from '../src/application.js';
import {renderPolicy} from '../src/policies.js';

// This server is never part of dist. No .env loading, remote API, or secret forwarding.
export function createPortOneReviewServer({env={}}={}) {
  if (env.PORTONE_REVIEW_UI !== '1') return null;
  const required=['PORTONE_TEST_STORE_ID','PORTONE_TEST_CHANNEL_KEY','PORTONE_TEST_PG','PORTONE_TEST_CHANNEL_VERIFIED','PORTONE_TEST_CHANNEL_SOURCE'];
  const missing=required.filter(key=>!env[key]?.trim());
  if(env.PORTONE_TEST_PG!=='inicis_v2'&&!missing.includes('PORTONE_TEST_PG'))missing.push('PORTONE_TEST_PG');
  if(env.PORTONE_TEST_CHANNEL_VERIFIED!=='1'&&!missing.includes('PORTONE_TEST_CHANNEL_VERIFIED'))missing.push('PORTONE_TEST_CHANNEL_VERIFIED');
  const config=missing.length ? {ready:false,missing} : {ready:true,storeId:env.PORTONE_TEST_STORE_ID,channelKey:env.PORTONE_TEST_CHANNEL_KEY,pg:'inicis_v2'};
  const files=new Map([
    ['/src/styles.css',['src/styles.css','text/css']],
    ['/src/commercial.js',['src/commercial.js','text/javascript']],
    ['/src/payment-result.js',['src/payment-result.js','text/javascript']],
    ['/review/checkout.js',['sandbox/review/checkout.js','text/javascript']],
    ['/component/CJY.svg',['component/CJY.svg','image/svg+xml']]
  ]);
  return createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; script-src 'self' https://cdn.portone.io/v2/browser-sdk.js https://cdn.portone.io/drivers/ https://*.inicis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.inicis.com; connect-src 'self' https://cdn.portone.io/drivers/ https://checkout-service.prod.iamport.co https://tx-gateway-service.prod.iamport.co https://payment-bridge.prod.iamport.co https://coretelemetry.prod.iamport.co; frame-src https://service.iamport.kr https://*.inicis.com https://checkout-service.prod.iamport.co; form-action 'self' https://service.iamport.kr https://*.inicis.com; base-uri 'none'; frame-ancestors 'none'"};
    const reply=(status,body='',type='text/plain; charset=utf-8')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(body);};
    if(!/^(127\.0\.0\.1|localhost|\[::1\])(?::[0-9]+)?$/.test(req.headers.host??'') ||
       (req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`))return reply(403);
    if(req.method!=='GET')return reply(405);
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/review/config')return reply(200,JSON.stringify(config),'application/json');
    if(path==='/review/apply')return reply(200,`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CJY 로컬 PG 심사</title><link rel="stylesheet" href="/src/styles.css"></head><body>${renderApplication().replace('<form id="application-form">','<form id="application-form" method="post" action="/review/blocked">').replace('<button type="submit">','<button type="submit" disabled>')}<script type="module" src="/review/checkout.js"></script></body></html>`,'text/html; charset=utf-8');
    if(['/terms','/privacy','/refund'].includes(path))return reply(200,`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CJY 로컬 심사 정책</title><link rel="stylesheet" href="/src/styles.css"></head><body>${renderPolicy(path.slice(1))}</body></html>`,'text/html; charset=utf-8');
    const file=files.get(path);if(!file)return reply(404);
    try {return reply(200,await readFile(new URL('../'+file[0],import.meta.url)),file[1]);}catch{return reply(503);}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createPortOneReviewServer({env:process.env});
  if(!server)console.log('portone_review_disabled');
  else server.listen(4175,'127.0.0.1',()=>console.log('Local PG review only: http://127.0.0.1:4175/review/apply'));
}
