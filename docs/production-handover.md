# Production Handover & Deployment Guide — Rushi CRM v2.0

This document serves as the operational handover guide for deploying Rushi CRM v2.0 to production.

---

## 1. System Overview

- **Frontend:** React 18, Vite, TypeScript (Strict), Tailwind CSS, Lucide Icons, Bilingual (English / Marathi) i18n, PWA Service Worker (Workbox).
- **Backend & Database:** Supabase (PostgreSQL 15+), Non-recursive Row Level Security (RLS), Integer Paise Financial Ledger, Security-Definer Stored Procedures.
- **Testing:** Vitest 2.1+ (173 automated unit tests, 15 test suites), Playwright E2E.
- **Traceability:** 43 business features fully mapped and verified across 9 execution stages.

---

## 2. Environment Variables Checklist

### Client Application (`.env.production`)
| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Public HTTPS endpoint of production Supabase instance | `https://<proj-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous key for client Supabase access | `eyJhbGciOi...` |
| `VITE_APP_ENV` | Application environment identifier | `production` |

> [!WARNING]
> Never expose `SUPABASE_SERVICE_ROLE_KEY` or any backup/messaging secret in client `VITE_*` environment variables.

### Backend & Operational Secrets (Supabase Vault / CI only)
| Variable | Description | Security Tier |
| :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend service key for elevated functions | Critical (Server-only) |
| `STORAGE_BACKUP_BUCKET` | Private storage bucket for encrypted backups | Private (RLS restricted) |
| `STORAGE_DOCUMENT_BUCKET` | Private storage bucket for PDFs and uploads | Private (RLS restricted) |
| `WHATSAPP_PROVIDER_TOKEN` | Meta WhatsApp Cloud API Token (when official mode is activated) | Sensitive (Server-only) |

---

## 3. Database Deployment Procedure

1. **Connect to Production Supabase:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-production-project-ref>
   ```

2. **Apply Ordered Migrations:**
   Run migrations sequentially from `00001` through `00009`:
   ```bash
   npx supabase db push
   ```
   - `00001_foundation.sql`: Multi-tenancy, memberships, roles, non-recursive RLS.
   - `00002_crm_foundation.sql`: Customers, groups, phone normalization, opt-outs.
   - `00003_customer_finance.sql`: Bills, items, payments, rates, transactional procedures.
   - `00004_supplier_cost.sql`: Suppliers, purchase orders, supplier accounts.
   - `00005_profit_and_expense.sql`: Expenses, cost snapshots, profit views.
   - `00006_documents.sql`: Statements, storage buckets, PDF metadata.
   - `00007_whatsapp_and_engagement.sql`: Messaging queues, templates, delivery trips, tiller details.
   - `00008_pvc_public_presence.sql`: PVC public catalogue, digital card, brands, quotes.
   - `00009_operations_and_release.sql`: Backup artifacts, restore sandbox, business settings, audit logs.

3. **Verify Stored Procedures & RLS:**
   Confirm existence of:
   - `create_bill_transactional`
   - `record_customer_payment`
   - `create_purchase_order_transactional`
   - `enforce_backup_retention`
   - `record_audit_event`

---

## 4. Frontend Build & Hosting Deployment

1. **Build Production Assets:**
   ```bash
   npm run validate
   ```
   This executes:
   - Prettier style compliance check
   - ESLint validation (0 errors, 0 warnings)
   - TypeScript strict typecheck across both application and config targets
   - Vitest suite (173 / 173 passing)
   - Vite production bundle generation in `dist/`

2. **Deploy to Static Host (Cloudflare Pages, Vercel, Netlify):**
   - **Publish directory:** `dist/`
   - **SPA Routing Rule:** Redirect all unmapped paths (`/*`) to `/index.html` (HTTP 200).
   - **Header Rules:**
     - Serve `/sw.js` and `/manifest.webmanifest` with `Cache-Control: no-cache, no-store, must-revalidate`.
     - Serve hashed static assets (`dist/assets/*`) with `Cache-Control: public, max-age=31536000, immutable`.

---

## 5. Initial Owner Bootstrap Procedure

1. Sign up the primary owner account via Supabase Auth UI or application sign-up.
2. Link the authenticated user ID to the primary business record in `public.memberships`:
   ```sql
   INSERT INTO public.memberships (user_id, business_id, role)
   VALUES ('<owner-auth-user-id>', '<primary-business-id>', 'owner')
   ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'owner';
   ```
3. Navigate to **Settings** (`/settings`) to configure:
   - Firm Legal Name, Tagline, Address, Phone
   - Bank Account Number, IFSC Code, UPI ID
   - Bilingual Invoice Terms & Conditions
   - Default Reminder Intervals (7 days default)
   - Feed Buffer Thresholds (5 days default)

---

## 6. Operational Workflows & Owner Governance

- **Backup Strategy:**
  - Automated or manual backups stored with SHA-256 integrity checksums.
  - Rolling retention: 30 daily, 12 monthly.
  - The security-definer function `enforce_backup_retention` prevents accidental or unauthorized deletion of the last recoverable recovery point.
- **WhatsApp Messaging Mode:**
  - **Manual Free Mode (Default):** Prepares prefilled WhatsApp deep links for verified manual owner sending. No third-party API or provider credentials required.
  - **Official API Mode (Optional):** Requires explicit owner activation and verified Meta Cloud API token.
- **Security & Privacy:**
  - Role-Based Access Control: Staff accounts are strictly forbidden from viewing profit margins, supplier purchase costs, audit logs, and backup restoration controls.
  - Client inputs never control financial ledger balances; all balances are calculated and verified authoritatively in PostgreSQL.

---

## 7. Sign-Off & Maintenance Contacts

- **Platform Version:** 2.0.0
- **Release Date:** November 2026
- **Architecture & Traceability Authority:** [`docs/requirements-traceability.md`](file:///c:/Users/adity/Videos/Documents/Desktop/adeey/Rushi_crm/docs/requirements-traceability.md)
- **Gate Reviews:** [`stage9-gate.md`](file:///C:/Users/adity/.gemini/antigravity/brain/e6d738fd-561f-448c-bc4f-bc488a39be34/stage9-gate.md)

