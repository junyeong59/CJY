import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
test('public build versions direct application so stale automatic-flow copy is not cached',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'pipe'});
 const built=await readFile(new URL('dist/src/direct-application.js',root));
 const hash=createHash('sha256').update(built).digest('hex').slice(0,12);
 assert.ok((await readFile(new URL('dist/src/application.js',root),'utf8')).includes(`./direct-application.js?v=${hash}`));
 const application=await readFile(new URL('dist/src/application.js',root));
 const appHash=createHash('sha256').update(application).digest('hex').slice(0,12);
 assert.ok((await readFile(new URL('dist/src/app.js',root),'utf8')).includes(`./application.js?v=${appHash}`));
 assert.ok(built.equals(await readFile(new URL('src/direct-application.js',root))));
});
