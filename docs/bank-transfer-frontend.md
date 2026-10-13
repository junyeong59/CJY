# Bank-transfer frontend cutover (2026-10-14)

Base: user UI `9ed8fd39f3503f67a5f624181f969ded64ea7f97`. Latest user steering explicitly requires **no new page**. This change does not deploy, commit, contact live APIs, change prices, redesign the homepage, or modify the backend repository. `src/app.js` and `src/header.js` are unchanged from the pulled user UI.

## Final public flow: saved → bank payment waiting → paid

- `/apply` retains the current form/payment dock, notices and plan prices. The unused PG email field is removed. Save-only remains `save` plus `cjy-draft-2026-10-02` privacy consent and current policy evidence.
- **Saved intake** remains the existing saved view in `/order`: application-continue only. It never displays bank, account, holder, deposit amount, payment order number or instructions, even if stray/forged bank fields are present in the saved DTO.
- `결제하기` calls `bank-transfer` with the same eight application fields, server-issued `draftId`, exact current policy evidence and `{version:'cjy-bank-transfer-2026-10-14',termsRefund:true,privacy:true}`. The backend owns authorization, atomic creation/replay, final price and payment state.
- Successful pending bank purchase redirects to the **existing `/order` page**. Its distinct `결제 대기중` state displays inline deposit instructions only for a real owner-scoped `pending_payment` / `bank_transfer` / `live` order with validated server metadata. Bank, account, holder, VAT-inclusive amount, currency and order number come only from the server's owned-order DTO, never a URL, local storage, plan-price fallback or browser callback.
- `입금 확인 상태 조회` calls owner-scoped `application`, validates the bound bank response, then reloads `orders`. These are read-only customer requests. No payment-confirmation write, SDK load, provider call or automatic polling runs for bank orders.
- Refresh hides old bank instructions while awaiting the fresh result. On an error it keeps instructions hidden and permits an explicit read-only retry.
- Only server-confirmed paid order state changes the existing screen to its original paid view. The existing operator `orderProgressStage` **1/2/3** and refund/exception logic remain unchanged; there is no canonical fourth stage.
- Paid, refunded, partially refunded, held, cancelled, unknown and legacy PG-pending records never display bank instructions. Existing unpaid PG application records stay read-only/held; no automatic bank conversion, `retry-edit`, `open`, `reopen` or `requestPayment` runs there. Historical provider verification remains isolated to old PG records.
- There is **no `/order/payment` route, render function, binding or public link**. `bank-transfer.js` is only a shared validator/inline-details renderer; it creates no page or header.

## Retry and storage

The current server-issued draft UUID is reused for retries. Before a bank mutation, only that UUID is retained under `sessionStorage['cjy-pending-bank-draft']`; unknown outcomes survive reload and resolve the original owned application before considering a newer draft. A validated bank response resolves and clears it. No application text, name, phone, amount or bank DTO is persisted in browser storage or a URL. Official Supabase Auth persistence remains unchanged. Saved restoration still requires fresh purchase consent.

## Exact policy contract (unchanged by routing steering)

New registry plus historical October PG documents/metadata and the prior September documents/evidence are retained. Rates, refund stages/formula, final half-up rounding and legal rights are preserved. PG non-forwarding is scoped to new bank orders; historical PG orders may still use their old processing flow. Supabase region disclosures and unknown recipient/country/retention information are not invented. This is not a legal certification or a declaration that all provider disclosures are complete.

Contract: `/Users/choi/cache/cjy-video-build/bank-transfer/policy-contract.json`; version `2026-10-14`, effective state `effective-bank-transfer-service`.

| Kind | Final canonical SHA-256 |
|---|---|
| terms | `6be7949a500c6e60637dbca627d50d51e044fa835aedd65045037b4c7fbbb72a` |
| privacy | `0bfce66ef62e03780c84745d167b0fbf1959ca7f05361aa59283ee12236adc05` |
| refund | `d134a56e9b8d0fe3673be4a2d5c2b55a44d37444146bd4587052ca6806ab5de6` |

Terms/privacy pins supersede the first draft contract emitted early. Final source/canonicalizer/JSON parity is verified. No policy bytes were changed by the later no-new-page adaptation.

## Verification and limits

- Strict RED→GREEN slices cover the original bank invariants and the later inline-order routing/cache binding and refresh-error retry change.
- **After latest steering:** 47 bank-focused tests pass; 25 additional commercial/build/legacy paid three-stage regression tests pass. Headless Chrome fixtures intercept all Auth/API/network traffic. Built-module checks cover PC/mobile; screenshots and full-length UUID overflow checks cover 320/390/1440.
- Parent's separate real browser→handler→local PostgreSQL acceptance passed at 1440/390: saved has no bank details/order row; purchase shows actual server amount/UUID/beneficiary on the same order page; customer refresh does not mark paid; operator boolean confirmation updates paid/mirror; existing stage2 remains canonical. The recorded results report zero SDK/provider calls and page errors and no overflow. Source: `parent-browser/results.json` in the evidence root. Synthetic local rows were intentionally retained by the parent's guard; no guard was bypassed here.
- The untouched pulled baseline full suite had 162 tests: 144 pass, 17 fail, 1 skip. The full suite immediately **before** no-new-page steering had 199 tests: 182 pass, 16 fail, 1 skip, no timeout/cancellation, concurrency 1. Baseline-name comparison identifies only pre-existing user-UI/copy failures remaining; the old build comparison was corrected. Those full-suite counts must not be presented as a full-suite run of the later inline-order revision. The later revision has the focused/current verification above.
- Older PG browser tests explicitly use archived legacy source/policy fixtures. They prove isolated legacy behavior, not the public bank flow. New bank tests use `bank-browser.mjs` without those overrides.

Evidence root: `/Users/choi/cache/cjy-video-build/bank-transfer/` (source hashes, policy contract, logs, implementation receipt and screenshots). Final current screenshots use `order-pending-*`, `order-saved-*`, `order-paid-*`; earlier `deposit-*` files are historical evidence of the superseded separate-page version. Parent owns settled visual review, actual integration, release approval and deployment.
