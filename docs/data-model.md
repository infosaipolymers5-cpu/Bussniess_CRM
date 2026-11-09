# Logical Data Model

All business-owned tables include `business_id`, timestamps and audit-compatible actor metadata where applicable. UUID primary keys are recommended; database constraints—not client code—protect relationships.

| Domain | Core tables | Notes |
| --- | --- | --- |
| Tenancy | `businesses`, `profiles`, `business_memberships`, `role_permissions` | A user can belong to one or both businesses; membership scopes every access. |
| Customers | `customers`, `customer_contacts`, `customer_preferences`, `customer_notes`, `duplicate_reviews` | Store display phone and normalized phone separately; never silently merge. |
| Products/bills | `products`, `bill_sequences`, `bills`, `bill_items`, `bill_revisions`, `bill_documents` | Bills apply to Cattle Feed only. Sequence is locked/allocated in the same transaction. |
| Ledger | `ledger_accounts`, `ledger_entries`, `ledger_postings`, `payment_allocations`, `advance_credits`, `opening_balance_imports` | Append-only posted entries, with reversal entries for cancellation/correction. |
| Engagement | `reminder_rules`, `follow_up_events`, `message_templates`, `message_jobs`, `message_attempts`, `campaigns`, `campaign_recipients` | Status and idempotency keys distinguish manual and provider modes. |
| Documents | `document_templates`, `document_versions`, `storage_objects` | Private object path, checksum, rendering input snapshot and version retained. |
| Operations | `delivery_requests`, `audit_events`, `job_runs`, `backup_artifacts`, `restore_runs`, `exports` | Operational failures are queryable by owners. |

## Version 2.0 additions

| Domain | Core tables | Rules |
| --- | --- | --- |
| Customer organization | `customer_groups`, `customer_group_members`, `tags`, `customer_tags`, `customer_consents`, `customer_tiller_details` | Many-to-many group/tag links are business-scoped and auditable. |
| Supplier purchasing | `suppliers`, `supplier_opening_balances`, `purchase_orders`, `purchase_order_items`, `purchase_order_versions`, `purchase_order_status_history`, `purchase_load_costs`, `supplier_purchases`, `supplier_payments`, `supplier_payment_allocations`, `supplier_ledger_entries` | Owner-only. A draft cannot post payable/cost. |
| Cost/profit | `sale_cost_snapshots`, `load_cost_allocations`, `expense_categories`, `expenses` | Sale cost is immutable per bill item; expenses avoid allocated-cost double count. |
| Public marketing | `poster_templates`, `generated_posters`, `brand_records`, `business_cards`, `public_qr_registrations`, `pvc_catalogue_items` | Public endpoints expose only explicitly public card/registration data. |
| Messaging v2 | `message_mode_settings`, `message_recipients`, `provider_webhook_events` | Mode is configurable independently by workflow; manual and API statuses remain distinct. |

## Required key constraints

- `businesses.kind` is `cattle_feed` or `pvc`; records cannot be reassigned across businesses without an audited owner command.
- `bills.bill_number` is unique per business and financial year, including cancelled bills.
- Money is stored as integer paise or `numeric(18,2)` consistently (recommended: integer paise); never float.
- One active customer may have a unique normalized phone within a business only after duplicate-review policy allows it; potential duplicates remain reviewable.
- `payment_allocations.amount > 0`; allocations cannot exceed unapplied payment or eligible receivable.
- Message idempotency keys and scheduled occurrence keys are unique in their intended scope.
- Supplier-order status change has a unique transition/idempotency key; confirmed purchase and payable may be posted at most once per order line.
- `sale_cost_snapshots` cannot be mutated after a valid bill posts; revisions create a new version/effect rather than rewriting history.

