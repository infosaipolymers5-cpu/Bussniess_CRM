# Antigravity Prompt — Stage 4: Supplier and Cost Engine

Do not start until Stage 3 is explicitly approved. Read `docs/supplier-accounting.md`, `docs/financial-ledger.md`, `docs/data-model.md`, and TASKS for `suppliers`, `purchase-orders`, `supplier-accounts`, and `purchase-history`.

First resolve and record the owner-approved event that posts a supplier payable/cost: **order sent** or **order received**. Do not guess.

Implement only Features 30–34:

- owner-only supplier records and opening balance;
- versioned purchase-order draft/ordered/dispatched/received lifecycle, customer-linked lines, purchase rate and load costs;
- confirmation event posts confirmed purchase/payable exactly once; draft never posts either;
- supplier ledger, supplier payments, advance/allocation, range filters and history/effective cost;
- purchase-order document data including default-off purchase/selling rate visibility controls and selling-price warning (PDF rendering waits for Stage 6).

Do not implement stock counts, valuation, stock alerts or staff access to supplier/cost data.

Required tests: owner-only RLS/API/export denial for staff/customers; lifecycle retry/no duplicate purchase; opening balance; supplier payment/advance allocation; load-cost allocation; supplier payment not expense; no inventory data; rate-visibility warning state. Run real DB integration tests and request Stage 4 gate.

