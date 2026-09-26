# CJY local PG review — KG이니시스 V2

## Scope / status

This is an **isolated local review surface**, not production checkout. It reuses `renderApplication()` and `src/styles.css`, with one checkout CTA and an added KG-required email field. The browser never loads production `bindApplication`, sends an intake POST, registers a customer, or starts production/posting. Production `/apply`, `paymentLive: false`, `checkoutEligible: false`, and policy evidence are unchanged. This directory and the review server are not copied by `npm run build`.

**Actual PG window is NOT yet verified.** Names-only discovery found no PortOne process settings or relevant `.env*` settings in the bounded CJY / intake-compat / media-engine locations. Do not use documentation sample identifiers, infer TEST from an identifier's shape, substitute another PG, or mark fixture tests as a real PG result. User selected **KG이니시스 V2**; V1 MID/`IMP.init`/`request_pay` are not used.

## Start locally (default off)

```sh
# Disabled: starts no listener.
node scripts/serve-portone-review.mjs

# Inspect the existing form with checkout safely disabled when settings are missing.
PORTONE_REVIEW_UI=1 node scripts/serve-portone-review.mjs
# Open http://127.0.0.1:4175/review/apply
```

The CLI binds only `127.0.0.1:4175`. Stop with Ctrl-C. Do not expose this server using a public host, tunnel or deployment. Do not use the regular `npm run dev` surface for review checkout. `?review=1` never enables production payments.

### Required settings (names only)

Supply these in the **review server process environment**, using an approved local mechanism outside Git. This server does not auto-load `.env` files. Do not paste actual values into shell transcripts, screenshots, docs, chat, or Git.

| Name | Meaning |
| --- | --- |
| `PORTONE_REVIEW_UI` | Explicit local opt-in (`1`) |
| `PORTONE_TEST_STORE_ID` | Store public identifier associated with the verified TEST channel |
| `PORTONE_TEST_CHANNEL_KEY` | Existing PortOne V2 KG이니시스 TEST channel public identifier |
| `PORTONE_TEST_PG` | Must equal `inicis_v2` (not the V1 integration) |
| `PORTONE_TEST_CHANNEL_VERIFIED` | Set to `1` only after an authorized operator checks the console's TEST designation and V2 PG type |
| `PORTONE_TEST_CHANNEL_SOURCE` | Nonempty private provenance note/reference for that check; never sent to the browser |

The verification switch is an **operator attestation**, not automatic proof from PortOne. A real operator must associate the store/channel with the selected TEST integration; the server cannot establish that without console evidence. No API secret or webhook secret is needed or accepted by the browser configuration endpoint. Only readiness and public store/channel identifiers are sent. Environment values are not logged.

Missing, unverified or wrong-PG configuration keeps checkout disabled and does not load the SDK. Ask for the missing setting names and TEST provenance rather than expanding the backend or trying production credentials.

## Review behavior

1. Use non-customer review information and required consents. Name, phone and email go to the SDK/PG; brief/plan preferences and intake-consent evidence do not go to the intake API. No buyer information is stored in local/session storage or URLs by this page.
2. Click the **single 테스트 결제창 열기** button. SDK loading begins only after valid input and verified configuration. No second payment CTA is added.
3. The official SDK receives `storeId`, `channelKey`, a fresh `cjy-review-<UUID>` payment ID, `CARD`, `KRW`, the selected plan's exact VAT-inclusive first-month price from `src/commercial.js`, and a short ASCII `CJY Reels <plan>` order name. No billing key, recurring payment or automatic production is requested.
4. **Only inspect the PG window and card-company list, then cancel/close it. Never enter card data, authenticate or authorize payment. Even TEST payments can debit real funds.**
5. `FAILURE_TYPE_STOPPED` is shown as cancelled/stopped; other SDK error responses have a generic failure state (some provider cancellation responses may be classified here). Provider messages are never rendered. An exception after a request, an empty response, or even a nominal success is **unverified, NOT paid** and disables repeat submission. There is deliberately no server verification, approval, capture or refund route.
6. On mobile redirection, `redirectUrl` returns to this local origin's `/review/apply`. The same tab's `sessionStorage` holds only payment ID, plan and local phase. Return parameters must match the pending ID, are removed from the address bar, and never establish paid state. The plan is restored but buyer/brief data is not persisted. Unmatched returns are blocked. Reload/back navigation preserves the unresolved hold instead of replaying payment. Browser back with no returned result remains unverified.
7. After a definite cancel/failure, an intentional next attempt gets a new ID; there is no automatic retry. After an unknown outcome, **do not clear storage/reload in a new session to bypass the hold**: ask an authorized operator to inspect the transaction first. This task does not authorize an approval or refund to resolve it.

Name is conservatively checked at 30 UTF-8 bytes; phone and email must be valid nonempty inputs. Order names stay below KG's 40-byte limit. The email is required on both desktop and mobile, satisfying the desktop requirement. Native form submission is disabled before JavaScript starts and its fallback is a blocked local POST, not a PII-bearing GET.

The page retains local `/terms`, `/privacy`, `/refund` links with unchanged `paymentLive` / `checkoutEligible` metadata. The rest of the public site is not exposed by this fixed-allowlist review server.

## Network / browser boundary

CSP allows the official SDK URL and its `/drivers/` scripts/definitions, explicitly named SDK transport origins, `service.iamport.kr`, and HTTPS `*.inicis.com` resources. It does not allow the Railway intake origin, wildcard Internet access, or arbitrary local files. SDK transport hosts containing `prod` are PortOne SDK infrastructure names and are **not evidence that the selected channel is TEST or live**. TEST identity must come from the console provenance above.

PG-specific CSP/localhost acceptance has **not been exercised with a real channel**. If a verified TEST channel fails to open, inspect only safe domain-level CSP diagnostics and the official V2 guide; do not relax to `*`, add a secret, tunnel publicly, or claim success. Actual card-company list and real mobile/desktop PG cancellation remain a follow-up verification gate.

## Verification

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node --test tests/*.test.mjs
npm run build
```

Playwright defaults to the installed module at `/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs`; override `PLAYWRIGHT_MODULE` if needed. Tests launch an isolated headless browser, intercept the SDK with an explicitly synthetic fixture and abort other external traffic. They cover request shape/pricing, validation, cancellation/failure, duplicate submission, SDK failure/timeout, redirect correlation, reload/back holds, local policy links, missing-config and mobile layout. Set `CJY_REVIEW_EVIDENCE_DIR` to save a missing-config screenshot. **These tests are not real PG-window evidence.**

The completed local verification ran 30 tests with 30 passes and a successful build. RED/GREEN logs and screenshots are in `/tmp/cjy-review-evidence/` for this worker run. A separate unmocked official-CDN check loaded the API successfully with no payment request; it does not establish a PG window or card list.

## Official references checked

- [KG이니시스 V2 integration](https://developers.portone.io/opi/ko/integration/pg/v2/inicis-v2): required buyer fullName/phoneNumber and desktop email, V2 channel-based integration.
- [V2 payment request](https://developers.portone.io/sdk/ko/v2-sdk/payment-request?v=v2): payment ID, order-name and full-name limits, `KRW`, `CARD`, `redirectUrl` and response behavior. Some guide snippets use legacy-looking `CURRENCY_KRW`; the current request reference specifies `KRW`, which this implementation uses.
- [Official SDK](https://cdn.portone.io/v2/browser-sdk.js): loaded from this URL only.
- [PG screening](https://help.portone.io/category/procedure/pg-application/screening): review is about the real PG window and card list, not completing a payment. This implementation's mock screenshots cannot satisfy that gate.
