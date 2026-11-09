# Profit and Expense Calculation Tasks

- Create immutable cost snapshots for bill lines, including source, purchase rate, allocated load cost, realized selling rate and discount.
- Calculate realized gross profit only from valid customer bills; exclude cancelled bill effect via reversal.
- Record expenses by category/date/note/business and optional customer/load. Prevent duplicate recording of cost already allocated into cost of goods.
- Expose owner-only date-range metrics: net sales, collections, COGS, gross profit, expenses, net profit, customer/product/supplier/load breakdowns, receivables, payables and separately labelled expected profit.
- Use the supplied deterministic example as automated test: purchases ₹72,000; makka profit ₹3,800; bhusa profit ₹900; gross profit ₹4,700; a ₹10,000 supplier payment leaves ₹62,000 payable.

