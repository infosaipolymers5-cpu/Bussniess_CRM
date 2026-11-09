# Rushi CRM

Production-oriented Cattle Feed and PVC business-management platform: CRM, billing, supplier purchasing, profit analytics, documents and WhatsApp workflows. Version 2.0 defines 43 Phase 1 features delivered as a React website and installable PWA.

This repository currently contains Stage 0 architecture and planning artifacts only. Read [the delivery plan](plan.md) before implementation.

For Google Antigravity, use the copy-ready [Stage 1 kickoff prompt](ANTIGRAVITY_START_PROMPT.md) rather than asking it to generate the entire application at once.

Stage 1 is under gate review. Before approving it or beginning Stage 2, use the [Stage 1 correction prompt](ANTIGRAVITY_STAGE1_CORRECTION_PROMPT.md) and satisfy the executable RLS/migration evidence in [the gate review](docs/stage-1-gate-review.md).

Once a stage is approved, use the matching copy-ready file in [antigravity-prompts](antigravity-prompts/README.md) for the next stage.

## Architecture documents

- `docs/architecture.md` — module boundaries and runtime design
- `docs/data-model.md` and `docs/financial-ledger.md` — authoritative PostgreSQL model and accounting rules
- `docs/api-contracts.md` — trusted-operation contract outline
- `docs/authorization-matrix.md` — role model and RLS strategy
- `docs/requirements-traceability.md` — feature-to-module/backlog mapping
- `docs/deployment.md` and `docs/backup-and-restore.md` — operating design

## Intended structure

`src/` holds the untrusted React website/PWA; `supabase/` holds versioned migrations and trusted server functions; `tests/` holds unit, integration and E2E tests. Native Android is explicitly deferred by the Version 2.0 requirements; see `android/README.md`. Folder README/TASKS files state each module's ownership boundary before code is added.

