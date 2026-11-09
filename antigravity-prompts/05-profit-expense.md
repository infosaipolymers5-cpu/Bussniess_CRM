# Antigravity Prompt — Stage 5: Profit and Expense Engine

Do not start until Stage 4 is explicitly approved. Read `docs/profit-calculations.md`, `docs/financial-ledger.md`, and TASKS for `expenses` and `profitability`.

Implement only Features 35–38:

- immutable sale cost snapshots sourced from linked supplier order or latest purchase cost at bill creation;
- realized line/gross/net profit and separately labelled expected profit;
- owner-only categorized expense workflow, optional customer/load links and allocation protection against double counting freight/load cost;
- owner-only date-range profit dashboard with sales, collections, COGS, margins, expenses, profit/customer/product/company/load comparisons, receivables and payables;
- optional owner PIN design if owner configures it, plus complete privacy boundary.

Revised/cancelled bills must preserve financial history and correct profit effect without overwriting snapshots. Supplier payments are never expenses. Do not expose any cost, supplier, margin or profit information to staff, customers, documents or public endpoints.

Required tests include the documented deterministic example (₹72,000 purchases, ₹4,700 gross profit, ₹62,000 supplier payable after ₹10,000 payment), discount effects, historical rate/cost immutability, cancelled/revised bill, expense allocation, owner-only actual RLS/API/export denial. Run full validation and request Stage 5 gate.

