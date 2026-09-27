import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {renderApplication} from '../src/application.js';
test('apply is no-JS fail closed and its document has explicit TEST CSP/no-referrer/no-store',async()=>{
 const html=renderApplication({integrated:true});assert.match(html,/<form id="application-form" data-direct-checkout method="dialog">/);assert.match(html,/<button type="submit" disabled>/);assert.doesNotMatch(html,/name="capability"/);
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');const block=headers.split('\n/apply\n')[1]?.split('\n/')[0];assert.ok(block,'apply header block');assert.match(block,/Cache-Control: no-store/);assert.match(block,/Referrer-Policy: no-referrer/);assert.match(block,/https:\/\/cdn.portone.io\/v2\/browser-sdk.js/);assert.doesNotMatch(block,/unsafe-eval|script-src[^;]*unsafe-inline|cloudflareinsights/);
});
