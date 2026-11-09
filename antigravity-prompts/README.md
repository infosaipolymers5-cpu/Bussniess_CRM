# Google Antigravity Stage Prompts

Run prompts strictly in numbered order. Each stage requires the preceding gate’s explicit approval; a passing build alone is not approval. Do not merge or skip stages, and do not implement later-stage features while completing an earlier stage.

| Prompt | Stage | Scope |
| --- | --- | --- |
| `02-crm-foundation.md` | 2 | Customer CRM, groups, imports, opt-outs, QR signup |
| `03-customer-financial-engine.md` | 3 | Cattle Feed products, rates, bills, customer ledger, payments |
| `04-supplier-cost-engine.md` | 4 | Suppliers, purchase orders, supplier ledger, costs |
| `05-profit-expense.md` | 5 | Expenses, profit calculations, owner dashboard/privacy |
| `06-documents.md` | 6 | Bills/statements/PO PDFs, branding, poster export |
| `07-communication.md` | 7 | Reminders, alerts, messages, WhatsApp, delivery |
| `08-pvc-presence.md` | 8 | PVC catalogue, cards, brands, posters, public QR |
| `09-operations-hardening.md` | 9 | Summary, reports, backups, exports, performance/security |
| `10-release-handover.md` | 10 | Production readiness, owner handover and acceptance |

Every prompt assumes the repository documents remain authoritative: `WORK_ORDER.md`, `plan.md`, `docs/architecture.md`, `docs/requirements-traceability.md`, and the relevant folder `TASKS.md` files.

