# Architecture

## System shape

The Version 2.0 platform is a single React/TypeScript/Vite responsive website and installable PWA for Windows desktop and Android phones. Supabase Auth, PostgreSQL, private Storage and trusted Edge Functions form the authority. Durable PostgreSQL-backed jobs drive scheduled work. This avoids split-service consistency problems while maintaining explicit module boundaries.

```text
React Website/PWA ── authenticated RPC/HTTP ──> Trusted function / SQL transaction
    │                                                  │
    ├─ installable on Windows and Android              ├─ PostgreSQL + RLS
    ├─ safe local drafts + offline state               ├─ private Storage (PDFs/assets)
    └─ WhatsApp/share/call handoff                    └─ durable jobs → manual queue / official provider adapter
```

## Ownership boundaries

| Area | Owns | Must not own |
| --- | --- | --- |
| `src/features/*` | PWA screens, accessible interaction, query state, client validation | Ledger calculations, privilege decisions, bill numbering |
| `src/components/*` | Reusable presentational primitives | Feature workflows or server rules |
| `src/lib/*` | Client adapters, formatting, i18n, typed API transport | Server authority |
| `supabase/functions/*` | Authenticated operations, validation, orchestration | Direct browser-controlled financial decisions |
| database migrations | Constraints, RLS, transactions, ledger projections | UI behavior |
| jobs/adapters | Idempotent scheduling, transport state, retries | Mutable financial business logic |

## Primary modules

- **Identity & access:** profiles, memberships, roles, business context and audit actor.
- **Customers & imports:** customer records, phone normalization, duplicate review, import provenance.
- **Financial engine:** products, immutable accounting entries, bill lifecycle, payment allocation and advances.
- **Documents:** versioned bill and statement templates, embedded Devanagari font, private document references.
- **Messaging:** templates, recipient eligibility, jobs, manual handoff, future official-provider adapter/webhook.
- **Operations:** dashboard projections, reports, delivery planning, backups, exports and owner-visible failures.

## Cross-cutting rules

Every business-owned record carries a server-derived `business_id`; client input never establishes tenancy. Financial commands have a caller-supplied idempotency key. Server transactions write the domain change, ledger effects and audit event atomically. PDFs are rendered from trusted snapshots and stored privately. The service worker caches only shell/static resources; sensitive operational data is not put in public caches.

## Folder map

```text
/
├─ src/                 React website/PWA
├─ android/             Deferred native-client option; not Phase 1 implementation
├─ supabase/            One shared database, RLS, storage and trusted functions
├─ docs/                contracts, mobile design and operating runbooks
└─ tests/               unit, integration and PWA E2E tests
```

See the README/TASKS files in `src/`, `android/`, `supabase/`, and `tests/`. Those files are the module-level contract and should be updated alongside implementation.

