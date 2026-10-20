# Landing and policy release — 2026-10-21

The public landing page now uses responsive Figma-derived artwork, accessible role
buttons and a circular card slider, typed requests, a procedural gradient with
pointer interaction, and scroll reveals. The examples link opens CJY's Instagram.
Current policy wording is customer-facing; commercial terms are unchanged.

## Backend-first policy compatibility

Before releasing the frontend, applied Supabase migration
`accept_oct21_customer_policy_copy` and deployed `cjy-api` version 11.
`bank-policy.sql` adds the exact October 21 policy snapshot to the existing
bank-order check. `bank_transfer.ts` is the deployed shared policy validator.
Both layers continue accepting the October 19 snapshot for rollout compatibility.
Existing order records, immutable snapshots, prices, authentication, and beneficiary
information are unchanged. Other Edge Function source files are unchanged.

Readback confirmed the database function and deployed Edge Function contain both
policy snapshots. The frontend's current exact hashes are in `POLICY_METADATA`.

## Validation

Build and 23 focused build, pricing, quantity, policy, and consent tests pass.
Broader legacy tests still include obsolete monthly/pilot copy assertions and a
missing optional Miniflare dependency; these are outside this landing release.
Browser regression covers responsive layout, original illustration assets,
process selection/hover/keyboard, anchors, glass styling and reduced motion.
