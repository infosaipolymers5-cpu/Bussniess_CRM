# Antigravity Prompt — Stage 2: CRM and Marketing Foundation

Do not start until Stage 1 correction work and its gate are explicitly approved. Read `WORK_ORDER.md`, `plan.md`, `docs/data-model.md`, `docs/authorization-matrix.md`, `docs/requirements-traceability.md`, and `src/features/{customers,customer-groups,imports,qr-registration}/TASKS.md`.

Implement only Features 1–5, 39 and 43:

- business-scoped customer records; search/filter by name, phone, business, area, group and tag;
- multi-group membership, tags and auditable changes;
- normalized-phone duplicate warning/review, never automatic merge;
- CSV/XLSX import preview, validation, default duplicate Skip, explicit approved commit and export; imported Cattle Feed due becomes exactly one Opening Balance entry—PVC never receives customer due;
- owner-controlled opt-out/preferences/consent;
- PVC three-field quick-add;
- public QR registration with consent, validation, duplicate review and no internal data exposure.

Rules: server validates business scope; RLS and trusted functions enforce it; no fabricated history; public QR endpoint is create-only/rate-limited; all mutations audit actor/correlation data. Do not implement bills, payments, reminders, messages, supplier or profit work.

Required tests: actual database/RLS cross-business denial; duplicate normalization; group/tag assignment audit; valid/invalid import preview; approved commit idempotency; no partial invisible import; one opening balance only; PVC due prohibition; public QR privacy/consent/duplicate flow; responsive customer quick-add.

Before handoff run formatting, lint, typecheck, unit, real DB integration/RLS tests, E2E customer/import/QR flow and build. Report changed files, commands/results, migration effects and unresolved decisions. Request the Stage 2 gate; do not start Stage 3.

