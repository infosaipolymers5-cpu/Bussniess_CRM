# Antigravity Prompt — Stage 3: Cattle Feed Customer Financial Engine

Do not start until Stage 2 is explicitly approved. Read `docs/financial-ledger.md`, `docs/api-contracts.md`, `docs/pdf-specification.md`, and TASKS for `products`, `rates`, `billing`, `payments`, `reminders`, `material-alerts`, `account-statements`, and `audit`.

Implement only Features 18–27:

- Cattle Feed product catalogue, active/hidden status, rate history, customer-specific price, discount and bill-line rate override;
- transactional commercial bill creation with immutable product/rate/cost placeholders, financial-year `CF/YY-YY/NNNN` sequence and idempotency;
- customer ledger, partial payments oldest-unpaid allocation, advance credits/application, edits/revisions/cancellations with audit and reversals;
- bill-save dependent effects in one transaction: due, ledger, material profile/alert, 7-day reminder eligibility, document request/snapshot and future cost hook;
- material duration suggestion/override and replacement of old active alert;
- seven-day default payment reminder rule, promise-to-pay, called/defer/stop audit state;
- ledger-backed Khate Utara data API (PDF rendering waits for Stage 6).

PVC must never get bills, dues, payments or reminders. No supplier/purchase/profit UI yet.

Required tests: concurrent bill numbering; retry idempotency; April 1 boundary; money rounding; partial/excess/advance; revision/cancellation; allocation and statement opening/closing reconciliation; material replacement; 7-day recurrence/stop; staff cannot cancel; actual RLS/database tests. Financial commands must be transactional and server authoritative.

Run full validation plus financial integration/concurrency tests and E2E bill→partial payment→statement data flow. Request Stage 3 gate only after evidence; do not start Stage 4.

