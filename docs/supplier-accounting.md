# Supplier Purchasing Tasks and Rules

- Maintain suppliers, opening balances, purchase orders, immutable order versions/status history, line-level purchase rates, load costs, confirmed purchases, supplier ledger and payments.
- Purchase order states: draft → ordered → dispatched → received. **Architecture decision required:** identify which confirmed transition posts supplier payable/purchase cost; until decided, implement no posting from draft.
- Generate branded supplier PO PDF with customer/delivery/product/quantity lines, product totals and signature area. Purchase/selling-rate columns are off by default, configurable per sheet/line, and selling-rate visibility shows a warning.
- Supplier/private purchasing records are owner-only at RLS/function/UI levels. Customer PDFs/messages never receive costs, rates, margins or profits.
- Test supplier opening balance, order retry, confirmation idempotency, payment allocation, advance, load-cost allocation and the rule that payment is not an expense.

