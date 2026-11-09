# CRM Platform v2.0 — Delivery Plan

**Status:** Stage 0 architecture revision in progress. Version 2.0 is the authoritative scope: all 43 listed features are Phase 1. The active clients are the responsive website and installable PWA; native APK/EXE is deferred.

## Delivery rules

- Deliver one tested stage at a time. A stage requires owner approval at its gate.
- Server-side PostgreSQL ledger/accounting logic is authoritative; UI never calculates or asserts financial outcomes.
- Cattle Feed owns billing, customer dues, suppliers, purchasing, costs and profit. PVC does **not** have billing, customer dues, payment reminders or stock management.
- Owner-only supplier, cost, expense and profitability data is hidden and denied at RLS/API level—not merely navigation.
- Manual WhatsApp handoff is free/default. Official API sending is optional, paid, configured per workflow and disabled until separately activated.

## Stage backlog

| Stage | Deliverables | Feature coverage | Gate |
| --- | --- | --- | --- |
| 0 — Architecture | v2 traceability, customer/supplier ledger, cost/profit design, contracts, RLS, decisions | 1–43 planned | Owner architecture approval |
| 1 — Foundation | React/Vite/PWA, Supabase, Auth, business membership, RLS, bilingual design system, CI | cross-cutting | Auth/access tests pass |
| 2 — CRM & marketing foundation | Customers, groups/tags, duplicates, imports/exports, opt-outs, QR sign-up | 1–5, 39, 43 | Customer/group tests pass |
| 3 — Customer financial engine | Products/rates, Cattle Feed bills, customer ledger, payments, advances, revisions/cancellation | 18–27 | Financial/concurrency tests pass |
| 4 — Supplier & cost engine | Supplier records, purchase orders, statuses, supplier ledger/payments, cost snapshots/history | 30–34 | Supplier reconciliation passes |
| 5 — Profit & expense | Expenses, gross/net/expected profit, owner dashboard, privacy/PIN | 35–38 | Worked-example and staff-denial tests pass |
| 6 — Documents | Bills, revised bills, Khate Utara, supplier order/account PDFs, branding, poster export | 7, 8, 11, 20, 27, 31 | Marathi/English/A4 tests pass |
| 7 — Communication | 7-day reminders, material alerts, follow-up, birthday/festival/custom messages, delivery, WhatsApp modes | 6, 12–14, 21–25, 28 | Eligibility/retry/status tests pass |
| 8 — PVC presence | Category cards, private 5k item search, tiller targeting, brands, card/QR, ask quote, posters | 7–10, 40–42 | Public/private and mobile tests pass |
| 9 — Operations | Daily summary, reports, backups/restore, exports, performance/security hardening | 16, 17, 29 | Restore and full acceptance pass |
| 10 — Release | Owner-controlled deployment, PWA tests, training, source/data handover | all | Explicit owner sign-off |

## Immediate architecture tasks

1. Complete updated data model, supplier ledger, cost/profit calculation, contracts and 43-feature traceability.
2. Resolve the actual confirmation event for supplier orders: sent vs received; this determines when payables/costs post.
3. Confirm customer document access method (authenticated portal, OTP or another documented method).
4. Confirm firm branding, business contacts, public card content, logo rights and brand-logo permissions.
5. Confirm backup destination and owner-controlled production accounts.

