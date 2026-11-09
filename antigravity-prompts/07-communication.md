# Antigravity Prompt — Stage 7: Communication, Reminders and Delivery

Do not start until Stage 6 is explicitly approved. Read `docs/whatsapp-automation-tasks.md`, `docs/financial-ledger.md`, and TASKS for `reminders`, `material-alerts`, `birthdays`, `festivals`, `messaging`, `broadcasts`, and `delivery-trips`.

Implement Features 6, 12–14, 21–25 and 28:

- durable, idempotent jobs for 7-day payment reminders, material alerts, birthdays, festival/custom campaigns and delivery trips;
- customer follow-up actions: call note, promise date, called, defer 3/7 days and audited stop without changing debt;
- personalized custom messages by group/customer/area with attachment, template, preview, small batches and recipient history;
- delivery trips, recipient untick, delivery request/load list without automatic bill;
- regular/manual WhatsApp as default free handoff, accurate `prepared/opened/owner_marked_sent` states only;
- optional official provider adapter, disabled until owner configures per-workflow mode, credentials/templates/cost approval and webhook verification;
- explicit owner-selected Cattle Feed new-product audiences; never auto-target farmers.

Centralize opt-out: suppress promotional/custom/birthday/festival/delivery messages; payment reminders and bills follow approved policy. PVC has no payment reminders. Do not automate WhatsApp Web or falsely claim sent/delivered.

Test scheduling retries, idempotency, suppression, business restriction, provider signature/replay, batch recovery, promise date, settlement stop, manual-status truthfulness and owner/staff permissions. Run integration/E2E evidence and request Stage 7 gate.

