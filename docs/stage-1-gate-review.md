# Stage 1 Gate Review — 2026-11-08

## Verified pass evidence

The local `npm run validate` command completed successfully: Prettier, ESLint, strict TypeScript, 46 Vitest tests and production PWA build all passed. The build has a non-blocking 549 kB entry-chunk warning. The unit suite currently emits React `act(...)` warnings that should be corrected.

## Gate decision: not approved yet

The Stage 1 authorization gate requires executable database/RLS proof. The current `authorization-rls.test.ts` is a TypeScript simulation of intended SQL policy conditions; it does not apply the migration to PostgreSQL or execute as the four authenticated identities. It cannot prove RLS enforcement.

## Required corrections

1. Replace self-referential `business_memberships` RLS policy queries with secure, `SECURITY DEFINER` membership/owner helper functions (fixed `search_path`, minimum privileges) or another proven non-recursive RLS design. The current policies query `public.business_memberships` from policies on that same table and can cause PostgreSQL RLS recursion.
2. Remove the direct authenticated insert policy on `audit_events`. Client users must not be able to forge audit history. Audit inserts must occur only through a narrowly scoped trusted server/database path; retain no ordinary user update/delete policy.
3. Make the local synthetic seed executable. It currently inserts profiles/memberships that reference `auth.users` without first creating corresponding local test users, so its foreign-key dependencies must be satisfied using a documented local-only auth fixture strategy.
4. Add an actual local Supabase/PostgreSQL migration and RLS integration suite. It must apply migrations, seed synthetic users, authenticate/impersonate owner, same-business staff, other-business staff and unaffiliated user, then assert actual SQL allow/deny results.
5. Remove unconfirmed static financial values (`₹0.00`, `0`) from the Stage 1 dashboard. Use skeleton/loading/empty states until a confirmed server summary exists.
6. Resolve React `act(...)` warnings in the app-shell tests and ensure validation output is clean.
7. Ensure deferred feature navigation does not present a functioning-looking workflow or a successful business action. Clearly mark unavailable paths or hide them until their stage is implemented.

## Re-review evidence

Provide exact commands and output for format, lint, typecheck, unit tests, real database/RLS integration tests, build and the full validation pipeline. Then request Stage 1 gate review again; do not begin Stage 2 beforehand.

