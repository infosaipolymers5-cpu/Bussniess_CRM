# Customer and Supplier Ledger Invariants

## Boundaries

Only Cattle Feed creates customer bills, customer dues, payment reminders, supplier purchases and profitability. PVC has customer/marketing records only; it has no customer dues, billing, payment reminders or stock accounting.

## Customer ledger

Use append-only, balanced ledger entries for opening balance, bill posting, payment, payment allocation, advance credit, credit adjustment and bill-cancellation reversal. Store money as integer paise (or one consistent decimal-safe alternative), never browser floating-point.

- Partial payments allocate to oldest valid unpaid bill first.
- Excess payment becomes one advance credit and is applied once against future bills.
- Imports create one labelled Opening Balance, never invented historical transactions.
- Revised/cancelled bills preserve snapshots and post auditable corrective/reversal effects.
- Statement opening: imported opening due + valid sales before range − payments before range.
- Statement closing: opening + range debits − range credits. Balances, Khate Utara, dashboard and reports use the same ledger service.

## Supplier ledger

Supplier accounting is separate from customer accounting. It contains supplier opening balance, confirmed purchase, supplier payment/allocation, supplier advance and authorized adjustment.

- A draft purchase order is never a payable or purchase cost.
- The confirmation transition must be idempotent; an order cannot create purchase/cost twice on sent/received retries.
- Supplier payments reduce payables; they are not operating expenses and never reduce profit a second time.
- Load costs are explicitly allocated into effective item cost or treated as expense—never both.

## Cost and profit snapshots

Every bill line snapshots selling rate, discount, effective cost per unit and cost source at bill creation. `line_profit = (realized selling rate − effective cost) × quantity`. A linked supplier-order line supplies purchase cost; otherwise snapshot the latest purchase cost at bill time. Historical costs/profits never change after rate edits. Gross profit = net sales − cost of goods sold; net profit = gross profit − non-allocated expenses. Expected profit is separately labelled projection.

