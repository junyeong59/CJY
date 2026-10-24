import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {LANDING_VISUALS} from '../src/landing-visuals.js';

const root=new URL('../',import.meta.url);
const runtime=`${process.env.HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function startDevServer(t){
 const server=spawn(process.execPath,['scripts/serve.mjs','--port=0'],{cwd:root,stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());
 return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('dev server startup timed out')),15000);
  server.stdout.on('data',data=>{const match=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
  server.on('error',error=>{clearTimeout(timer);reject(error);});
  server.on('exit',code=>{clearTimeout(timer);reject(Error('dev server exited: '+code));});
 });
}

test('real dev server renders original Figma assets; process supports hover, selection, keyboard and mobile',async t=>{
 const base=await startDevServer(t);
 const module=await fetch(base+'/src/supabase-client.js');
 assert.equal(module.status,200);
 assert.equal(/^import\s+[^;]*from\s*['"]@supabase\//m.test(await module.text()),false);
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||runtime);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 t.after(()=>browser.close());
 const screenshots=path.join(tmpdir(),'cjy-figma-preview');await mkdir(screenshots,{recursive:true});
 for(const width of [1920,1440,1024,768,640,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await page.goto(base+'/#process');
  const tabs=page.getByRole('tab');await tabs.first().waitFor();assert.equal(await tabs.count(),5);
  const fullWidth=await page.evaluate(()=>{
   const bounds=selector=>{const box=document.querySelector(selector).getBoundingClientRect();return {left:box.left,right:box.right,width:box.width};};
   return {viewport:innerWidth,main:bounds('.landing-main'),audience:bounds('.landing-audience'),start:bounds('.landing-start'),first:bounds('.feature-art--figma'),reverse:bounds('.feature--reverse .feature-art--figma'),brand:bounds('.landing-brand')};
  });
  for(const region of ['main','audience','start']){assert.ok(Math.abs(fullWidth[region].left)<1&&Math.abs(fullWidth[region].width-fullWidth.viewport)<1,region+' fills the browser width');}
  assert.ok(Math.abs(fullWidth.first.left)<1,'first illustration touches the left edge');
  assert.ok(Math.abs(fullWidth.reverse.right-fullWidth.viewport)<1,'reverse illustration touches the right edge');
  assert.ok(fullWidth.brand.left<=61,'navigation stays near the browser edge');
  if(width>=768){
   const preview=await page.locator('.process-previews').boundingBox();
   const steps=await page.locator('.process-tabs').boundingBox();
   assert.ok(steps.width>=240,'step descriptions have enough reading width');
   assert.ok(preview.width/steps.width<=2,'preview does not dominate the step descriptions');
  }
  for(let index=0;index<5;index++){
   await tabs.nth(index).click();await delay(350);
   const panel=page.getByRole('tabpanel');assert.equal(await panel.count(),1);
   assert.equal(await panel.getAttribute('id'),`process-panel-${index}`);
   await panel.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   assert.equal(await panel.locator('img').evaluateAll(images=>images.every(image=>image.naturalWidth>0)),true);
   // Layer boxes preserve the source scene geometry rather than stretching each element.
   const scene=panel.locator('.figma-scene');
   const size=await scene.boundingBox();assert.ok(Math.abs(size.width/size.height-937/691)<.01);
   if(width===1440){await page.locator('#process').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(screenshots,`process-${index+1}.png`)});}
  }
  await tabs.nth(1).hover();await delay(350);
  assert.equal(await tabs.nth(4).getAttribute('aria-selected'),'true','hover does not change selection');
  assert.ok(Number(await tabs.first().evaluate(el=>getComputedStyle(el).opacity))<.6);
  assert.equal(await tabs.nth(1).evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.mouse.move(0,0);await tabs.nth(4).focus();await page.keyboard.press('ArrowDown');
  assert.equal(await tabs.first().getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');assert.equal(await tabs.nth(4).getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');assert.equal(await tabs.first().getAttribute('aria-selected'),'true');
  await page.locator('.hero-apply').focus();await delay(350);
  assert.equal(await tabs.nth(1).evaluate(el=>getComputedStyle(el).opacity),'1','hover fades reset');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no overflow at ${width}`);
  assert.match(await page.locator('.hero-examples').getAttribute('href'), /^https:\/\/www\.instagram\.com\/cjy\.ai/);
  assert.equal(await page.locator('.hero-examples').getAttribute('target'),'_blank');
  const cards=await page.locator('.feature-art--figma').evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return {width:box.width,height:box.height};}));
  for(const card of cards){assert.ok(Math.abs(card.width-(width>700?width/2:width>600?width:width-24))<1,'feature cards follow the responsive column width');assert.ok(Math.abs(card.width-cards[0].width)<1&&Math.abs(card.height-cards[0].height)<1,'all feature cards have equal dimensions at '+width);}
  // Verify all displayed illustration assets load, including lazy images above the process.
  for(const element of await page.locator('.feature-art--figma').all()){
   await element.scrollIntoViewIfNeeded();
   const box=await element.locator('.figma-scene').boundingBox();assert.ok(Math.abs(box.width/box.height-720/557)<.01,'feature illustration preserves its original ratio');
   await element.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   assert.equal(await element.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),true);
  }
  for(const element of await page.locator('.scroll-reveal').all()){await element.scrollIntoViewIfNeeded();}
  await page.evaluate(()=>scrollTo(0,0));await delay(600);
  if(width===1440||width===768||width===390)await page.screenshot({path:path.join(screenshots,`landing-${width}.png`),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(parseFloat(await tabs.first().evaluate(el=>getComputedStyle(el).transitionDuration))<=.001);
  assert.equal(await page.getByRole('tabpanel').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.deepEqual(errors,[]);await page.close();
 }
 // Every image used in the imported scenes exists locally and is nonempty.
 const assetPaths=new Set(Object.values(LANDING_VISUALS).flatMap(scene=>[...scene.matchAll(/src="([^"]+)"/g)].map(match=>match[1])));
 for(const asset of assetPaths){assert.ok((await stat(new URL('public'+asset,root))).size>0);}
 assert.ok((await readFile(new URL('public/assets/landing-figma/check.svg',root),'utf8')).includes('viewBox="0 0 24 24"'));
 console.log('Screenshots:',screenshots);
});


test('hero glass, circular corners, anchors and clipping survive short windows and live resizing',async t=>{
 const base=await startDevServer(t);
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||runtime);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 t.after(()=>browser.close());
 const page=await browser.newPage();
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const folder=path.join(tmpdir(),'cjy-figma-preview');await mkdir(folder,{recursive:true});
 for(const viewport of [{width:1920,height:800},{width:1440,height:600},{width:1024,height:480},{width:775,height:600},{width:640,height:420},{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(viewport);await page.goto(base+'/');
  await page.locator('.hero-examples > canvas').waitFor();
  const hero=await page.locator('.landing-hero').boundingBox();
  if(viewport.width>=701)assert.ok(hero.y+hero.height<=viewport.height+1,`hero fits short viewport ${JSON.stringify(viewport)}`);
  const card=page.locator('.hero-examples');
  const geometry=await card.evaluate(element=>{
   const box=element.getBoundingClientRect(),image=element.querySelector('canvas').getBoundingClientRect();
   const radii=getComputedStyle(element).borderTopLeftRadius.split(' ').map(parseFloat);
   const label=element.querySelector('span'),style=getComputedStyle(label);
   return {radiusX:radii[0]*box.width/100,radiusY:(radii[1]||radii[0])*box.height/100,width:box.width,height:box.height,imageWidth:image.width,imageHeight:image.height,filter:style.backdropFilter||style.webkitBackdropFilter,shadow:style.boxShadow,labelFits:label.scrollWidth<=label.clientWidth};
  });
  assert.ok(Math.abs(geometry.radiusX-geometry.radiusY)<.2,'card corner is circular, not elliptical');
  assert.ok(Math.abs(geometry.width-geometry.imageWidth)<1&&Math.abs(geometry.height-geometry.imageHeight)<1,'gradient fills the full card');
  if(viewport.width>=1440&&viewport.height>=800){
   assert.ok(geometry.width>=280,'hero example card has sufficient visual weight');
   const copy=await page.locator('.hero-copy').boundingBox(),example=await card.boundingBox();
   assert.ok(example.x-(copy.x+copy.width)<180,'hero composition does not have excessive empty space');
  }
  assert.match(geometry.filter,/blur/);assert.notEqual(geometry.shadow,'none');assert.equal(geometry.labelFits,true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(viewport.width===1440||viewport.width===390)await page.screenshot({path:path.join(folder,`hero-glass-${viewport.width}.png`)});
  await page.locator('.feature-art--figma').nth(1).scrollIntoViewIfNeeded();
  const capsule=await page.locator('[data-node-id="215:939"]').boundingBox();
  const customPanel=await page.locator('.feature-art--custom').boundingBox();
  assert.ok(capsule.x+capsule.width>customPanel.x+customPanel.width,'request capsule intentionally extends beyond the outline card');
  const strips=await page.locator('.feature-art--consistency').evaluate(element=>({panel:element.clientWidth,art:element.querySelector('.figma-scene').getBoundingClientRect().width}));
  assert.ok(Math.abs(strips.panel-strips.art)<1,'edge cards are not cropped in an inner strip');
  // Real navigation/reload must put the heading below the fixed navigation, not under it.
  await page.goto(base+'/#process');await delay(500);
  let header=await page.locator('.landing-header').boundingBox(),heading=await page.locator('#process-title').boundingBox();
  assert.ok(heading.y>=header.y+header.height+8,'anchor heading is not covered by header');
  assert.ok(heading.y<200,'anchor lands at the intended section');
  await page.getByRole('tab').nth(3).click();await delay(350);
  await page.locator('#process').evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
  if(viewport.width>=701&&viewport.height<=760){
   const panels=await page.locator('.process-previews').boundingBox(),tabs=await page.locator('.process-tabs').boundingBox();
   assert.ok(panels.y+panels.height<=viewport.height+1,'selected example fits short screen');
   assert.ok(tabs.y+tabs.height<=viewport.height+1,'all process controls fit short screen');
  }
  if(viewport.width===1440)await page.screenshot({path:path.join(folder,'process-short-window.png')});
  await page.reload();await delay(500);
  header=await page.locator('.landing-header').boundingBox();heading=await page.locator('#process-title').boundingBox();
  assert.ok(heading.y>=header.y+header.height+8&&heading.y<200,'reload preserves correct anchor alignment');
 }
});
