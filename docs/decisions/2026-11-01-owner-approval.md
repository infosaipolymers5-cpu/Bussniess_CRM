# Owner Approval — Scope and Controlled Operations

**Date:** 2026-11-01

## Decision

The owner has approved the documented CRM scope, architecture direction, staged execution plan, and the owner-controlled actions described in the work order. Google Antigravity may proceed with implementation in the approved stage sequence, subject to each technical gate and test evidence.

## Approved controlled capabilities

- Owner-only bill cancellation and revised-bill sharing decision.
- Owner control of staff permissions, sensitive configuration, exports, backup/restore and production release.
- Regular/manual WhatsApp workflow with a human review/send action and truthful manual statuses.
- Design and implementation of an official WhatsApp provider adapter, kept disabled until its provider configuration and activation details are supplied.
- A per-business selectable dual-mode communication design: free manual WhatsApp handoff by default, with the official API as an optional configured transport.
- Owner-reviewed campaigns, templates, reminder policies and operational workflows.

## Still-required configuration inputs

Approval does not supply values that must be configured later. Before the related production feature is activated, collect and validate:

- Legal firm details, branding, GSTIN (if applicable), document footer, UPI/bank details.
- Owner-controlled backup destination and retention/cost configuration.
- Official WhatsApp provider account, approved templates, credentials, billing authorization and go-live date.
- Production domain, Supabase/hosting account ownership and supported-device acceptance matrix.

## Execution constraint

Implementation can proceed through stages after their own tests/gates pass. No automatic or paid messaging is enabled merely by this approval; that requires a configured provider and explicit activation change audited in the system.

