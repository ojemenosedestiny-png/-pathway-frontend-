# Student services frontend

**Current architecture:** These screens now use the shared typed Journey store through `api.js`. Staff-created fee structures, rooms, consultation slots, and application reviews are shared with `/admin` and `/portal` through localStorage. Uploaded application files are retained locally for staff review (2 MB per file). The earlier session-storage-only description below describes the original preview; [Journey integration notes](../journey/INTEGRATION.md) are the current handoff reference.

The existing Express + HTML/CSS/JavaScript app is extended, not replaced. New screens share `student-services.html`, use existing brand tokens/fonts in `redesign.css`, and add isolated styles in `services.css`. Pages: `/pay-fees`, `/apply`, `/application-status`, `/book-consultation`, `/hostel?room=cedar`, `/my-bookings`, `/student-dashboard`. The existing authenticated exam portal remains separate.

## Preview and validation

Run `node server.js`, then open `/student-dashboard`. There is no frontend compilation step for this stack. Browser ES modules use native constraint validation (required, email, date, number, patterns) plus cross-field and file validation. Entity contracts are in `types.d.ts`, with JSDoc service signatures; these are not yet a fully TypeScript-compiled application. `node services-qa.cjs` exercises the flows using installed Playwright and Chrome. Set `UI_BASE_URL` if the test server uses a different port.

The mock service (`api.js`) uses tab session storage for demo records; it does not call live endpoints, authenticate users, charge money, transmit documents, or reserve real rooms. Application drafts are saved in local storage only when explicitly requested. Documents stay in memory and must be reselected after navigation. Clear drafts on shared devices. All hostel names, prices, amenities, rules, and inventories are illustrative. Existing campus images are explicitly labelled as illustrative, not room photography. Replace them with verified property data before launch.

## Backend adapter contract

Replace `api.js` implementation while retaining its exported interface. Validate all fields on the server and derive prices from authoritative invoices/inventory, not the browser.

| Service method | Suggested endpoint |
|---|---|
| listPayments | GET /api/student/payments |
| createPayment | POST /api/student/payments (invoice ID, currency, provider; returns checkout reference) |
| simulatePayment | Demo only: remove for production; GET /api/student/payments/:id/status verifies webhook-backed status |
| submitApplication | POST /api/student/applications |
| listApplications | GET /api/student/applications |
| saveDraft / loadDraft / clearDraft | PUT / GET / DELETE /api/student/application-draft |
| Document upload | POST /api/student/uploads (signed upload URL, malware scan, access controls) |
| availableSlots | GET /api/consultations/slots?date=YYYY-MM-DD (UTC instants) |
| bookConsultation | POST /api/student/consultations |
| listConsultations | GET /api/student/consultations |
| rescheduleConsultation | PATCH /api/student/consultations/:id |
| cancelConsultation | POST /api/student/consultations/:id/cancel |
| listRooms | GET /api/hostel/rooms (filters, term-specific inventory and verified images) |
| reserveRoom | POST /api/student/hostel/bookings (atomic inventory hold + verified payment) |
| listBookings | GET /api/student/hostel/bookings |

Real application statuses must be staff-controlled. Confirm/reject is not exposed as a student action. The timeline includes possible outcomes, not a guaranteed progression. Calendar export creates a draft event or downloads a file; it does not send invitations. Appointment availability is currently school business hours in Lagos, rendered in the selected display timezone.

## Environment variables and checkout

Existing: `PORT`, `DATABASE_PATH`, `NODE_ENV`. Future public configuration: `PAYSTACK_PUBLIC_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `STRIPE_PUBLISHABLE_KEY` (empty placeholders in `.env.example`). Vanilla browser code cannot read `.env`; expose only explicitly allowlisted public values via a future `GET /api/public-config`. The mock UI deliberately makes no SDK calls and displays no card-entry fields. A real checkout adapter must load official provider SDKs and apply a narrow, provider-specific CSP.

Backend-only secrets still required: `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; plus your mail and private document-storage configuration. Never expose these through public config. Set the canonical HTTPS site origin for redirects and webhook URLs. Verify signed provider webhooks server-side, use idempotency keys, reconcile invoice amounts/currencies, and only then issue real receipts or confirm hostel inventory. Integrate the existing student session authentication with all student endpoints; the current preview dashboard is not authenticated. Rate limits, document retention/consent, cancellation rules, and privacy notices must be set before launch.
