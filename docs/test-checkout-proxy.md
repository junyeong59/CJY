# TEST-only same-origin API proxy

The live GitHub `Cloudflare Pages` check identifies Pages project `cjy`. The local build is `npm run build` → `scripts/build.mjs` → `public/*` copied to `dist/`. This change uses Pages **advanced mode**, not unsupported external `_redirects` rewrites. It needs no additional service/subscription.

## Artifact and scope

- `public/_worker.js` → `dist/_worker.js`: default Worker handler only.
- `public/_routes.json` → `dist/_routes.json`: invokes the Worker only for `/api/test/*`; `/apply` and checkout HTML remain static assets with existing `_headers`.
- Exactly four POST paths: `/api/test/checkout/{open,status,verify,webhook}`. Queries and other TEST paths are rejected. Same-origin OPTIONS is handled for browser endpoints only.
- Browser endpoints require exact `Origin: https://cjy.app`; webhooks retain backend signature verification. No new payment authority or proxy-side success inference.
- Authorization, Origin, Content-Type, webhook-id/timestamp/signature are forwarded. Raw body bytes are unchanged. Cookies, forwarding headers, response cookies/redirects are not propagated.
- Request and response bodies are each bounded to 65,536 bytes. Body/egress deadline is 10 seconds. Redirects are never followed; retries are never attempted. All API results are no-store and errors are opaque. No request/secret logging is added.

## Verified dedicated backend pin

`PINNED_TEST_BACKEND_ORIGIN` is `https://cjy-test-checkout-staging.up.railway.app`. Its actual HTTPS `/readyz` returned HTTP 200 with `test_checkout_ready` on 2026-09-27; unauthenticated status and unsigned webhook return 403/no-store. Railway deployment `4f6d852e-cb0d-43b4-a069-4d8e2b6df9e5` is SUCCESS. This is a new dedicated service, not the customer gateway. A request or Pages variable cannot replace the pin. A null pin still fails closed in tests.

The regex validator is configuration hygiene, not a request-driven hostname allowlist. At runtime only the one source-pinned origin can be reached. Synthetic tests change the pin in memory only and intercept all egress.

## Verification

```sh
node --test tests/test-checkout-proxy.test.mjs
MINIFLARE_MODULE=/absolute/path/to/miniflare/dist/src/index.js node --test tests/test-checkout-proxy-runtime.test.mjs
npm run build
wrangler pages dev dist --ip 127.0.0.1 --port 0 --inspector-port 0 --compatibility-date 2026-09-26
```

Wrangler 4.141.0 and its workerd were exercised locally. Tools are installed outside this repo at `/Users/choi/.hermes/cache/cjy-proxy-tools`; no package manifest/lockfile change is needed. The production Pages compatibility/build settings are not authenticated/read back yet; verify support for fetch `cache: no-store` before release (the tested compatibility date is 2026-09-26). Node-only tests cannot prove Worker compatibility.

Parent owns the scoped 14-file commit/push; the Worker owns operations and verification. `origin/main` was freshly fetched and is an ancestor of local HEAD (no reset/pull is needed). Backend/015/TEST pins/exact-receipt precheckout policy are actually installed. An actual verify-full Mac LISTEN transport is managed with a bounded lifecycle; no invitation or payment has been created yet. Public cjy.app still needs the scoped Pages commit/push and live byte/API readback. The direct Wrangler route freshly reported unauthenticated; do not require a user login if the existing GitHub autodeploy route is used. After the public raw-byte proxy is verified, request only the V2 TEST webhook registration and the user's one manual TEST payment. See `/Users/choi/.hermes/cache/cjy-official-v2-rollout.md` and `cjy-official-final-evidence.json` for current receipts and exact hashes.
