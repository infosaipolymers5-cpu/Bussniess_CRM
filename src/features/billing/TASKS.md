# Billing Tasks

- [x] Implement Cattle Feed bill draft/review command with item, quantity, rate, paid-now and material-days validation.
- [x] Allocate financial-year bill number in a locked server transaction; use 1 April in configured timezone.
- [x] Atomically post bill, ledger effects, audit event, reminder/material eligibility and document snapshot.
- [x] Implement edit/revision retaining original values and PDF history; never auto-share revision.
- [x] Implement owner-only cancellation with reversal, preserved number and audit reason.
- [x] Test concurrency, repeated commands, year boundary, partial payment, revision and cancellation.

