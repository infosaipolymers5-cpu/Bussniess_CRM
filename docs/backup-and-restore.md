# Backup and Restore Design

Daily backup jobs create and verify a database export plus a manifest of private document/template assets. Artifacts are encrypted and copied to an owner-controlled destination outside the primary Supabase failure domain where feasible. Retain 30 daily and 12 monthly recovery points; cleanup refuses to delete the final verified recoverable copy.

Each `backup_artifact` records artifact location, checksum, database/object counts, encrypted status, verification result, retention class and job correlation ID. A job run alone is never a successful backup.

## Restore procedure

1. Owner authorizes a restore and selects a verified point.
2. Restore first into an isolated Supabase project/environment.
3. Verify customer/bill counts, customer and supplier ledger totals, purchase/cost/profit records, expenses, settings/templates, message history and all document references/checksums.
4. Record a `restore_run` with evidence and owner sign-off.
5. Only then plan production recovery, preserve the failed production state, and communicate downtime/data-loss boundary.

Run and document an isolated restoration test at least before release and periodically thereafter. Send the monthly owner “backup OK” note only after required artifact and restore/check checks pass.

