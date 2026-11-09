# Antigravity Kickoff Prompt — Stage 1 Foundation

Copy everything below into Google Antigravity at the repository root.

---

You are the implementation engineer for **Rushi CRM Platform v2.0**. Work only in this repository. The repository’s Markdown files are the system-design authority; do not replace their architecture, silently reduce scope, or generate the full application in one change.

## Read first

1. `README.md`
2. `WORK_ORDER.md`
3. `plan.md`
4. `docs/architecture.md`
5. `docs/authorization-matrix.md`
6. `docs/data-model.md`
7. `docs/frontend-ui-ux-tasks.md`
8. `src/app/TASKS.md`
9. `src/components/TASKS.md`
10. `src/lib/TASKS.md`
11. `supabase/TASKS.md`
12. `supabase/functions/TASKS.md`
13. `tests/TASKS.md`

## Current objective — Stage 1 only

Build the working foundation for the responsive React website and installable PWA. Do **not** implement customers, billing, supplier purchasing, profit calculations, posters, public QR flows, WhatsApp campaigns, backups, or production deployment in this change.

Native Android/Android Studio is deferred. The active mobile application is the installed Android PWA.

## Required Stage 1 deliverables

1. Bootstrap a React + TypeScript + Vite application in strict mode.
2. Configure Tailwind CSS, linting, formatting, type checking, Vitest/React Testing Library, Playwright and a committed lockfile.
3. Create a validated `.env.example` containing names only—never real secrets.
4. Configure Supabase project structure, versioned initial migrations and synthetic development seed data only.
5. Implement the first identity/access schema: businesses, user profiles, business memberships, owner/staff roles, permissions and audit-event envelope.
6. Enable RLS on application tables and create tests for owner, authorized staff, staff from another business and unaffiliated user.
7. Implement browser-safe Supabase Auth session handling and responsive protected routes.
8. Build original responsive PWA app shell: desktop sidebar, top bar, mobile navigation, active-business selector, language selector, user menu, offline state and accessible loading/error patterns.
9. Add English and Marathi translation framework; do not scatter user-visible production strings in components.
10. Add basic design tokens and accessible shared primitives following `docs/frontend-ui-ux-tasks.md`. The supplied dashboard screenshot is inspiration only; do not copy its brand/content/assets.
11. Configure PWA manifest, icons placeholders clearly labelled for replacement, controlled service-worker update behavior, and shell/static-only caching. Do not cache sensitive customer or financial records.
12. Add CI workflow running format check, lint, typecheck, unit tests, migration validation and production build.
13. Update documentation/checklists only for completed, test-backed work.

## Mandatory engineering rules

- Supabase/PostgreSQL/trusted server functions are the authority. Never place service-role keys, provider credentials or database secrets in browser code.
- Do not create mock financial totals, fake success notifications, static production data, or buttons without implemented behavior.
- Financial/server mutations must wait for confirmed response; no optimistic claim of saved data.
- RLS and trusted permission checks are required; hidden UI is not authorization.
- Use only synthetic seed data. Do not add real customer or business data.
- Preserve Cattle Feed/PVC business separation. Supplier/cost/profit data is owner-only by design.
- Keep the app mobile-first and keyboard-accessible. Show status with text/icons as well as colour.
- Use the configured business timezone (`Asia/Kolkata`) for future date-dependent boundaries; do not hardcode browser-local assumptions.

## Completion evidence required

Before stopping, run and report the exact commands and results for:

- formatting check
- lint
- TypeScript typecheck
- unit tests
- migration/RLS tests
- production build

Demonstrate with tests that:

1. An owner can access their own business scope.
2. Authorized staff access only permitted business data.
3. A staff member from another business is denied.
4. An unaffiliated user is denied.
5. The shell works at desktop and narrow mobile width.
6. The PWA offline indicator appears without claiming a financial write was saved.

## Handoff format

At the end, provide:

- files created/changed;
- commands run and results;
- any blocked external configuration (Supabase project URL/keys, domain, icon assets);
- deviations or decisions requiring architect/owner approval;
- confirmation that Stage 1 gate is ready for review, not automatically approved.

Do not start Stage 2 until the Stage 1 gate is explicitly approved.

---

