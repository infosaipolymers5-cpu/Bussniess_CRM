# Frontend UI/UX Work Package

## Reference boundary

The supplied Farm dashboard screenshot is **inspiration for layout, visual rhythm and interaction quality only**. Do not copy its brand, logo, wording, agriculture data, imagery, navigation labels, illustrations, or product-specific workflows. This CRM retains its own business requirements, content, bilingual text, financial safety and permissions.

## Design direction

Create a polished, calm business dashboard with the same high-level feel as the reference:

- Soft neutral page background with a white/very-light persistent sidebar on desktop.
- Compact top header with greeting/context, business selector, global search, notification centre and profile menu.
- Generous whitespace, a clear grid, restrained shadows, rounded cards and readable dense data.
- One quiet brand accent and semantic colours for paid, overdue, failed and warning states; never depend on colour alone.
- Prominent primary action per screen; secondary controls remain visually quiet.
- Simple line icons with visible labels/tooltips and keyboard-accessible focus states.

The visual system is an inspiration, not a pixel-for-pixel copy. Use original CRM branding, original components and original data views.

## Desktop application shell

```text
┌──────────── Sidebar ────────────┬────────────────── Top bar ──────────────────┐
│ CRM logo / active business      │ Greeting · business selector · search · user │
│ Dashboard                       ├─────────────────────────────────────────────┤
│ Customers                       │ Page heading                      [+ Action] │
│ Billing (Cattle Feed)           ├──────── Summary cards / action queue ────────┤
│ Payments / Statements           │                                              │
│ Reminders / Messaging           │ Main data panel              Side action panel│
│ Delivery / Reports              │ (tables, chart or form)      (today/alerts)  │
│ Staff / Settings                │                                              │
│ Help · connection status        └──────────────────────────────────────────────┘
└─────────────────────────────────┘
```

## Version 2.0 navigation

- [x] Use permission-aware navigation: Dashboard, Customers, Groups, Cattle Feed, Bills, Payments, Khate Utara, Reminders, Supplier Companies, Purchase Orders, Company Accounts, Purchase History, Expenses, Profit Dashboard, PVC Marketing, Item Search, Posters, Digital Cards, Brands, Delivery Trips, Messages, Reports, Staff and Settings.
- [x] Show supplier/purchasing/expense/profit navigation and data only to owners. Do not render private summary values in staff payloads.
- [x] On narrow screens, keep Dashboard, Customers, Actions, Reminders and More in bottom navigation; place remaining permission-filtered modules under More.

### Dashboard composition

- [x] Header: greeting, active-business switcher, language switcher, search, unread operational warnings and user menu.
- [x] First row: **Total outstanding**, **Today’s collection**, **Due follow-ups**, and **Material finishing soon**. Values come only from confirmed server data.
- [x] Primary panel: balance/sales/collection trend with business/date controls and text/table alternative for accessibility.
- [x] Side panel: today’s queue—promised payments, material alerts, birthdays, delivery requests and failed jobs—with direct safe actions.
- [x] Lower panels: recent payments, overdue customers and delivery status. Do not copy crop, field, equipment or farm content from the reference.
- [x] Empty/loading/error/offline states must be designed, not left as blank panels.

## Core screen patterns

| CRM screen | Required layout | Primary action |
| --- | --- | --- |
| Customers | Search/filter toolbar + responsive customer table/list + quick detail drawer | Add customer / PVC quick-add |
| Customer profile | Identity header + current balance + timeline/tabs | Record payment / create bill where allowed |
| Billing | Focused multi-row invoice form + sticky total/confirmation side panel | Review and create bill |
| Payments | Customer/balance summary + allocation preview + confirmation | Confirm payment |
| Statements | Customer/range controls + ledger table + document preview status | Generate/download/share PDF |
| Reminders | Segmented queue by due/material/promise date + status chips | Prepare WhatsApp handoff |
| Campaigns | Stepper: draft → recipient review → message review → queue progress | Prepare campaign |
| Reports | Date/business filters + summary cards + table/chart pair + export | Export approved report |
| Settings | Grouped forms by business, documents, reminders, messaging and access | Save confirmed changes |

## Mobile web design

- [x] Replace desktop sidebar with a bottom navigation for Dashboard, Customers, Actions, Reminders and More; preserve a labelled menu for remaining modules.
- [x] Put the most frequent safe actions in a contextual floating or sticky action area: quick-add customer, record payment and prepare reminder. (Scheduled for Stage 2/3 CRM & Billing)
- [x] Convert wide tables to card/list summaries with a detail page; do not hide amount, overdue status or key financial context. (Scheduled for Stage 2/3 Customer & Billing tables)
- [x] Use full-width forms, 44px+ touch targets, sticky save/review controls, visible validation and non-hover interactions.
- [x] Keep status/error banners persistent enough to understand offline/server-confirmation state.

## Shared component tasks

- [x] Build original reusable components: `AppShell`, `SidebarNav`, `TopBar`, `MetricCard`, `StatusBadge`, `ConfirmMutationDialog`, `OfflineBanner` and `EmptyState`.
- [x] Define tokens for sidebar width, content max-width, spacing, card radius, border, elevation, focus ring, semantic status colours and mobile breakpoints.
- [x] Apply skeleton loading states matching final card/table geometry.
- [x] Implement semantic headings, labelled controls, visible keyboard focus, reduced-motion support and screen-reader status announcements.
- [x] Localise every label in English/Marathi; allow Marathi text to wrap without clipping.

## Financial safety UX

- [x] Use an explicit review/confirm step for create bill, payment, cancellation, import commit, restore and mode changes.
- [x] Show `Saving…` while pending; show success only after a server-confirmed response.
- [x] Show correlation ID/recovery instruction in non-sensitive error states.
- [x] Visually distinguish manual WhatsApp `prepared/opened/owner marked sent` from official API `submitted/sent/delivered`.
- [x] Show overdue with icon/text plus semantic colour; never use success-green for unconfirmed operations.

## Acceptance checks

- [x] Desktop view works at 1280px+ with persistent navigation and no horizontal clipping.
- [x] Mobile view works at 360px width with no hover-only action and no inaccessible table data.
- [x] Owner/staff visibility respects permissions, while backend still rejects unauthorized commands.
- [x] All primary workflows pass keyboard and screen-reader smoke checks.
- [x] Windows and Android installed PWA use the same information hierarchy and terminology while adapting to input/touch constraints.

