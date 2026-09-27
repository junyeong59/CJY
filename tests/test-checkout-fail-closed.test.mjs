import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// All traffic is fulfilled or aborted locally, including the initial document.
for (const failure of ['disabled', 'module404', 'initialException']) {
 test(`checkout fails closed for ${failure}, click, Enter and native submission`, async t => {
  const {chromium} = await import('/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  t.after(() => browser.close());
  const page = await browser.newPage({javaScriptEnabled:failure !== 'disabled'});
  const origin = 'http://checkout.invalid';
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
  const csp = headers.match(/Content-Security-Policy: (.*)/)[1];
  let loaded = false, requests = 0, navigations = 0, external = 0;
  page.on('framenavigated', () => { if (loaded) navigations++; });
  await page.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (loaded) requests++;
   if (url.origin !== origin) { external++; return route.abort(); }
   if (url.pathname === '/test/checkout/') {
    let html = await readFile(new URL('../public/test/checkout/index.html', import.meta.url), 'utf8');
    // Synthetic prefilled values exercise even restored/autofilled controls.
    for (const [name,value] of Object.entries({capability:'x'.repeat(48),fullName:'TEST',phoneNumber:'01000000000',email:'test@example.invalid'})) html = html.replace(`name="${name}"`, `name="${name}" value="${value}"`);
    html = html.replace('name="consent"', 'name="consent" checked');
    return route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:html});
   }
   if (url.pathname === '/src/test-checkout.js' && failure === 'module404') return route.fulfill({status:404,body:''});
   if (['/src/test-checkout.js','/src/payment-result.js','/src/test-checkout.css'].includes(url.pathname)) {
    let body = await readFile(new URL('..'+url.pathname,import.meta.url),'utf8');
    if (url.pathname === '/src/test-checkout.js' && failure === 'initialException') body = "throw new Error('test initialization failure');\n" + body;
    return route.fulfill({contentType:url.pathname.endsWith('.js')?'text/javascript':'text/css',body});
   }
   return route.abort();
  });
  await page.goto(origin+'/test/checkout/');
  await page.waitForLoadState('networkidle'); loaded = true;
  const button = page.locator('button[type=submit]');
  const box = await button.boundingBox(); await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.locator('[name=email]').evaluate(el => el.focus()); await page.keyboard.press('Enter');
  // A direct native submission must also be inert, not merely use POST.
  await page.evaluate(() => document.querySelector('form').submit());
  await page.waitForTimeout(150);
  assert.equal(requests,0,'no request after failed initialization');
  assert.equal(navigations,0,'no navigation after failed initialization');
  assert.equal(external,0);
  assert.equal(await button.isDisabled(),true);
  assert.equal(await page.locator('[name=capability]').isDisabled(),true);
  assert.equal(page.url(),origin+'/test/checkout/');
 });
}
