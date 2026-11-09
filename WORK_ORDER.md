# Google Antigravity Work Order

This repository is the system-design authority. Google Antigravity is the implementation environment. Execute only the next approved task; do not invent scope, substitute mock behavior, or skip an acceptance check.

## Operating protocol

1. Read this file, `plan.md`, relevant `docs/`, and the target folder's `TASKS.md`.
2. Implement one numbered task in a small reviewable change.
3. Add/adjust the required automated tests in the same change.
4. Run the folder task's verification commands; record results in the PR/change description.
5. Update the checklist item from `[ ]` to `[x]` only after evidence exists.
6. Stop at a stage gate and request architect/owner approval before the next stage.

## Non-negotiable implementation constraints

- The database/server is authoritative for customer/supplier money, costs, profit, permission, bills, reminders and message eligibility.
- Every financial or scheduled-message command is validated, transactional where applicable, audited and idempotent.
- Support both WhatsApp modes: free reviewed manual handoff by default, and an official API transport only after owner configuration. Do not claim provider delivery for manual handoff.
- Do not use real customer data or browser-exposed service secrets.
- Keep all user-visible strings in translation resources; Marathi PDFs use an embedded licensed Devanagari font.

## Execution order

| Order | Work package | Folder task file | Gate |
| --- | --- | --- | --- |
| 1 | Foundation | `src/app/TASKS.md`, `supabase/TASKS.md` | Auth/RLS tests |
| 1a | Frontend system | `docs/frontend-ui-ux-tasks.md`, `src/app/TASKS.md`, `src/components/TASKS.md` | Responsive/accessibility checks |
| 2 | CRM | customers, groups, imports, QR task files | Customer/group tests |
| 3 | Customer finance | billing, payments, rates, reminders task files | Ledger/concurrency tests |
| 4 | Supplier/cost | supplier, purchase-order, supplier-account task files | Supplier reconciliation |
| 5 | Profit/expense | profitability and expense task files | Worked financial example |
| 6 | Documents | statement, billing, purchase-order, poster task files | PDF acceptance |
| 7 | WhatsApp & engagement | `docs/whatsapp-automation-tasks.md`, feature task files | Messaging policy/retry tests |
| 8 | PVC public presence | pvc catalogue, card, brand, QR task files | Public/private boundary |
| 9 | Operations/release | dashboard/reports/backups and `docs/release-tasks.md` | Restore/full acceptance |

## Required external approvals before affected work

- Owner provides firm identity, logo, document/footer text, optional GSTIN and UPI/bank details before final PDFs.
- Owner selects and controls backup destination before backup implementation.
- Owner explicitly approves a WhatsApp Business provider, templates, cost and go-live before any automatic sending is enabled.

## Approval record

The owner approved the prior scope and controlled-operation model on 2026-11-01. Version 2.0 expands scope to 43 features and requires a renewed Stage 0 architecture/traceability approval before implementation. It does not create missing provider accounts, credentials or legal business configuration.

