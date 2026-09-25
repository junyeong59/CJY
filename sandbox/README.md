# PortOne SDK inspection (preparation worker)

Local-only preparation, not public checkout. No customer is authorized; engine fixture scope is `portone-sandbox-fixture / offline-integration / text-tts`. Existing intake, design and payment activation flags are untouched. This directory is intentionally outside `src`, `public` and the static build.

Default: `node scripts/serve-portone-sandbox.mjs` prints disabled and opens no listener.
Explicit local SDK-load inspection: `PORTONE_SANDBOX_UI=1 node scripts/serve-portone-sandbox.mjs`, then `http://127.0.0.1:4174/sandbox/portone`. Clicking the button contacts only the documented official CDN. Do not use the ordinary site dev server for this surface. There are no order, webhook or refund routes, no secrets, no payment fields, and no invocation of requestPayment. CSP also blocks connections/frames/forms.

Official source: https://developers.portone.io/sdk/ko/v2-sdk/readme documents `https://cdn.portone.io/v2/browser-sdk.js` and `window.PortOne`. The CDN is versioned by V2, not an immutable patch release. No invented integrity pin or unofficial SDK is used.

Tests: `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node --test tests/portone-sandbox.test.mjs` uses mocked DOM/script events, loopback HTTP and real headless Chrome with the CDN request intercepted by a local SDK mock. No actual CDN execution or provider payment is claimed. The default Playwright Chromium cache is broken (missing framework); the installed Chrome path works. Full server orchestration is blocked on trusted commerce reads, authenticated operator capability, sandbox/onboarding isolation and durable refund effect claim; see engine `docs/portone-sandbox-preparation-evidence.md`.
