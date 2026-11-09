# PDF Specification

PDFs are generated server-side from trusted ledger/document snapshots and stored in a private bucket. Use a maintained renderer supporting A4 pagination, repeating table headers, page numbers and embedded, appropriately licensed Devanagari font. Validate actual glyph coverage before implementation; browser-installed fonts and HTML screenshots are not authoritative documents.

## Bill

The Cattle Feed commercial bill includes firm identity, optional logo/GSTIN, bill number/date, customer details, item rows, subtotal/final amount, paid now, current/previous/total outstanding, material duration/expected finish date, optional UPI/bank details, thank-you and computer-generated notice. It is explicitly labelled **Commercial Bill**, not GST tax invoice.

Revisions retain the bill number, add a prominent `REVISED` label, create an immutable new document version and preserve all earlier PDFs. Cancellation never deletes or reuses the number.

## Khate Utara

The statement is ledger-derived and generated in the selected Marathi/English template. Labels/headings are translated, customer names and notes retain entered text, and Marathi numeric rendering uses English digits. Test long content, multi-page output, credits, empty ranges, and A4 physical printing.

