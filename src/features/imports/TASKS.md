# Import Tasks

- [x] Accept only agreed CSV/XLSX columns and validate phone, DOB and business type.
- [x] Build preview with valid/error/duplicate rows; default duplicates to Skip.
- [x] Commit only owner-approved valid rows under a batch idempotency key.
- [x] Create a single provenance-tagged opening balance for each imported due; never invent history.
- [x] Export an outcome/error report and test no hidden partial import occurs.
