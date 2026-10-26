# Production-only content and policy release — 2026-10-26

Removed automatic publishing choices from Apply and updated landing/process copy
and chat illustration text to describe content production and delivery only.
The chat bubble keeps its position and width, with a shorter height.
Terms and privacy wording no longer offer automatic publishing or list publishing
preferences and account-use selections as collected application information.
Historical policy documents and existing order snapshots remain unchanged.

## Backend-first rollout

Applied `accept_oct26_production_only_policy_copy` to the CJY Supabase project
and deployed `cjy-api` version 15. Readback confirms the database and Edge Function
accept the exact current frontend policy hashes, retaining October 19 and the
previous October 21 evidence for compatibility. Authentication settings and all
other deployed function sources are unchanged.

`bank-policy.sql` is the idempotent applied SQL patch. The exact deployed shared
policy validator is `supabase/functions/_shared/bank_transfer.ts`.

Validation: 14 focused policy, quantity, and cinematic API tests passed;
`npm run build` and `git diff --check` passed. Frontend main push follows backend
readback verification; public deployed bytes must match local policy hashes.
