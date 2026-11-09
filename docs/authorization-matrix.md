# Authorization and RLS Strategy

## Roles

`owner` has full business administration and the sole ability to cancel bills, restore data, configure messaging mode and manage backups. `staff` has only specifically granted operational permissions. A future `viewer` is read-only. Membership is per business.

| Capability | Owner | Authorized staff | Viewer |
| --- | --- | --- | --- |
| Read permitted business data | Yes | Scoped | Scoped read only |
| Customer create/update, call notes | Yes | If granted | No |
| Create/edit bill, record payment | Yes | If granted | No |
| Cancel bill / restore backup / mode switch | Yes | No | No |
| Prepare manual messages | Yes | If granted | No |
| Broadcast or template approval | Yes | Explicit grant only | No |
| Staff, permissions, firm settings | Yes | No | No |

## Version 2.0 private-data rule

Supplier records, purchase orders, supplier accounts/payments, purchase prices, load costs, cost snapshots, expenses, margins, profit reports and owner financial dashboard are owner-only. Staff and customers are denied in RLS, trusted functions, exports, object storage and report queries. Public cards/QR registration expose no internal customer, rate, cost, supplier or profit data.

## Enforcement

1. The client reads only through tables/views with RLS enabled.
2. Every policy derives access from `auth.uid()` and active `business_memberships`; no client-supplied business ownership is trusted.
3. Financial writes execute only in SECURITY DEFINER/RPC or Edge Function transactions that independently re-check membership and permission.
4. Storage policies keep documents private, permit scoped signed download only, and prevent public buckets for bills/statements.
5. Audit tables reject update/delete by ordinary application roles. Service-only operations are narrowly scoped.
6. Integration tests impersonate owner, staff from the other business, and unaffiliated users for every sensitive resource.

