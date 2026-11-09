# Testing and Acceptance

## Required suites

- **Unit:** money handling, allocation order, advances, cancellations, bill-year boundary, message eligibility/idempotency, opt-outs, dates and translations.
- **Integration:** PostgreSQL transactions, duplicate/repeated commands, concurrent bill numbers, RLS, bill version retention, job retry, webhook deduplication, backup artifacts and restore reconciliation.
- **E2E:** owner/staff flows covering customer, bill, partial payment, Khate Utara, revision, cancellation, import opening balance, advance, manual WhatsApp, opt-out, delivery, authorization, Marathi PDF and restore.
- **Document:** layout overflow, embedded fonts, page headers/numbers, long names/descriptions, balances, cancelled/revised bill, device viewers and physical A4 print.

## Acceptance evidence

Each stage gate requires automated results plus a short demonstration using synthetic staging data. Final production acceptance requires all 28 feature criteria, backup restore evidence, supported-device PWA installation, owner training, source-code/data-export handover and recorded owner approval.

