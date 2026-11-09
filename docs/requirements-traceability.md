# Version 2.0 Requirements Traceability — 43 Features

| # | Requirement | Planned feature/service modules | Core verification |
| --- | --- | --- | --- |
| 1 | Customer records | customers | scoped CRUD/search/tags |
| 2 | Customer groups | customer-groups | many-to-many/audit |
| 3 | Duplicate numbers | customers, imports | review/no auto-merge |
| 4 | Excel import/export | imports | opening-balance provenance |
| 5 | Opt-out list | customers, messaging | central suppression |
| 6 | Custom messages | messaging, broadcasts | named recipient/batches |
| 7 | Poster maker | posters | template/export/brand |
| 8 | Digital card + QR | digital-cards | public/private boundary |
| 9 | Brands | brands | logo permission/visibility |
| 10 | Ask for Quote | digital-cards, messaging | WhatsApp enquiry only |
| 11 | PDF branding | documents, pdf | correct firm/no cost leak |
| 12 | Birthdays | birthdays, messaging | approval/opt-out |
| 13 | Delivery trips | delivery-trips | request/load list/no bill |
| 14 | Sending modes | messaging | per-workflow mode/status |
| 15 | Staff permissions | staff, auth | RLS/API denials/audit |
| 16 | Backup | backups | verified db/object restore |
| 17 | Daily summary | dashboard | owner-private profit separation |
| 18 | Product catalogue | products | hidden history preservation |
| 19 | Rates/discounts | rates, billing | snapshot/rate history |
| 20 | Commercial bill | billing, documents | sequence/PDF/manual share |
| 21 | Bill-save effects | billing, ledger, jobs | atomic dependent effects |
| 22 | Material alert | material-alerts | suggestion/replacement/history |
| 23 | Payments | payments, ledger | oldest allocation/advance |
| 24 | 7-day reminders | reminders | recurrence/settlement stop |
| 25 | Follow-up list | reminders, customers | defer/stop/promise audit |
| 26 | Edit/cancel bills | billing, audit | revision/reversal/number retention |
| 27 | Khate Utara | statements, documents | ledger reconciliation/PDF |
| 28 | CF launch message | broadcasts | explicit selected audience |
| 29 | Reports | reports | sales ≠ collections/export |
| 30 | Supplier records | suppliers | owner-only RLS |
| 31 | Purchase order | purchase-orders, documents | visibility switches/warning |
| 32 | Order/account integration | purchasing, supplier-accounts | lifecycle/no duplicate costs |
| 33 | Supplier accounts/payments | supplier-accounts | allocation/opening balance |
| 34 | Purchase history | purchase-history | effective cost/no inventory |
| 35 | Profit per sale | profitability | immutable cost snapshots |
| 36 | Expenses | expenses | allocation/no double count |
| 37 | Owner profit dashboard | profitability | metric formulas/privacy |
| 38 | Private section privacy | permissions, all private modules | staff/customer denied |
| 39 | PVC quick-add | customers | three-field speed path |
| 40 | PVC categories | pvc-catalogue | no public rates/ceramic later |
| 41 | Private item search | pvc-catalogue | indexed/paginated 5k+ |
| 42 | Tiller model/year | tiller-details, messaging | targeted recipient filters |
| 43 | QR public sign-up | qr-registration | consent/no internal data |

Every row requires: persisted data, server validation, RLS/permission test where relevant, audit effect where relevant, normal/failure test and responsive PWA acceptance before completion.

