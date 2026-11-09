# Antigravity Prompt — Stage 6: Documents and PDF System

Do not start until Stage 5 is explicitly approved. Read `docs/pdf-specification.md`, `docs/architecture.md`, `docs/financial-ledger.md`, and relevant billing/statement/purchase-order/poster TASKS.

Implement document service and Features 7, 8, 11, 20, 27 and 31 document aspects:

- trusted server PDF generation/storage with versioned templates and private signed access;
- commercial bill/revised bill; Marathi/English Khate Utara; supplier purchase-order sheet and supplier account statement;
- embedded licensed Devanagari font, English digits in Marathi numbers, A4 layout, repeating headers, page numbering and print-safe tables;
- correct business logo/name/tagline/QR on applicable PDFs;
- strict absence of supplier cost, purchase rate, margin or profit in customer-facing output;
- poster template/export implementation with practical, documented first-release edit limitations;
- public card/QR document assets only after public/private review.

PDF input must be trusted snapshots/ledger data, never browser totals. Preserve revisions/previous PDFs. Test secure object access and physical/Android/PWA PDF viewing.

Required acceptance: long/multi-page Marathi/English documents, large values, advances, cancelled/revised bill, visibility switches/warnings, font embedding, no private-data leakage, A4 print, storage/RLS download authorization. Run document suite and request Stage 6 gate.

