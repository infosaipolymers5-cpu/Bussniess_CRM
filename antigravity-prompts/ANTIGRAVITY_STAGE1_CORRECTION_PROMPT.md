# Antigravity Prompt — Correct Stage 1 Gate Gaps

Copy the prompt below into Google Antigravity.

---

Do **not** start Stage 2. Stage 1 has passed browser/build checks but is **not approved** until the security/migration corrections below are complete.

Read first:

1. `docs/stage-1-gate-review.md`
2. `supabase/migrations/00001_identity_access.sql`
3. `supabase/seed.sql`
4. `tests/unit/security/authorization-rls.test.ts`
5. `ANTIGRAVITY_START_PROMPT.md`

## Required corrections

1. **Real RLS integration tests**
   - Replace the TypeScript-only policy simulation as gate evidence with a true local PostgreSQL/Supabase integration suite.
   - Apply the migration to an isolated local test database, use synthetic identities, and execute queries under owner, same-business staff, other-business staff and unaffiliated identities.
   - Assert actual allow/deny behavior for businesses, memberships, permissions and audit events.
   - Add a documented test command to the repository and CI where the runner can support it. If Docker/Supabase CLI is unavailable in CI, separate the required local integration command from the unit command and make CI fail loudly/explicitly when integration infrastructure is intentionally absent—never silently call a simulation “RLS testing.”

2. **Fix recursive membership policies**
   - Policies on `public.business_memberships` must not query the same RLS-protected table recursively.
   - Introduce a narrowly scoped `SECURITY DEFINER` helper function for active membership/ownership lookup (with an explicit safe `search_path` and minimal grants), or another documented and tested non-recursive design.
   - Update all dependent policies to use the safe helper. Test it against actual PostgreSQL.

3. **Protect audit integrity**
   - Remove the policy that currently allows any authenticated user whose `actor_id = auth.uid()` to insert audit records directly.
   - Regular browser users must have no INSERT/UPDATE/DELETE access to `audit_events`.
   - Define the trusted path for audit insertion (server/service role or a carefully restricted database function) and test that ordinary users cannot forge entries.

4. **Make synthetic seeding executable**
   - `profiles` and memberships have foreign keys to `auth.users`; create matching local synthetic auth users before inserting dependent seed data, using a documented local-only strategy.
   - Preserve synthetic-only data and ensure seeds cannot be used against production.
   - Verify a clean local reset/migrate/seed works from an empty database.

5. **Remove false dashboard totals**
   - Replace static `₹0.00` and `0` dashboard values with labelled loading/skeleton/empty presentation until a trusted server summary exists.
   - Do not introduce mock production data or a fake success state.

6. **Clean test warnings**
   - Resolve React `act(...)` warnings in `AppShell.test.tsx`.
   - Expand formatting coverage to repository source, test, config and migration files as appropriate.

7. **Deferred route safety**
   - Make unimplemented feature routes visibly unavailable or omit them from actionable navigation until the corresponding stage begins. Do not make placeholder screens look like completed workflows.

## Completion evidence

Run and report the exact commands/results for:

- formatting check
- lint
- strict typecheck
- unit tests with no React warnings
- real local database migration/seed/RLS integration suite
- production PWA build
- full validation command

Report files changed, remaining external requirements, and request a new Stage 1 gate review. Do not begin Stage 2.

---

