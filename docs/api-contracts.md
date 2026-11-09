# API and Service Contract Outline

The browser calls typed, authenticated server operations. Each operation validates Zod-equivalent schemas server-side, returns a stable success/error envelope, logs a correlation ID, and states idempotency where it mutates state.

| Group | Operations | Transaction / key rule |
| --- | --- | --- |
| Customers | search, create, update, duplicate review, profile | business membership enforced |
| Imports | preview, approve/commit, result export | commit has import batch idempotency key |
| Billing | product CRUD, create, revise, cancel, document preparation | bill allocation and ledger/audit atomic |
| Payments | record, allocate, apply advance | payment idempotency key, atomic allocation |
| Statements | balance, ledger activity, generate PDF, secure download | ledger-derived and access checked |
| Messaging | queue, prepare handoff, owner-mark sent, campaign batches, webhook | occurrence/recipient idempotency key |
| Operations | dashboard, reports, delivery, exports, backups, restore status | owner-only where sensitive |
| Access | member and permission administration | owner-only, auditable |
| Groups/marketing | group/tag CRUD, poster export, public card, QR registration, quote handoff | public endpoint is create-only consented registration |
| Suppliers/purchasing | supplier CRUD, PO draft/send/status, supplier account/payment, history | owner-only; lifecycle command idempotency |
| Profit/expenses | expense CRUD, cost snapshot/report, owner dashboard | owner-only; transaction-derived metrics |

## Error contract

`{ error: { code, message, correlationId, details? } }` is returned for expected errors. Codes include `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_FAILED`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `NOT_FOUND`, `PRECONDITION_FAILED`, and `INTERNAL`. Internal diagnostics remain in structured logs, never in the client response.

