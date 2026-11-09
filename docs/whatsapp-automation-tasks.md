# WhatsApp Automation Work Package

## Scope and safety boundary

Implement the complete workflow in two selectable transports: **Regular/manual (free handoff)** and **official WhatsApp API**. The manual mode opens a prepared WhatsApp message for the user to send from their own WhatsApp app; it does not automate WhatsApp Web, scrape browser sessions, use unofficial libraries, or claim delivery. The official mode uses an owner-approved API/provider for eligible automated sending and provider-confirmed statuses.

## A. Shared messaging foundation

- [x] Create server-owned `message_templates`, `message_jobs`, `message_attempts`, `campaigns`, `campaign_recipients`, and durable job-run tables with RLS and audit triggers.
- [x] Add an immutable idempotency key unique to message type + customer + business + scheduled occurrence + context (bill/campaign/etc.). Enforce it with a database unique index.
- [x] Implement statuses: `queued`, `awaiting_owner_action`, `prepared`, `opened`, `owner_marked_sent`, `submitted_to_provider`, `sent`, `delivered`, `failed`, `cancelled`, `suppressed`.
- [x] Centralise recipient eligibility: scoped business membership, corrected contact, opt-out policy, Cattle Feed exclusion from PVC promotion, and no duplicate eligible occurrence.
- [x] Audit all template changes, queue generation, manual send marking, suppression, configuration changes, provider submission and webhook outcome.
- [x] Provide owner-visible failed-job/retry state with correlation ID and safe error summary.

**Acceptance:** Unit tests prove duplicate scheduler runs create no duplicate job; integration tests prove opt-out and cross-business exclusion cannot be bypassed by UI input.

## B. Regular/manual WhatsApp mode (launch)

- [x] Generate eligible queues for payment reminders, material-finish reminders, birthdays, festivals, delivery notices and PVC campaigns.
- [x] Render an editable, prefilled message from a trusted server-calculated balance/template snapshot.
- [x] Present recipient review, message preview and WhatsApp deep-link/open action.
- [x] On opening handoff, record `opened`; allow an explicit human-only `owner_marked_sent` action. Never mark `sent` or `delivered` from a handoff.
- [x] Allow cancellation/suppression before send, preserve history, and prevent re-opening an already resolved occurrence unless owner creates a new auditable action.
- [x] Show tap-to-call only as an action, never as evidence of a completed call/message.

**Acceptance:** E2E verifies the correct outstanding amount enters the prepared message, the owner must review it, and opening WhatsApp produces no false delivery state.

**Cost model:** This is the free application-side option: it creates a WhatsApp deep-link/handoff and the owner or staff sends the message manually from their existing WhatsApp account. WhatsApp/provider charges, if any, are outside the application's control. It remains available as the fallback transport.

## C. Official provider path (disabled until configured and activated)

- [x] Define a `MessagingTransport` interface: `prepare`, `submit`, `verifyWebhook`, `normalizeStatus`; provide `ManualHandoffTransport` and an unconfigured provider implementation.
- [x] Keep provider credentials server-only and validate them at function start; no `VITE_*` provider secret.
- [x] Require owner-controlled `automatic_mode_enabled`, approved provider configuration and explicit cost authorization before job submission.
- [x] Implement bounded recipient batches/rate limits, recipient-level outcomes and restart from unresolved recipients only.
- [x] Verify webhook signatures, timestamp/replay protection and provider event deduplication before state transition.
- [x] Map provider results only to provider-supported states and retain raw minimal safe payload/hash for diagnosis.
- [x] Classify retryable vs permanent failures; use bounded retries/backoff and stop on permanent consent/template/contact failures.

**Acceptance:** Integration tests reject invalid webhooks, retry only transient submission failures, and never resubmit a confirmed recipient after batch recovery.

## D. Task-specific automation rules

| Workflow | Trigger | Audience/rule | Stop condition |
| --- | --- | --- | --- |
| Payment reminder | Daily durable job | Eligible outstanding balance; honor promise date and configured interval | Balance cleared/cancelled/suppressed |
| Material-finish | Daily durable job | Cattle Feed bill material date; default five days before finish | Alert occurrence resolved/suppressed |
| Birthday | Daily owner alert/job | Today/upcoming customer; exclude opt-out | One occurrence processed |
| Festival | Owner-created campaign | Selected eligible business audience; exclude opt-out | Campaign complete/cancelled |
| PVC new-item | Owner-created campaign | PVC only; exclude Cattle Feed/opt-out | Recipient resolved/failed permanently |
| Delivery notice | Owner-created request | Requested eligible customer; exclude opt-out | Request resolved/cancelled |

## E. Antigravity implementation sequence

1. Complete database migration and tests for A.
2. Complete server-side eligibility service and test matrix.
3. Implement manual transport and queue APIs.
4. Build each feature UI against those APIs; no direct WhatsApp logic in screens.
5. Add durable scheduled job runner and retry/operational view.
6. Add provider interface/webhook tests but leave automatic dispatch feature-flagged off.
7. Request owner approval before configuring/activating an official provider.

## F. Transport selection requirements

- [x] Add a business-scoped owner setting: `manual_handoff` or `official_api`.
- [x] Default every new business and every missing/invalid configuration to `manual_handoff`.
- [x] Allow the owner to select manual mode for any workflow even after official API configuration exists.
- [x] Reject `official_api` selection until provider credentials, sender identity, approved templates (where required), webhook verification and cost authorization are validated server-side.
- [x] Audit every transport-setting change and show the active transport clearly in queue/campaign review screens.
- [x] If API submission fails permanently or the owner disables API mode, preserve the job outcome and allow an explicit re-preparation in manual handoff mode; never silently send again.

## Version 2.0 workflow-mode requirement

- [x] Store an owner-configured transport mode independently for payment reminders, birthdays, festival wishes, delivery announcements and custom messages.
- [x] Use a seven-day default payment-reminder recurrence (not ten days), with global and customer-specific override rules.
- [x] Personalize custom campaign recipients with their name, support group/single-customer/area targeting, attachments and recipient-level history.
- [x] Cattle Feed new-product launches require explicit owner-selected recipients; never auto-suggest a farmer audience.

