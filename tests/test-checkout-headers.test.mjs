import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Cloudflare Pages matches all rules, joining duplicate headers with commas:
// https://developers.cloudflare.com/pages/configuration/headers/
function effectiveHeaders(text,path) {
 const result={}; let matches=false;
 for(const line of text.split('\n')) {
  if(!line.trim() || line.trimStart().startsWith('#')) continue;
  if(!/^\s/.test(line)) {const rule=line.trim(); matches=rule.endsWith('*')?path.startsWith(rule.slice(0,-1)):path===rule; continue;}
  if(!matches) continue;
  const [,name,value]=line.match(/^\s+([^:]+):\s*(.*)$/); const key=name.toLowerCase();
  result[key]=result[key]?result[key]+', '+value:value;
 }
 return result;
}
const text=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
for(const [path,header,value] of [
 ['/.well-known/apple-app-site-association','content-type','application/json'],
 ['/assets/site.css','cache-control','public, max-age=31536000, immutable'],
 ['/src/site.js','cache-control','public, max-age=0, must-revalidate'],
]) test(`existing header preserved: ${path}`,()=>assert.equal(effectiveHeaders(text,path)[header],value));
for(const path of ['/test/checkout','/test/checkout/','/test/checkout/index.html','/src/test-checkout.js','/src/payment-result.js']) {
 test(`TEST response remains no-store with overlapping Pages rules: ${path}`,()=>{
  const headers=effectiveHeaders(text,path);
  const directives=headers['cache-control'].split(/,\s*/);
  assert.ok(directives.includes('no-store'));
  // RFC 9111 section 5.2.2.5: no-store prohibits storing any response,
  // even when a matching rule also supplies public/max-age=0/revalidation.
  assert.ok(!directives.includes('immutable'));
  assert.ok(!directives.some(d=>/^max-age=/.test(d)&&d!=='max-age=0'));
  if(path.startsWith('/src/')) assert.equal(headers['cache-control'],'public, max-age=0, must-revalidate, no-store');
  else {assert.equal(headers['referrer-policy'],'no-referrer');assert.match(headers['content-security-policy'],/default-src 'none'/);}
 });
}
