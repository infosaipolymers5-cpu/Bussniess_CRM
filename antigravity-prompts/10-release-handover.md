# Antigravity Prompt — Stage 10: Production Release and Handover

Do not start until Stage 9 is explicitly approved. Read `docs/release-tasks.md`, `docs/deployment.md`, `docs/backup-and-restore.md`, `docs/testing-and-acceptance.md`, `WORK_ORDER.md`, and the complete traceability matrix.

Prepare—not silently execute—production release and handover:

- verify owner-controlled production Supabase, hosting/domain, storage, backup and optional messaging accounts; developer access must be scoped/revocable;
- run all quality, migration, RLS, financial, document, messaging, performance and restore evidence against staging;
- validate Windows and Android PWA installation, update/offline behaviour, WhatsApp/share/call handoffs and Marathi/English document print/viewing;
- finalize environment template, deployment/rollback guide, monitoring/incident runbook, backup/restore evidence, data export, source-code handover, staff training material and known limitations;
- produce a final 43-feature acceptance report with evidence links and any remaining release blockers.

Do not activate official paid WhatsApp API or production deployment without explicit owner confirmation of provider/account/cost/go-live. Do not use real customer data in non-production. Do not call the product production-ready until owner signs the acceptance report.

Handoff must list every command/result, deployed version/migration, owner accounts/assets delivered, backup restoration proof, PWA device evidence and explicit owner final sign-off request.

