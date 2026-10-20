# NewworldPathway — Phase 1 review

20 Oct 2026. Status: audit and plan only; stop for owner review before Phase 2.

## Confirmed decisions

- **Keep MongoDB Atlas and Prisma.** The owner explicitly selected this after the new brief mentioned PostgreSQL. No PostgreSQL migration is planned.
- One operational database: the existing TypeScript backend owns data. The public frontend, applicant area, student portal and admin workspace use that API. Legacy browser demo stores and the older SQLite server are not additional sources of truth.
- Use MongoDB replica-set transactions and shared guard documents for atomic allocation, settlement and capacity checks. Do not describe these as SQL row locks.
- Use Redis pub/sub for cross-instance live fan-out, with durable MongoDB RealtimeEvent records for replay. Redis is transport, not the authoritative application database.
- Preserve the globe component, geometry, speed and behaviour, existing routes and working authentication. Authentication changes are limited to those explicitly requested: verified free applicant accounts and email-or-Student-ID login.
- Stop for review at the end of every phase. No production deployment or database writes were performed in this phase.

## Branches and earlier work

Current audit branch in both repositories: `platform-phase-1`.

Production baselines: frontend `b60f4f8`, backend `f6c824d`. The earlier brief's work remains on `feature/catalogue-application-payments` (frontend checkpoint `500e75b`, backend checkpoint `cb09177`). It is not merged into this audit branch or production.

That prototype contains useful catalogue, private-upload and transfer-review work, but its guest-link applications and combined application/exam/hostel charge conflict with the new journey. Reuse individual pieces only after adapting them to free verified applicant accounts and separate invoices. Its tests do not prove the new journey exists.

## Source audit

| Area | Existing baseline | Required work |
| --- | --- | --- |
| Production routing | `frontend-server.cjs` proxies to the TypeScript API; Docker uses this server. | Keep the production entry point; isolate or retire legacy demo tooling without deleting historical data. |
| Database | Prisma MongoDB models, index provisioning and transaction guards already exist. | Add compatible models/backfills and index changes. Prisma Migrate SQL migrations do not apply to MongoDB; use versioned, repeatable MongoDB migration scripts with backup and verification. |
| Accounts | User roles are STUDENT and ADMIN. No free applicant signup/email-verification state. | Add applicant state, email verification, applicant-number allocation and gated capabilities. Preserve existing students and staff. |
| Login | Student password login resolves a Student ID. Staff login uses email and mandatory 2FA. | Extend student/applicant login to email or Student ID while preserving current sessions, request compatibility, lockouts and recovery. |
| Student ID | Shared payment settlement already allocates IDs atomically, reserves them permanently and queues setup links. | Promote the existing verified applicant identity after verified application-fee payment. Do not create a duplicate User. Keep legacy settlement paths compatible. |
| Applications | A basic public application and staff review are live; it creates no portal account. | Replace the new-entry journey with verified applicant accounts and the full form, while retaining existing submissions and routes. |
| Charges | Payment records and fee tables exist; there is no general Invoice/InvoiceItem layer. | Add immutable server-priced invoices: application fee first; separate exam invoices; hostel invoice for room plus caution deposit. No combined onboarding charge. |
| Bank transfer | BANK payments can be verified offline with recent staff MFA. | Add account management with password plus fresh TOTP, private proof records, flags, immutable instruction snapshots/history and a verification queue. |
| Files | Private S3-compatible objects, signed URLs, type checking and scan workflow exist. | Reuse ownership controls; enforce the specified 5 MB applicant/proof limit and fail closed without scanner/storage. Keep private keys out of the public-media Worker. |
| Background jobs | Encrypted database outbox, retries and worker/optional embedded runner exist. | Extend event/email jobs and verify actual delivery in staging. A sleeping API cannot guarantee prompt background processing. |
| Roles | Super Admin, Finance, Admissions, Hostel and Content roles exist. | Add Exams Officer and an explicit endpoint/action permission matrix. Enforce server-side, not just menu visibility. |
| Exams | Exams and enrolments exist; timetable is JSON on Exam. | Add entries, append-only change history, sessions, results, slip approval, clash detection and affected-student notifications. |
| Live updates | No authenticated replayable SSE system or RealtimeEvent model exists. | Add `/api/events`, durable replay, Redis fan-out, heartbeats, session checks, reconnect/backoff, polling fallback and health view. Extend the fixed frontend proxy allowlist deliberately. |
| Hostel | Transaction guards already prevent last-bed races. Holds are currently 15 minutes. | Gate on verified application fee, use server-priced invoices and make hold duration configurable with a 48-hour default and reliable expiry processing. |
| Public content | CMS content/catalogue APIs exist, but defaults and the supplied-photo section also contain code-defined content. | Move all publishable wording, photos, order and fees under admin control. Preserve supplied images and programme content; seed drafts without invented facts. |
| Portal | Existing student shell, payments, documents, messages and journey pages. | Add applicant-safe state, Results, timetable/calendar, live indicators and consistent mobile navigation without replacing unsaved forms on events. |
| Test tooling | Current isolated browser suites and real MongoDB tests exist alongside older fixed-port/demo tests. | Consolidate an explicit runner and mark legacy prerequisites. Never run demo bootstrap/payment scripts against production. |

## Curriculum preservation

The supplied “Curriculum & Academic Programmes” heading was not found as a dedicated source-rendered homepage block or in the currently published content/announcement API responses checked read-only. The ten programme labels are present in `backend/src/admissions.ts`; they are captured separately in `curriculum-preservation.md`.

Treat this content as protected input. Before the public-site phase, preserve the exact list and any owner-approved introductory copy in editable CMS data. Do not silently replace it with the new preparation catalogue or invent accreditation wording.

## Phase plan and acceptance gates

| Phase | Work | Gate before owner review |
| --- | --- | --- |
| 1 | Audit, architecture decision, branches, baseline tests and route inventory. | Honest pass/fail report; no implementation deployment. |
| 2 | Versioned MongoDB additions/backfills; free APPLICANT signup; email verification; account states; applicant number; invoices/items; application-fee-only promotion; email/ID login; Exams Officer role. | Atomic unique IDs, no reuse, duplicate/replay tests, existing-account compatibility, no portal privileges before verified application fee. |
| 3 | Payment accounts, fresh password/TOTP, masked audit/owner alerts, private proofs, flags, Finance queue, separate invoice settlement, receipts and CSV. | Reject missing/replayed step-up; verify actual bank credit; atomic idempotent settlement; reused-evidence and ownership tests. |
| 4 | Applicant-authenticated seven-step application; partial draft saving; guardian rules; catalogue options; private documents; declarations; export/delete request handling. | Server validation, saved incomplete drafts, duplicate prevention, 5 MB/type/scan checks, 360/768/1440px and keyboard checks. |
| 5 | Admin/student timetable, sessions, results, slips, CSV import, previews, clash detection and calendar downloads/subscriptions. | Correct WAT/local conversion, immutable change history, published-change reasons, enrolled-student-only visibility and verified-invoice/slip approval gating. |
| 6 | Durable user-scoped SSE, Redis pub/sub, replay, heartbeat, reconnect, polling fallback, health and two-browser E2E. | Open portal updates within about two seconds while services run; no unrelated events; replay three missed changes; no lost form input; revoked sessions stop streaming. |
| 7 | Hostel manager, room photos/order/cover, effective fees, transactional holds and invoice booking. | Verified application-fee gate; exactly one last-bed winner; configurable 48-hour default; expiry release and late-payment reconciliation tests. |
| 8 | Admin-driven public sections, draft seeds, protected curriculum, real-only testimonials and headline motion. | No fabricated claims; all content editable; honest empty states; reduced-motion support; globe source unchanged. |
| 9 | Admin/portal navigation, clipped elements, uniform hierarchy, typography, focus, help and status labels. | AA contrast, keyboard paths, responsive checks and no unsaved-form loss. |
| 10 | Deployment package, endpoint/env inventory, screenshots, final regressions and mobile performance. | All stated E2E scenarios; Lighthouse target measured, not assumed; staged rollout/rollback and owner review. |

## Compatibility and migration rules

1. Back up Atlas and confirm restore access before data changes. Use a separate staging database and private storage paths/bucket.
2. Add models/fields and indexes first. Backfill in idempotent batches with recorded counts. Do not drop existing collections or rewrite encryption keys as an incidental migration.
3. Keep existing Student IDs, passwords, staff MFA, issued receipts and payment references valid. Existing paid/manual-exception students remain students. Applicant promotion must update the same User identity.
4. Existing guest applications need a verified claim process; matching an email string alone is not authorisation to attach private documents or financial records.
5. Keep old endpoints and request shapes working through adapters. Route inventory is in `routes.json`. Add new fields/endpoints rather than silently changing the meaning of existing ones.
6. Persist invoice amounts, fee version and bank-instruction snapshots; later admin edits do not alter a settled invoice. Pending instructions must show approved active accounts and retain previous snapshots when refreshed.
7. Publish state changes, durable events and outbox work in the same MongoDB transaction. Redis outages must not undo a valid payment or lose replay history.
8. Subscription tokens must be revocable, scoped and hashed at rest; redact private calendar URLs from access logs. SSE payloads contain minimal identifiers/status, not documents, proof keys or bank details.

## Hosting and environment preparation

Retain the existing environment settings; never put secret values in this report or the repository. Later phases will document exact validation/defaults.

- Existing: `MONGODB_URI`, `NODE_ENV`, `PORT`, `FRONTEND_ORIGIN`, `PUBLIC_API_ORIGIN`, `JWT_SECRET`, `ENCRYPTION_KEY`, secure-cookie/proxy settings and Student ID policy.
- Private storage: existing `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`; approved public media remains separate. Configure frontend media/upload origins deliberately.
- Scanning: `SCANNER_URL`, `SCANNER_TOKEN`. Do not enable applicant/proof uploads with a scan bypass.
- Delivery: `RESEND_API_KEY`, `EMAIL_FROM`, optional existing SMS settings and an always-running worker when required. Verify sender/domain and real delivery in staging.
- Planned transport: `REDIS_URL`; validate streaming proxy behaviour and long-lived connections. Keep MongoDB as the source of truth.
- Planned administrative configuration: application/exam/hostel fees, account purposes, policies, exam sessions/subjects, document requirements, hold duration, notification audiences and published site content.

Previously shared credentials should be rotated through their providers before rollout. Encryption-key replacement requires a separate backed-up re-encryption procedure; do not simply replace it and lose access to stored encrypted data.

## Review boundary

Approve or revise this plan before Phase 2. Phase 1 changes documentation only. No feature from the earlier prototype is presented as a completed part of the revised platform.
