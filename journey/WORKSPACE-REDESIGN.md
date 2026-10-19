# Workspace redesign — 19 October 2026

The existing Journey frontend now has a shared premium admin/student shell, scoped
workspace tokens, reusable interface components, and adapters to existing APIs.
The public homepage, globe component, projection, timing, size and position were
left unchanged. No backend source, route, payment verification or authentication
flow was changed. The fetch helper accepts optional idempotency headers while
preserving its existing CSRF, session-refresh and cookie behavior.

## Audit before implementation

The public homepage and every original admin navigation route were inspected in
Chrome using synthetic authenticated identities. Original route behavior:

| Route | Before |
|---|---|
| `/` | Existing public Journey homepage |
| `/portal.html`, `/student-dashboard` | Redirect to student login |
| `/pay-fees`, `/hostel`, `/apply`, `/book-consultation` | Redirect to Contact |
| `/admin.html` | Redirect to staff login |
| `/admin#dashboard`, students, payments, fees, users, announcements, audit | Basic live record views |

Problems found: menu and close-menu buttons visible together on desktop; broken
icon requests from the old icon helper; seven ungrouped staff links; dark student
sidebar; no page helper/action pattern; narrow forms and sparse content; plain
error text; no search/filter/sort/export controls; no consistent status badges;
browser-preview interfaces still differed from the deployed live workspace.

There was no negative sidebar transform at the audited desktop viewport. The old
shell inherited broad site styles, used an unbounded mixed drawer/sidebar layout,
and requested an icon route not provided by the deployment server. The replacement
uses an explicitly positioned sidebar with constrained scrollable navigation and
fixed brand/footer areas. Desktop collapse and mobile drawer behavior are separate.

Implementation order followed: audit → tokens/components → shell → Students,
Payments, Fees, Hostels → student pages → remaining staff views → verification.
The TypeScript build was checked after each group.

## Design and components

- One `workspace-tokens.css` file owns the emerald, sage, ivory, gold and status
  colors, spacing, dimensions, type sizes, borders, shadows and motion settings.
- Fraunces and Inter are bundled locally with their OFL license files. The global
  homepage type system is not changed.
- Admin has a permanent 260px dark sidebar, grouped by Overview, People, Money,
  Campus, Content and System. Desktop collapse is saved as a local UI preference.
- Student has a light sidebar and seven menu items: Home, My Journey, Exams and
  Results, Payments, Hostel, Documents, Messages. Profile is in the header menu.
- Mobile navigation has a dismissible, focus-contained drawer and student bottom
  tabs. Brand, school links and navigation no longer depend on negative positioning.
- PageHeader, Card, StatCard, DataTable, Drawer, Modal, ConfirmDialog, Alert, Toast,
  Badge, Tabs, Stepper, Timeline, FormField, ImageUploader, EmptyState, Skeleton,
  Breadcrumbs, profile menu, notification panel and module search share styling.
- Headings rise/fade once; cards enter with a restrained stagger. All motion and
  transitions are disabled for `prefers-reduced-motion: reduce`. No looping text.
- AA text-pair contrast checks: ink/white 12.53, muted/ivory 5.28, cream/sidebar
  14.13, sidebar-muted/sidebar 8.40; status text pairings range from 5.72 to 6.21.

## Connected workflows

Students: searchable/status-filtered table, sorting, pagination, CSV export,
tabbed detail drawer, resend credentials, reset password, suspend/reactivate and
owner-only creation for an approved payment exception. Setup tokens/passwords are
never displayed in record lists. The existing recent-MFA server guard still applies.

Payments: authoritative amounts formatted from minor-unit strings, filters,
CSV, receipts, offline bank verification and refund request dialogs with a reason
and explicit confirmation. Refund submission is not presented as money delivered.

Fees: create/edit, purpose/currency/instalments, active toggle, and available audit
history. The public fee page, student fee catalogue and checkout all read live
server records; the browser never supplies an invoice amount.

Hostels: live residence cards, Details/Rooms/Fees/Amenities/Photos tabs, room editor,
amenity tags, approved photo URL manager with alt text, cover selection, drag/keyboard
ordering and confirmed removal. Photos remain room-owned JSON on the existing API.
Multi-file uploads use the existing presigned/scanning pipeline. No upload is
reported as approved or published before scanning. Three illustrated Demo residences
appear only when the real hostel catalogue is empty; they are never bookable or
written to MongoDB. The public hostel page and student booking flow use live data.

Other staff views: exam/country/university/course editors, application table and
pipeline, document review, enrolment and booking updates, adviser slots,
consultations, message replies, staff invite/edit/remove, role permissions,
read-only audit, ID settings, media uploads, and content edit/preview.

Post Information: drafts, rich text with sanitization, audience, channel, pin,
publish/expiry dates, preview, existing publish/schedule endpoint and archive.
Published content cannot be silently edited as a draft.

Student: next-step home, progress, summaries, profile editor, application drafts
and submission, document upload/download, exam registration/results, server fee
checkout, verified receipts, room reservation/held-room payment and cancellation,
appointments, admissions conversations, and school notices/read status.

## Backend gaps and explicit limits

The UI does not invent metrics, balances, prices or availability. Missing features
are represented by service-layer capability flags or explicitly labeled demo data.
The following proposed additions are **not existing endpoints**:

| Missing capability | Proposed backend work |
|---|---|
| Class/programme/term/session fee assignments and effective dates | Extend Fee schema/contract and add versioned `/admin/fee-schedules` + student assigned-fee query |
| Full fee and hostel price history | `/admin/fees/:id/history`, `/admin/rooms/:id/price-history`, with immutable versions |
| Personal balance, invoices, due dates, term revenue | `/portal/billing/summary`, invoices, date-filtered financial reporting |
| Full occupancy/free beds by term/date range | `/public/rooms/availability?arrival=…&departure=…`; server still checks every actual hold |
| Open enquiries KPI and full monthly revenue | Reporting endpoints with explicit date range/currency; current chart is labeled as based on latest 100 transactions |
| Hostel location and hostel-specific carousel associations | Extend Hostel and CarouselSlide schemas; no current hostelId on slides |
| Automatic WebP upload/publishing | Extend upload MIME/scanner support (current API accepts JPEG/PNG/PDF) and return an approved permanent public media URL |
| Structured photo publishing lifecycle | Add media-to-room attachment endpoint; existing approved URL/alt/cover/order room JSON is supported |
| Dedicated admin notification inbox | Add admin notifications endpoint; current panel reads permitted announcements |

Generic editors do not fabricate unsupported class/session/effective-date fields.
The room photo manager saves real approved URLs and metadata, but automatic WebP
compression/publishing is not falsely claimed. Backend storage, scanner, messaging
and payment provider configuration remain prerequisites for their respective APIs.

The explicit instruction to leave the public homepage alone takes precedence over
replacing its existing content adapter. Staff content and slide changes are saved
to the real backend and can be previewed, but homepage CMS/carousel consumption has
not been changed in this redesign. Existing public examination/pathway presentation
also remains; the new student exam/course selectors read the live catalogue.

Published announcements support existing attachments, but attachment picking for
new notices still requires a complete approved media selection/publishing workflow.
Financial fees are deactivated rather than offering a destructive delete shortcut.
Operational/historical records use their status endpoints, not fabricated delete APIs.
Bulk deletion is shown only for supported catalog resources, with confirmation.

## Verification and artifacts

- `npm.cmd run build`: passed after each implementation group.
- `node workspace-qa.cjs`: synthetic API fixtures, all staff/student pages,
  desktop and 360px widths, no horizontal page overflow, role-based navigation,
  search, student drawer, fee amount payload, photo editor, public catalogue routes,
  and reduced-motion behavior. Does not mutate real accounts or send payments/mail.
- Token contrast calculations verify the AA text pairings listed above.
- `frontend-deploy-qa.cjs` checks public routes, private-file exclusion and CSP.
- Existing access/authentication functions remain in `live-ui.ts`; workspace
  rendering delegates to the new modules. No live password, MFA or payment test
  is performed without the account holder.

Before screenshots: `workspace-admin-before.png`, `workspace-student-before.png`.
After screenshots: `workspace-admin-after.png`, `workspace-students-after.png`,
`workspace-admin-mobile-after.png`, `workspace-student-after.png`,
`workspace-student-mobile-after.png`, `workspace-hostel-photos-after.png`.
All screenshots use fictitious records and contain no real account credentials.

Main changed files: workspace tokens/styles and workspace TypeScript modules;
`journey/live-ui.ts`, `live-api.ts`, `live.html`, `build-icons.cjs`;
`frontend-server.cjs`, `server.js`, `Dockerfile`; new bundled fonts/licenses;
and browser QA/report files. The homepage/globe and backend sources are unchanged.

Detailed implementation files:

- `workspace-tokens.css`, `workspace.css`: isolated design system and responsive shells.
- `workspace-components.ts`: reusable components, tables, dialogs and form handling.
- `workspace-config.ts`: module groups and schema-compatible field definitions.
- `workspace-api.ts`: adapters, exact money conversion, uploads and capability flags.
- `workspace-premium.ts`: shell, dashboards, tables, editors and student detail/actions.
- `workspace-special.ts`: hostel management, notices, permissions, settings and uploads.
- `workspace-student.ts`: portal pages, applications, bookings, payments and messages.
- `workspace-photos.ts`: cover/alt/order photo editor.
- `workspace-exams.ts`, `workspace-operations.ts`: examination registration and operational edits.
- `workspace-settings.ts`: currency and notification preference forms.
- `workspace-public.ts`: live public fee/hostel/course/appointment views.
- `live-ui.ts`, `live.html`: delegates workspace rendering and loads scoped styles.
- `live-api.ts`: optional idempotency headers forwarded on retries; auth logic unchanged.
- `build-icons.cjs`: additional locally bundled Lucide icons.
- `../assets/fonts/`: Inter, Fraunces and their licenses.
- `../frontend-server.cjs`, `../server.js`: public route aliases and workspace assets;
  optional approved `PATHWAY_MEDIA_ORIGIN` / `PATHWAY_UPLOAD_ORIGIN` for media CSP.
- `../Dockerfile`: includes new workspace styles in the runtime image.
- `../workspace-audit.cjs`, `../workspace-qa.cjs`, `../workspace-auth-qa.cjs`,
  `../frontend-deploy-qa.cjs`: audit, UI, auth and deployed-route checks.
