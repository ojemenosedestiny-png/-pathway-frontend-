# Payment-linked student access, owner accounts, and Post Information

## What is implemented now

The Journey design and typed service architecture are extended with:

1. `/enrol` and `/payment-status?ref=…`: registration/enrolment checkout and pending, failed, abandoned, and successful result screens; copyable Student ID; downloadable demo receipt; portal link. The development simulator explicitly imitates a signed webhook plus a verify response, without contacting a provider.
2. `/student/login`, `/set-password#token=…`, `/forgot-password`, `/recover-student-id`: Student ID login, show/hide password, Remember me, single-use 24-hour links, first-access setup, temporary lockout, reset and ID recovery. `/login` and `/signup` lead to the new access/payment flow. The original exam logins remain separate at `/portal.html` and `/admin.html`.
3. `/admin/login`: separate staff login with mandatory email-code second factor, 5-minute challenge, 5 attempts, 20-minute idle timeout, 8-hour absolute timeout, and all-device logout. The first local owner is provisioned through an explicitly labelled browser-preview form. There are no seeded browser passwords or default owner credentials.
4. Staff modules: `#studentAccess`, `#registrationPayments`, `#idSettings`, `#adminUsers`, `#accessAudit`. Existing CMS, catalogue, carousel, fees, universities, FAQs, and Journey modules remain available subject to permissions. Staff have separate View and Edit permissions. The last active Super Admin cannot be removed or demoted.
5. `#posts`: Post Information editor with sanitized rich text, attachments, category, pinning, publication/expiry times, audience selectors, placements, optional external-channel intentions, and preview before publishing. Posts appear in homepage banners, `/news`, student dashboard and notification sections. Read states are per student. Scheduled/expired visibility is calculated at read time in the prototype.

`access-service.ts` is the replacement boundary and includes `createStudentAfterPayment`, `generateStudentId`, `loginStudent`, `resendCredentials`, `createAnnouncement`, and `publishAnnouncement`. `access-types.ts` defines the contracts. `access-ui.ts`, `access-admin.ts`, `posts.ts`, and `rich-text.ts` implement the screens and rendering. `access-qa.cjs` tests critical provisioning/auth/post flows with random test-only passwords.

**BACKEND REQUIRED:** Local storage, PBKDF2 browser preview digests, browser-owned sequence counters, simulated payment verification, preview deliveries, local rate limits, MFA/session checks, and audit records are not production security. No real provider is contacted, no credential email/SMS/WhatsApp is sent, and no live student access is activated. Developer tools can alter browser state. Production must use the server contract below. The local delivery preview deliberately exposes test setup links and MFA codes to make this disconnected UI reviewable; remove it entirely in production. Do not use real passwords or personal documents in the mock.

## Secure server-side owner seed

Set `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` privately, then run `npm run seed-owner`. No default values are provided. The script uses bcrypt (cost 12), rejects passwords below 12 characters or above 72 UTF-8 bytes, creates a unique owner record in `owner_admin_accounts`, requires 2FA and initial password change, and refuses to overwrite an existing account. It never prints the password or hash. It has not been run against a real owner identity because credentials have not been provided. Remove the initial password from the environment after seeding. The new table is intentionally separate from legacy exam admins.

**BACKEND REQUIRED:** Wire the seeded owner table into the following server authentication endpoints. The browser-preview owner is a separate, local-only identity and cannot sign in as the seeded server owner. Validate configured email ownership before production email-MFA. Optional authenticator support should use encrypted TOTP secrets, enrollment confirmation, recovery codes, and replay prevention; the current interface uses the permitted email-code alternative.

## HTTP conventions

JSON over HTTPS. IDs and references are opaque except the public Student ID format. Datetimes use RFC 3339 UTC; the UI converts local scheduling input to UTC. Money is integer minor units, e.g. NGN 50,000 = `5000000`; never use floating-point currency on the server. A successful response is `200` or `201`; asynchronous provider work can return `202`.

Error shape:

```json
{"error":{"code":"PAYMENT_NOT_VERIFIED","message":"Payment verification is pending.","fields":{},"requestId":"req_…"}}
```

Status codes: `400` invalid input, `401` unauthenticated or invalid credentials, `403` unauthorized/CSRF failure, `404` unavailable record, `409` duplicate/conflict, `410` expired/used token, `422` invalid state, `429` rate limit (include `Retry-After`). Avoid account enumeration in login, reset, and recovery responses.

Server sessions use signed, opaque `HttpOnly; Secure; SameSite=Lax` cookies; regenerate on authentication and MFA completion. Do not store session credentials in localStorage. `GET /auth/csrf` returns `{ "csrfToken": "…" }`; require `X-CSRF-Token` plus an allowlisted `Origin` on authenticated unsafe requests. Signed provider webhooks are exempt from cookie CSRF and use their own signature validation. Apply role/module **and write permission** checks on every admin route and API call; never trust the browser role selector or user-supplied student ownership.

## Payment and ID issuance

### POST /payments/checkout

```json
{"applicant":{"name":"Applicant","email":"applicant@example.test","phone":"+234…"},"feeId":"registration-fee","purpose":"Registration","provider":"Paystack","currency":"NGN"}
```

Require an idempotency key header. Validate fee purpose, provider/currency compatibility and current server-owned amount. Return:

```json
{"payment":{"reference":"pay_…","status":"pending","amountMinor":5000000,"currency":"NGN","purpose":"Registration"},"checkout":{"url":"https://provider.example/…","publicKey":"configured-public-key"},"checkoutStatusToken":"short-lived-opaque-token"}
```

Bank-transfer checkout returns bank instructions instead of a provider URL. Public keys may be returned through an explicit public-config allowlist; no secrets go to the browser. Fee payments for an existing student must not provision another student. A registration retry should retain its logical invoice/application identity.

### POST /payments/webhook?provider=paystack|flutterwave|stripe

Accept the **raw** provider body. Verify the provider's official signature against server-only secrets before parsing/trusting event contents. Reject unsupported provider/event types. Retain an immutable provider event ID with a unique constraint. Queue server verification by reference and acknowledge authentic duplicate events with `200` without duplicating side effects.

```json
{"received":true,"duplicate":false}
```

### GET /payments/verify/:ref

Requires the checkout status token or the owning student's authenticated session; a reference alone must not expose PII or setup links. Server calls the provider verification API and reconciles provider account, invoice, purpose, amount, currency, and reference. A browser redirect does not mark success. Signed webhook observation plus this independent provider verification drive the same provisioning transaction.

```json
{"payment":{"reference":"pay_…","status":"success","verified":true,"amountMinor":5000000,"currency":"NGN"},"provisioning":{"status":"complete","studentId":"PU-2026-000123"},"receiptUrl":"/payments/pay_…/receipt"}
```

Pending/failed/abandoned responses have `verified:false`, `provisioning:null`, and **no Student ID**. Return `202` with `provisioning.status:"processing"` if the verified payment has not finished its transactional work; polling is safe. On ambiguity, never issue an ID.

### Internal createStudentAfterPayment(reference)

This is a trusted server operation, not a public arbitrary-ID endpoint. It runs after verified success, including offline verification. In a transaction:

1. Lock the payment/invoice; verify its eligible purpose and reconciled successful state.
2. Return the existing student if `payment.student_id` is already set.
3. Enforce unique payment-to-student/invoice-to-student constraints. Resolve an already-owned applicant identity without creating a second student; route conflicting identities to staff review.
4. Allocate `[PREFIX]-[YEAR]-[6 digits]` from a database sequence or locked counter, with a unique immutable ID ledger. Preserve counters/tombstones even when accounts are removed. Never recycle IDs. Validate prefix and handle sequence exhaustion. The year is the configured school timezone year (Africa/Lagos by default).
5. Insert a student in Active state with `must_set_password=true`, no usable password yet, and the payment reference; attach it to the payment.
6. Insert a single transactional outbox record for credentials delivery. Store only a hash of a random 256-bit single-use setup token, expiring in 24 hours. Commit before asynchronous delivery. Unique outbox keys prevent repeated credentials from duplicate webhooks; explicit resend invalidates the old token and records a new outbox event.

Worker sends Student ID plus the HTTPS set-password link to the verified email address. Never email plain-text passwords. SMS/WhatsApp are optional separate opted-in delivery channels. Failed delivery retries the outbox, not student provisioning. Protect token URLs with no-referrer headers and redact them from logs; use fragment-to-POST exchange or a secure token exchange endpoint.

### GET /payments/:ref/receipt

Authenticated owner or authorized finance only. Return a server-generated printable/downloadable receipt for a verified payment with reference, date, amount/currency, and student name/ID. Do not render a Paid receipt from client-supplied status.

### POST /admin/payments/:ref/verify-offline

Finance/Super Admin write permission, CSRF, recent MFA, and audit required:

```json
{"reason":"Bank transfer reconciled","bankReference":"bank_…","evidenceAttachmentId":"file_…"}
```

Only offline payments can be manually verified this way. Persist verifier, timestamp, evidence, invoice reconciliation and reason; invoke the same idempotent provisioning operation. Do not relabel a failed card payment as verified without provider evidence.

## Student authentication and recovery

### POST /auth/student/login

```json
{"studentId":"PU-2026-000123","password":"user-entered-password","rememberMe":false}
```

Return `{ "student": { "id":"stu_…", "studentId":"PU-2026-000123", "name":"Applicant", "status":"Active" }, "mustSetPassword":false, "expiresAt":"…" }` and set the session cookie. Accounts needing initial setup cannot obtain a full portal session until setup completes. Hash passwords server-side using bcrypt/Argon2id; compare in constant time. Lock for 15 minutes after 5 failed attempts, rate limit by account and IP, and use generic errors. Remember-me uses rotating server-owned refresh/session cookies with a bounded lifetime (e.g. 30 days), never a saved password. Suspended students cannot authenticate; suspension revokes all sessions.

### POST /auth/set-password

```json
{"token":"raw-single-use-token","password":"new-password"}
```

Validate password policy, compare hashed token, reject expired/used tokens with `410`, atomically store the password hash, consume/invalidate all outstanding setup/reset tokens, clear the initial-setup flag, and revoke previous sessions. Return `{ "passwordSet":true, "loginUrl":"/student/login" }`. Do not automatically grant a session from a token replay. A first-access setup link fulfills the initial password-change requirement without distributing an initial password.

### POST /auth/student/forgot-password

Request `{ "email":"registered@example.test" }`; always return `202 { "message":"If an eligible account matches, a password link will be emailed." }`. Rate limit account+IP, e.g. 3 requests/15 minutes. Queue a single-use 24-hour reset link; never reveal whether the account exists.

### POST /auth/student/recover-id

```json
{"email":"registered@example.test","phone":"+234…","paymentReference":null}
```

Require email plus matching phone **or** payment reference; normalize phones to E.164. Always return generic `202`. Send the recovered ID to the registered/verified email rather than returning it in the response. Rate limit and audit. For sensitive production recovery, use an email verification challenge/OTP before revealing anything or changing account data.

### GET /auth/session; POST /auth/logout; POST /auth/logout-all

Session returns authenticated principal, roles/modules, required setup/MFA state and expiry, or `401`. Logout invalidates the current session; logout-all increments the principal session version and revokes every server session/refresh token. Require CSRF on logout mutations.

## Staff login and owner controls

### POST /auth/admin/login

Request `{ "email":"owner@example.test", "password":"user-entered-password" }`. After bcrypt/Argon2 verification, return `{ "mfaRequired":true, "challengeId":"challenge_…", "method":"email", "expiresAt":"…" }`. Set only a restricted pre-auth cookie; issue **no full admin session** yet. Rate limit account+IP. Store only a code hash, bind challenge to pre-auth session, expire after 5 minutes and at most 5 attempts. Send the code through a server email provider. Log failed and successful authentication without passwords/codes.

### POST /auth/admin/2fa/verify

Request `{ "challengeId":"challenge_…", "code":"123456" }`. Atomically consume the challenge and rotate to a full admin session cookie. Return `{ "admin": { "id":"adm_…", "email":"…", "role":"Super Admin" }, "permissions": {"read":["*"],"write":["*"]}, "expiresAt":"…", "mustChangePassword":true }`. A seeded initial password requires a restricted password-change screen before full workspace access; require old password/recent MFA, bcrypt/Argon2 hashing, CSRF, session rotation and initial-password flag clearing. Endpoint: `POST /auth/admin/change-password { oldPassword, newPassword }`. This restricted server onboarding is part of the backend implementation; browser owner previews use user-chosen passwords only.

### GET/POST /admin/users; PATCH/DELETE /admin/users/:id

Super Admin only. List excludes password hashes/MFA secrets. Create request `{ "name":"Officer", "email":"officer@example.test", "role":"Finance", "status":"Active" }`; production sends an expiring staff invitation rather than exposing a chosen password. Patch updates role/status/name or starts a reset/invitation; changing access revokes sessions. Preserve at least one active Super Admin, including under concurrent requests. Delete revokes sessions and preserves audit identity/tombstones. Responses return sanitized user objects.

### GET/PUT /admin/roles/:role/permissions

PUT `{ "read":["dashboard","payments"], "write":["payments"] }`. Module names are server-allowlisted, write implies read, and Super Admin owner recovery access cannot be removed. Enforce every permission on server endpoints as well as hiding/disable UI controls.

### GET /admin/students; POST /admin/students/manual

Student list includes immutable Student ID, payment reference, Active/Suspended status, initial setup flag, cohort, and exam groups. Manual create `{ name,email,phone,reason }` requires Super Admin or an explicitly authorized special-case permission, recent MFA and audit; it bypasses payment only with a recorded reason, allocates a non-reused ID, and queues the same credential link. Never allow ordinary applicant callers to create students directly.

### POST /admin/students/:studentId/resend-credentials; POST /admin/students/:studentId/reset-password

Return `202 { "queued":true }`. Create a fresh 24-hour link and invalidate prior links. Reset/set-password completion revokes sessions. No plain password or raw token is returned to staff. Apply delivery rate limits and audit.

### PATCH /admin/students/:studentId/status; PATCH /admin/students/:studentId/groups

Status `{ "status":"Suspended", "reason":"…" }`; groups `{ "cohort":"2026-A", "examGroups":["WAEC"] }`. Validate authorization, append audit, revoke sessions on suspension, and update audience membership.

### GET/PUT /admin/settings/student-ids

PUT `{ "prefix":"PU", "startingNumber":123 }`; return `{ "prefix":"PU", "startingNumber":123, "nextNumber":124 }`. Prefix: 2–10 uppercase alphanumeric characters beginning with a letter. Numbers: 1–999999. Only change future allocations; immutable reservations/counters prevent reuse even if the configured starting value decreases. `generateStudentId()` is a trusted internal transactional allocator, not a public browser allocation endpoint.

### GET /admin/audit?cursor=…&limit=…

Super Admin/full-audit permission; include actor, timestamp, action, target, old/new safe values, reason, request ID and source. Never include passwords, tokens, MFA codes, full payment payloads or unnecessary PII. Append-only server storage; export uses the same permission and CSV-injection protection.

## Post Information

### POST /admin/announcements; PATCH /admin/announcements/:id

```json
{"title":"Registration update","bodyHtml":"<p>Please bring your <strong>transcript</strong>.</p>","attachmentIds":["file_…"],"category":"Admissions","pinned":true,"publishAt":"2026-11-01T08:00:00Z","expiresAt":"2026-12-01T18:00:00Z","audience":{"type":"Cohort","value":"2026-A"},"placements":["Student dashboard","Notification bell"],"channels":["Email"],"status":"Draft"}
```

Return `{ "announcement": { "id":"post_…", …normalizedFields, "status":"Draft", "version":1 } }`. Sanitize bodyHtml on the server with a maintained allowlist: paragraphs, headings, lists, strong/emphasis, blockquotes, safe anchors. Strip scripts, event handlers, styles, embedded media, forms, SVG/MathML, and unsafe URL protocols. Render sanitized HTML only. Attachments use private scanned uploads; never trust a client URL or MIME declaration. Validate audience/placement compatibility to prevent private posts leaking to public banners/news. Use optimistic version checks for edits.

Audience types: Website, All students, Exam group, Cohort, Student. Student audience values are stable internal IDs or resolved immutable Student IDs. Placements: Homepage banner, News page, Student dashboard, Notification bell. Channels: Email, SMS, WhatsApp (optional, consent-aware). Group targeting and read receipts must be server-filtered, not downloaded and filtered in the browser.

### POST /admin/announcements/:id/preview

Return sanitized renderable content, resolved audience counts and placement preview without publishing/sending. Do not reveal private recipient lists to unauthorized content editors.

### POST /admin/announcements/:id/publish; POST /admin/announcements/:id/archive

Publish validates dates, audience, placement and write permission, then returns `{ "status":"Scheduled", "publishAt":"…" }` or `{ "status":"Published", "publishedAt":"…" }`. A durable scheduler transitions Scheduled → Published and expired posts → Archived; records retain history. Use idempotent audience-delivery outbox jobs so repeated publish calls cannot duplicate notifications/emails. Archive removes visibility and cancels unsent deliveries while retaining audit/history. External channels require configured providers, consent, unsubscribe handling and rate limits. The mock records channel choices without sending.

### GET /announcements?placement=News%20page; GET /student/announcements?placement=Student%20dashboard

Public endpoint returns only public, currently visible posts. Student endpoint requires the session and resolves audience membership server-side. Return `{ "items":[{"id":"post_…","title":"…","bodyHtml":"sanitized…","attachments":[],"category":"Admissions","pinned":true,"publishedAt":"…","read":false}], "nextCursor":null }`.

### POST /student/announcements/:id/read

Authenticated audience member, CSRF, idempotent; return `{ "read":true,"readAt":"…" }`. A student cannot mark another student's state or access a private post outside their audience. Optional SSE/WebSocket notification events can refresh the portal; refresh alone must always show current state.

## Environment variables and deployment gate

Existing server variables remain. Add/configure server-only `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` (seed only), `SESSION_SECRET`, `PUBLIC_SITE_ORIGIN`, `STUDENT_ID_PREFIX`, `STUDENT_ID_START_NUMBER`, payment secret keys and webhook secrets, SMTP/email provider credentials/from-address, optional SMS/WhatsApp credentials, private storage settings and signing keys. Only `PAYSTACK_PUBLIC_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `STRIPE_PUBLISHABLE_KEY` and explicit non-sensitive settings belong in public config. Never make owner credentials, provider secrets, OTPs or setup tokens editable public CMS fields.

Before production: replace the mock adapter; remove owner-preview bootstrap, local delivery preview, provider simulator and role-selector code; implement server-owned IDs/sessions/MFA/rate limits/audits; signed-webhook + verify reconciliation; CSRF and role checks; private uploads; transactional outbox delivery; scheduler; and contract/integration tests for concurrency, duplicate webhooks, amount mismatch, suspended users, expired/used tokens, CSRF failures and permission revocation. The original exam backend is not automatically migrated to the new identity table; explicitly map issued IDs before sharing those credentials across systems.
