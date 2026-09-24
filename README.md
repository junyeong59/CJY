# CJY Site

Static developer website for `cjy.app`, based on the CJY PAGE Figma frames.

## Routes

- `/` — the public landing page, based on the CJY Figma frame. Product and Pricing use same-page anchors (`/#product`, `/#pricing`), not separate routes.

Music Now routes remain available through direct links, without links from the main or 404 page:

- `/musicnow`
- `/musicnow/privacy`
- `/musicnow/terms`
- `/musicnow/support`
- `/musicnow/join/:code`

`/portfolio` and `/contact` (including trailing slashes) redirect to `/` in the client router. Unknown routes retain the 404 page.

## Commands

```sh
npm run dev
npm run build
npm run og
```

`npm run og` regenerates `public/assets/musicnow-invite-og.png` at 1200x630.

## Deploy Notes

- Replace `appStoreUrl`, `instagramUrl`, and contact emails in `src/config.js`.
- Update `public/.well-known/apple-app-site-association` with the Team ID and bundle ID when Universal Links are ready.
- Review the privacy policy and terms text before App Store submission.

## Service application

`/apply` opens the daily reels service form. Price links use `service=reels` and preselect `plan=Standard|Deluxe|Premium`. The service adds a setup supply amount of 100,000 KRW; monthly supply amounts are Standard 149,000 / Deluxe 599,000 / Premium 999,000 KRW, with 10% VAT. Exact first-month VAT-inclusive totals are 273,900 / 768,900 / 1,208,900 KRW. The 2026-09-23 commercial, payment, and refund conditions are final for PG review, while privacy disclosures remain incomplete. `checkoutEligible` and `paymentLive` are both false; payment activation is blocked until the actual processor recipient/entity, processing country/location, and retention disclosures are confirmed and published. This evidence remains the latest application-consent version and must not be described as launch-ready. The single **신청 접수하기** button therefore still submits an intake request (not a payment) as JSON to the existing Railway `customer-gateway` at `https://customer-gateway-staging.up.railway.app/api/applications`. The server stores a separate **pending-review** application and returns a random receipt. Submission never registers a customer, authorizes paid production, starts a worker, posts content or sends bot messages. Prices are controlled by the server, not the browser.

Deployment order is fail-closed: migration 013 and backend acceptance of the exact current consent evidence must be applied and verified before any frontend deployment using that evidence. A push to GitHub `main` triggers the public cjy.app deployment and must be treated as a release; verify the deployed frontend bytes after rollout. The form explains review/contact data storage and requires consent. Keep the receipt: `/order` remains an explicitly marked demo, not a real application lookup. No applicant data is stored in localStorage or URLs. An opaque idempotency key alone is retained in sessionStorage for safe retries/navigation; where storage is unavailable, retries are protected for the current page lifetime. A changed application after a successful or uncertain submission receives a conflict rather than silently creating a duplicate. Close the tab for a deliberately separate new application after resolving the previous submission.

API errors, rate limits and network failures are displayed without echoing server/request details. Network retries retain the request key. The API conservatively allows 5 new requests per socket identity/hour and 100 globally; Railway proxy users may share a socket bucket. Allowed local development origins are exactly `http://127.0.0.1:4173` and `http://localhost:4173`.

Browser regression tests use isolated headless Chrome with Playwright (no personal browser profile or production requests):

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_PATH=/path/to/chrome node --test tests/application.browser.test.mjs
npm run build
```

On this Mac Playwright is already installed under `/Users/choi/.hermes/hermes-agent/node_modules/playwright/index.mjs`, with Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

Deployment: source/build readiness is not proof the public `cjy.app` frontend has updated. GitHub origin `junyeong59/CJY` auto-deploys `main` to cjy.app; a push is a release and requires the backend-first gate and live frontend verification above. No Vercel project creation or unrelated MusicNow changes are included.
