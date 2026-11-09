# Project Directory & Architecture Structure

```text
Rushi_crm/
├── antigravity-prompts/     # Stage prompts, handover runbooks, and task instructions
├── docs/                    # Architecture, ledger invariants, RLS matrix, API contracts
│   ├── decisions/           # Architectural Decision Records (ADRs)
│   ├── architecture.md      # Modular monolith design
│   ├── data-model.md        # Database schema specifications
│   ├── financial-ledger.md  # Customer and supplier double-entry invariants
│   ├── profit-calculations.md # Worked financial examples & cost snapshot formulas
│   └── supplier-accounting.md # Supplier purchasing & cost rules
├── public/                  # Static assets & PWA manifest
├── src/
│   ├── app/                 # Root application shell, providers, and route configuration
│   │   ├── providers/       # AuthProvider, BusinessProvider, LocaleProvider, QueryProvider
│   │   ├── route-guards/    # ProtectedRoute, AccessDenied
│   │   └── router/          # App router with clean feature-level barrel imports
│   ├── components/          # Shared presentation components
│   │   ├── layout/          # AppShell, TopBar, SidebarNav, MobileNav, LanguageSelector
│   │   └── ui/              # Button, Input, Select, Dialog, MetricCard, StatusBadge, Toast
│   ├── features/            # Domain-driven modular features (each with clean index.ts)
│   │   ├── account-statements/ # Khate Utara customer account statement
│   │   ├── auth/            # Authentication & sign-in
│   │   ├── billing/         # Bill creation, FY numbering, and cancellation
│   │   ├── customer-groups/ # Customer segmentation and grouping
│   │   ├── customers/       # Customer directory, quick-add, and profiles
│   │   ├── dashboard/       # Operations dashboard
│   │   ├── imports/         # CSV / Excel customer data migration
│   │   ├── payments/        # Customer collections & FIFO payment allocations
│   │   ├── products/        # Cattle Feed product catalogue & pricing
│   │   ├── purchase-history/# Confirmed purchase receipts (no stock balances)
│   │   ├── purchase-orders/ # PO workflow with freight/load cost apportionment
│   │   ├── qr-registration/ # Public QR customer onboarding
│   │   ├── rates/           # Customer-specific price overrides
│   │   ├── supplier-accounts/# Supplier Khata & payment vouchers
│   │   └── suppliers/       # Supplier directory & opening balances
│   └── lib/                 # Shared foundational utilities
│       ├── dates/           # FY calculation (April 1 cutoff in Asia/Kolkata)
│       ├── formatting/      # Indian numbering formatters
│       ├── i18n/            # Localization dictionaries (en.json, mr.json)
│       ├── money/           # Strict integer paise arithmetic (0 float operations)
│       ├── permissions/     # Client-side role visibility checks
│       ├── supabase.ts      # Authoritative typed Supabase client
│       ├── database.types.ts# Full TypeScript database schema & RPC types
│       └── validation/      # Client-side Zod validation schemas
├── supabase/
│   └── migrations/          # Authoritative PostgreSQL schema, non-recursive RLS, RPCs
└── tests/
    ├── e2e/                 # Playwright journeys
    ├── integration/         # Database and RLS integration tests
    └── unit/                # Vitest unit test suites (100+ tests)
```

