# Journey workspace: audit, architecture, and backend handoff

**Access update:** `/portal` and `/admin` now use Student ID/password and staff password + email-code mock sessions, replacing the role/profile chooser. See [the Access API contract](ACCESS-API-CONTRACT.md) for payment-to-ID provisioning, owner seeding, new admin controls and Post Information. Local setup/payment/MFA/outbox controls are explicitly development-only. The profile-chooser sections below describe the earlier prototype and are superseded by that contract. `access-qa.cjs` and `access-edge-qa.cjs` exercise the current access flows.

## Existing project and extension

The project is an Express 4 server with plain HTML, CSS, and browser JavaScript, SQLite, and existing authenticated student/admin exam screens. It already uses emerald/ivory/gold, Georgia headlines, and Segoe UI. The previous frontend-only service flows live in `student-services/`.

The extension preserves those screens at `/portal.html`, `/admin.html`, and `/exam.html`. New routes `/portal` and `/admin` demonstrate the broader Journey experience; they are explicitly local previews, not replacements for the existing authenticated accounts. The homepage retains its original HTML as a progressive fallback and is enhanced by the CMS renderer. New public routes reuse that existing document and design identity.

Implementation order: theme/components → TypeScript data/contracts → staff CMS and hostel manager → student Journey → public data bindings. `npm run build` compiles each stage; generated browser modules are in `journey/dist/`. Rebuild after changing TypeScript.

## Run and verify

```text
npm install
npm run build
npm start
```

Open `/` for the public website, `/admin` for the staff preview-role chooser, and `/portal` for the student preview-profile chooser. `/login` explains the separate login paths; `/signup` creates a local student profile without a password. Do not enter real credentials or private documents into this prototype.

`node journey-qa.cjs` verifies CMS publication, carousel visibility, staff-to-student application updates and notifications, document review, exam enrolment, shared messages, role guards, and desktop/mobile layouts. Set `UI_BASE_URL=http://localhost:3000` or the appropriate test port. `services-qa.cjs` covers the earlier service workflows; consultation fixture dates should match the available slots now managed in the shared store.

## Files and design system

- `types.ts`: entity contracts for students, roles, applications, universities, exams, enrolments, hostels, rooms, bookings, payments, fees, consultations, documents, announcements, slides, messages, notifications, media, and audit events.
- `services.ts`: typed persistence/service boundary, role checks, student ownership filters, status transitions, notifications, and audit records.
- `seed.ts`: editable illustrative initial data, not verified university partnerships, fees, testimonials, or accommodation inventory.
- `theme.css`: named Journey tokens, light/dark surfaces, editorial typography, globe/grid motif, animated routes, responsive shell, and reduced-motion handling.
- `components.ts`: shared buttons, icons, badges, empty/error states, modal/drawer, CSV/file export, file validation, toast, and motion helpers. Lucide SVG assets are served through an allowlisted icon route. Generic field, table, tabs, stat-card, timeline, stepper, carousel, and upload patterns are shared through the theme and renderers.
- `config.ts` and `admin.ts`: module/field schemas, CRUD forms, bulk delete, CSV export, keyboard reorder, drag reorder, application Kanban, media upload, settings, and dashboard charts.
- `portal.ts`: student dashboard, route tracker, application timelines, exam registration/results, payments/instalments, bookings, advising, documents, inbox, notifications, and profile preferences.
- `public.ts`: CMS homepage, pathways filter, university/exam details, enrolment, about, FAQ, contact, and local access screens.
- `workspace.ts`: staff/student route guards, sidebar, responsive bottom navigation, global module search, notification/profile drawers, theme preference, and cross-tab refresh.
- `student-services/api.js`: bridge from the existing fees/application/consultation/hostel UI to the same typed store.

Form schemas use native browser constraint validation and typed service checks rather than adding a new React framework. All new data edits are routed through services. The portal renders plain text for user content; URLs are restricted to supported local, HTTPS, and file-preview formats. CSV exports escape formula-leading values. Uploaded files are MIME/size checked for preview; a real server must inspect contents and scan them.

## Persistence and demo roles

`pathway-journey-v2` in localStorage holds shared preview data on this origin. New tabs share that data. `pathway-journey-session` in sessionStorage selects a profile independently per tab; open a staff and student tab to see updates. Cross-tab storage events refresh the workspace, and refresh always reads current data. UI theme preference is local. Application drafts retain the existing explicit Save/Clear controls. A version marker adds new default CMS keys once without overwriting edited values. Uploaded preview files are data URLs in local browser storage and are limited to 2 MB; production files must move to private object storage. Browser quota can be lower than the sum of allowed files; failures are surfaced instead of pretending the save succeeded.

Default roles: Super Admin (all), Admissions Officer (admissions/student/exam/advising modules), Finance (fees/transactions), Hostel Manager (residences/rooms/carousel/bookings/media), and Content Editor (CMS/catalogue/stories/FAQs/media). Roles are editable by Super Admin. Guards hide modules and reject unauthorized service writes, but **client-side guards and an editable local store provide no production security**. They demonstrate the intended interaction only. Do not expose real student data through these mock routes.

External email/SMS/WhatsApp delivery is intentionally disconnected. Staff can save templates and send local in-app notifications; publishing an external-channel announcement returns a clear integration error. No third-party messages are sent. No payment SDK is called, and simulated Paid/Refunded statuses do not move money. Real admission decisions, visas, and university/hostel allocations require verified server-side workflows.

## Suggested backend endpoints

All private endpoints require server-owned authentication, ownership checks, field-level authorization, CSRF protections where relevant, and rate limits. Enforce roles on the server; do not trust the profile selector or any browser-supplied role.

| Area | Endpoints |
|---|---|
| Identity | POST /api/auth/login, /signup, /logout; GET /api/auth/session; POST /api/auth/password/reset; PATCH /api/student/profile |
| Site/CMS | GET /api/public/site; GET /api/public/pages/:slug; staff PATCH /api/admin/content/:id; POST/DELETE /api/admin/content |
| Universities | GET /api/public/universities, /universities/:id; staff CRUD /api/admin/universities; PATCH /api/admin/universities/order |
| Exams | GET /api/public/exams, /exams/:id; staff CRUD /api/admin/exams; POST /api/student/exam-enrolments; staff PATCH /api/admin/enrolments/:id; result upload endpoint |
| Journey/students | GET /api/student/journey; staff GET/PATCH /api/admin/students/:id and /journey |
| Applications | GET/POST /api/student/applications; GET /api/student/applications/:id; staff PATCH /api/admin/applications/:id/status and /assignment; GET /history |
| Documents/media | POST /api/uploads/presign; POST /api/student/documents; GET/DELETE /api/student/documents/:id; staff PATCH /api/admin/documents/:id/review; CRUD /api/admin/media |
| Fees/payments | GET /api/student/invoices, /payments; POST /api/student/payments/checkout; GET /payments/:id/receipt; staff CRUD /api/admin/fee-structures; staff POST /api/admin/payments/:id/refund; signed provider webhook endpoints |
| Accommodation | GET /api/public/hostels, /rooms; staff CRUD /api/admin/hostels, /rooms, /carousel; PATCH /api/admin/carousel/order; POST /api/student/bookings; staff PATCH /api/admin/bookings/:id; use atomic holds and inventory allocation |
| Advising | GET /api/public/consultation-slots; staff CRUD /api/admin/slots and /advisors; GET/POST /api/student/consultations; PATCH /:id/reschedule; POST /:id/cancel; staff PATCH /api/admin/consultations/:id |
| Messages/updates | GET/POST /api/student/messages; GET /api/student/notifications; PATCH /notifications/read; staff POST /api/admin/announcements/publish with audience permissions; SSE/WebSocket /api/student/events optional |
| Settings/security | staff GET/PATCH /api/admin/settings and /roles; server-owned append-only GET /api/admin/audit; paginated CSV exports and validated bulk actions |

Replace service bodies with these requests without changing the screen renderers. Avoid returning entire datasets to unauthorized roles; the mock's in-browser filtering is not a server access control mechanism. Use durable IDs, pagination, optimistic locking, transactional status changes, immutable audit records, and idempotent payment/enrolment/booking operations. Availability must be term/date-specific in production; current inventory is an illustrative aggregate across preview bookings. Current dashboard revenue separates NGN and USD, without an invented FX conversion.

## Environment configuration

Existing: `NODE_ENV`, `PORT`, `DATABASE_PATH`.

Public allowlisted config (future `GET /api/public-config`): `PAYSTACK_PUBLIC_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `STRIPE_PUBLISHABLE_KEY`, canonical public site origin, and configured currencies. Placeholders are in `.env.example`; values are not hardcoded or embedded in the new bundles. Configure a narrow provider-specific CSP only when integrating the official SDKs.

Backend-only: `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`, `PUBLIC_SITE_ORIGIN`, private storage bucket/region/credentials, transactional email credentials/from-address, and optional SMS/WhatsApp provider credentials. Keep secrets out of CMS records and browser storage. Payment refund/mark-paid operations must require appropriate finance authorization, verification, reason, and immutable audit history. Passwords must be hashed server-side and never stored in localStorage. Replace sample content and verify institutional/brand permissions before publishing.
