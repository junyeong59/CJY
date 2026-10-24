# Cinematic applications — 2026-10-25 (Asia/Seoul)

The landing page now has three per-item reel cards and a full-width cinematic consultation banner. Product illustration panels, price cards, and application inputs use transparent backgrounds with outline borders.

`/apply?service=cinematic&plan=Cinematic` preselects 시네마틱 광고. The stored identifiers are `service=cinematic`, `plan=Cinematic`, `quantity=1`; automatic posting is off and delivery is manual. Quantity, automatic-posting settings, and price/VAT/total rows are hidden. The submit button says 신청하기.

- Save calls `save` with the existing draft privacy consent; the result remains an editable draft.
- Submit calls `cinematic-submit` with `cjy-cinematic-2026-10-25` terms/refund and privacy consent. The existing application table stores the snapshot and consent history as submitted. No payment order or price is created.
- Success opens `/order?draftId=<opaque draft UUID>` with 신청 완료, the server receipt, 신청 내용 보기, and 문의하기. The owner-scoped API supplies the content. Submitted cinematic forms are read-only.
- Unknown network results preserve only the draft UUID in session storage; reloading resolves the original request. Identical retries return the same receipt; changed replays and other owners are rejected.

## Supabase

Project `tixshhgyvvfzreefbipm`: the `cinematic_applications` migration and `cjy-api` version 14 were applied. Edge Function files were read back and matched the local source exactly. This repository now retains the deployed source under `supabase/functions/` and the incremental migration under `supabase/migrations/`. The migration assumes the pre-existing CJY schema and is not a standalone database bootstrap.

Existing RLS and server-only function grants remain in place. The new RPC is SECURITY INVOKER and executable only by service_role. It reuses the existing owner-scoped application command, serializes by draft UUID, rejects existing payment orders, and prevents changes to submitted cinematic snapshots. The browser cannot invoke it directly.

## Verification

API tests cover saved/submitted DTOs, product/plan/quantity validation, policy and consent rejection, authentication, and rejection on the bank-payment route. A rolled-back transaction on the actual DB verified save → submit → replay, same receipt, one application, zero payment orders, owner rejection, changed replay rejection, generic-save immutability, bank rejection, and unchanged reel pricing. Synthetic test rows were rolled back.

Browser tests intercept all Auth/API requests. They cover desktop/mobile outlines and overflow, saving/restoring, completion and read-only review, network errors, reload recovery, and existing bank flows. Build and focused tests pass. Screenshots are in `output/cinematic-ui/`. Existing tests were updated for the requested pricing UI, an already-present quantity payload field, the order ID's actual heading location, and portable screenshot paths.

The public frontend has not been pushed or deployed by this task. `npm run build` prepares the updated site in `dist/`; the Supabase backend is already active. No real customer application or payment was submitted for testing.

## Operator consultations — 2026-10-25

The `cinematic_operator_consultations` migration now mirrors submitted cinematic applications into `cjy_operator_orders` automatically. `entry_kind=consultation`, `status=상담 대기`, and `order_progress_stage=0` identify a consultation. `amount`, `paid_at`, `verified_at`, and `order_id` are NULL; paid/refunded amounts remain zero. No payment order is fabricated. Drafts stay out of the operator list. Existing submitted requests were backfilled without replaying insert webhooks.

`entry_id` is now the operator table's generated primary key: the real order UUID for a payment entry, or the application UUID for a consultation. Existing payment `order_id` values, their unique constraint, and their foreign key remain intact. Consumers handling consultations must use `entry_id` or `application_id` for identity because `order_id` is absent. RLS and operator-reader access are unchanged. Existing insert automation remains enabled for new submissions; this change does not modify external Make/Notion mappings or filters.

The existing progress-edit trigger excludes the generated key from BEFORE-trigger comparisons so paid-order progress writeback remains valid; a consultation cannot be promoted into paid production by changing its stage. The new source trigger has no direct client execution privileges.

`tests/sql/cinematic-operator-orders.sql` ran on the real database inside a rolled-back transaction with the insert webhook disabled for the test only. It verified draft exclusion, consultation fields, idempotent replay, no payment order, owner rejection, consultation stage rejection, bank-order confirmation/mirroring, forward progress writeback, and regression rejection. Trigger state and RLS were checked afterward. No synthetic entries were retained.

Local preview was restarted on `http://127.0.0.1:4174/` because 4173 was already occupied. The server is a local preview, not a public deployment.

## Responsive spacing follow-up

Price-card typography and vertical spacing now scale with the card's content width; scoped paragraph margins prevent the landing paragraph reset from collapsing the price spacing. The VAT note is centered immediately below the purchase button. Narrow layouts stack comparison cards rather than compressing three columns. The second product panel no longer includes its obsolete SVG background, while its original one-line typing capsule intentionally extends past the panel’s right edge and is clipped there.

Cinematic checkout reserves the original total's invisible grid track and places actions in the same columns as the reel form; viewport tests compare both button bounding boxes at 320/390/800/1440. No stored pricing, application or payment logic changed in this follow-up.
