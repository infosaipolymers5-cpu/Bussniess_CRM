# Test Strategy

`unit/` tests domain algorithms and formatting boundaries; `integration/` tests migrations, transactions, RLS and jobs against an isolated Supabase/Postgres environment; `e2e/` uses Playwright for staged browser journeys. Use synthetic data exclusively. Tests must cover failure and retry paths, not only happy paths.

