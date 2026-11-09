# Antigravity Prompt — Stage 9: Operations, Reports, Backup and Hardening

Do not start until Stage 8 is explicitly approved. Read `docs/backup-and-restore.md`, `docs/deployment.md`, `docs/testing-and-acceptance.md`, `docs/requirements-traceability.md`, and TASKS for `dashboard`, `reports`, and `backups`.

Implement/complete Features 16, 17 and 29 plus release-hardening:

- authoritative daily summary; owner sees private profit summary, staff does not;
- overdue, sales, collections, business-wise and combined reports with secure Excel/PDF exports; sales never equals collections;
- verified daily database + private-object backup, 30 daily/12 monthly retention, encryption/access, independent destination where feasible, failed-job visibility and monthly owner backup OK only after verification;
- isolated restore workflow and reconciliation of customer/supplier ledgers, bills, purchases, cost/profit, documents, settings/templates, messages and audit history;
- full data export/source-code handover runbooks, performance for thousands of customers/5k items, threat/security tests and observability.

Do not claim backup success because a scheduler ran—require usable verified artifacts. Do not delete the last verified recovery point.

Required evidence: report-ledger reconciliation, owner/staff report denial, backup artifact checksum/count, isolated restoration, retention test, export test, performance results, security/RLS suite, 43-feature traceability completion. Request Stage 9 gate only with evidence.

