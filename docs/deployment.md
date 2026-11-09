# Deployment Design

Use separate Supabase projects and hosting environments for development, staging, and production. Production resources, provider accounts and credentials are owner-controlled. Deploy versioned migrations before application releases; require staging acceptance and a rollback plan based on prior application build plus forward-only corrective migration where data has changed.

## Environment variable names

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server/CI only)
- `APP_ENV`, `APP_BASE_URL`, `BUSINESS_TIMEZONE`
- `STORAGE_DOCUMENT_BUCKET`, `STORAGE_BACKUP_BUCKET`
- `BACKUP_PROVIDER_*` (provider-specific server-only credentials)
- `WHATSAPP_MODE`, `WHATSAPP_PROVIDER_*` (server-only; only when official mode is approved)
- `PDF_FONT_STORAGE_PATH`, `LOG_LEVEL`, `SENTRY_DSN` (if selected)

No service-role, storage, backup or messaging secret may be prefixed `VITE_`.

## External accounts

Supabase and an owner-controlled hosting domain are required from Stage 1. Private document storage is required for Stage 4. A separate backup destination is required for Stage 6. Regular WhatsApp handoff needs no paid API/provider account. Official automatic WhatsApp messaging requires an owner-approved Meta/provider account, template approval and paid-message authorization.

