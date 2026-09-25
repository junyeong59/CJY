import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const files=new Map([
  ['/sandbox/portone',['portone.html','text/html; charset=utf-8']],
  ['/sandbox/portone-browser-sdk.js',['portone-browser-sdk.js','text/javascript; charset=utf-8']],
  ['/sandbox/portone-page.js',['portone-page.js','text/javascript; charset=utf-8']]
]);
export function createPortOneSandboxServer({env={}}={}) {
  if(env.PORTONE_SANDBOX_UI!=='1')return null;
  return createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'; script-src 'self' https://cdn.portone.io/v2/browser-sdk.js; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"};
    const reply=(status,body='',type='text/plain')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(body);};
    if(!/^(127\.0\.0\.1|localhost|\[::1\])(?::[0-9]+)?$/.test(req.headers.host??'')||
      (req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`))return reply(403);
    if(req.method!=='GET')return reply(405);
    const file=files.get(req.url);if(!file)return reply(404);
    try{reply(200,await readFile(new URL('../sandbox/'+file[0],import.meta.url)),file[1]);}catch{reply(503);}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createPortOneSandboxServer({env:process.env});
  if(!server)console.log('portone_sandbox_ui_disabled');
  else server.listen(4174,'127.0.0.1',()=>console.log('SDK inspection only: http://127.0.0.1:4174/sandbox/portone'));
}
