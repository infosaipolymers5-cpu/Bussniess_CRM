# Antigravity Prompt — Stage 8: PVC Presence and Public Marketing

Do not start until Stage 7 is explicitly approved. Read `docs/frontend-ui-ux-tasks.md`, `docs/data-model.md`, and TASKS for `pvc-catalogue`, `tiller-details`, `posters`, `digital-cards`, `brands`, and `qr-registration`.

Implement Features 7–10 and 40–43 (complete remaining public/PVC scope):

- owner-managed PVC category cards with no public rate; Ceramic marked coming later;
- private indexed/paginated search for 5,000+ items by name, size and code, usable by messages/posters without browser full-table loading;
- tiller model/year customer attributes and relevant spare-part audience filtering;
- brand directory with documented owner logo-use permission and controlled public visibility;
- separate public business cards with contact/map/services, Ask for Quote WhatsApp preparation and QR;
- practical poster templates and exports if not already complete from Stage 6;
- public QR customer signup, consent, validation, duplicate review and selected-group routing.

Public APIs may expose only explicit public card/category/registration content. Never publish rates, costs, inventory, customer records, supplier data, profit or internal item details.

Test public/private boundary, rate absence, 5k pagination/search index behavior, QR consent/duplicate handling, mobile PWA UX and no IDOR. Run performance checks and request Stage 8 gate.

