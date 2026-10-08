import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {readFile} from 'node:fs/promises';
test('build bundles official SDK locally and public key config without unresolved npm imports',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,CJY_SUPABASE_PUBLIC_KEY:'sb_publishable_test_build'},stdio:'pipe'});
 const source=await readFile(new URL('../dist/src/supabase-client.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/from ['"]@supabase\//);assert.match(source,/sb_publishable_test_build/);assert.match(source,/signInAnonymously/);
});

test('vanilla build includes project publishable config and cache-busts transport dependencies',async()=>{
 const env={...process.env};delete env.CJY_SUPABASE_PUBLIC_KEY;
 execFileSync(process.execPath,['scripts/build.mjs'],{cwd:new URL('../',import.meta.url),env,stdio:'pipe'});
 const bundle=await readFile(new URL('../dist/src/supabase-client.js',import.meta.url),'utf8');assert.match(bundle,/sb_publishable_[A-Za-z0-9_-]+/);
 const checkout=await readFile(new URL('../dist/src/apply-checkout.js',import.meta.url),'utf8');assert.match(checkout,/supabase-client\.js\?v=[a-f0-9]{12}/);
 for(const module of ['direct-application','order'])assert.match(await readFile(new URL(`../dist/src/${module}.js`,import.meta.url),'utf8'),/apply-checkout\.js\?v=[a-f0-9]{12}/);
});
