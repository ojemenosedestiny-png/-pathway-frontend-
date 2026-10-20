# Phase 2: applicant identity and invoice foundations

Status: implementation under review on `platform-phase-2`. MongoDB Atlas is retained as requested. No production deployment or production migration was performed.

## What is available

- Free `/signup`, explicit one-use `/verify-email` confirmation and `/applicant` account screens.
- Permanent `APP-year-number` reservations; no Student ID is issued at signup.
- Email or Student ID sign-in using the existing password/session security controls.
- Applicants can update their own name/phone after verifying their email and request the published application-fee invoice.
- Super Admin selects an active registration fee in Settings ? Application fee. Invoice prices come from server records and remain fixed after issue.
- Separate application, exam and hostel invoices, with line items and ownership checks. Hostel items use captured room/deposit amounts; older reservations with no reliable breakdown require staff review.
- Invoice payment foundation uses bank transfer records. Verified application-fee settlement promotes the same account, preserves its password, assigns one permanent Student ID and creates one receipt. Repeated settlement does not duplicate these records.
- Exams Officer role supports exam operations without finance or owner settings access.

## Phase boundary

Bank account instructions, proof uploads and the finance review queue are Phase 3. The seven-step application and its public entry flow are Phase 4. The applicant screen currently explains that admissions must provide payment instructions; it does not pretend that an upload or transfer has been verified. Existing public enquiry and legacy student/payment routes remain supported.

## Safe rollout after review

1. Back up the database and deploy to a staging service first. Keep the current production version available for rollback.
2. Generate the Prisma client and build: `npm ci --ignore-scripts`, `npm run generate`, `npm run build`.
3. Preview with `npm run migrate:phase2`. This reports counts only and does not write or print credentials.
4. After reviewing the backup and preview, run `npm run migrate:phase2 -- --apply` against the intended staging database. The additive migration creates missing collections/indexes and fills missing nullable fields. It preserves passwords, Student IDs, payments and old booking prices. Repeating it does not reissue identities.
5. The API and worker require the migration marker before starting this release. Configure the existing email delivery and worker settings; email is queued, not guaranteed delivered at signup.
6. In staging, select the application fee, create a test applicant, verify the email and exercise payment confirmation. Deploy to production only after separate review.

No new secrets or environment variables are required. Use the existing `MONGODB_URI`, signing/encryption keys and mail settings. Never put credentials in screenshots, commits or browser storage.

## API additions

Public CSRF-protected POSTs: `/auth/applicant/signup`, `/auth/applicant/verify-email`.
Authenticated applicant routes: GET/PATCH `/applicant/profile`, POST `/applicant/resend-verification`.
Owned invoice routes: GET `/applicant/invoices`, GET `/applicant/invoices/:id`, POST `/applicant/invoices/application|exam|hostel`, POST `/applicant/invoices/:id/payment`.
Owner settings: GET/PUT `/admin/application-fee-policy` with `{feeId}`.
Login keeps the existing `/auth/student/login` field `studentId`, accepting email or Student ID.

## Verification

Browser fixture screenshots are in `screenshots/` at 360, 768 and 1440px. They contain synthetic applicant data, not live records. `applicant-account-qa.cjs` exercises signup, confirmation, contact details, server-priced invoice requests, CSRF forwarding and horizontal overflow checks.

The rotating globe and geometry files retain the Phase 1 SHA-256 hashes. The ten protected curriculum labels are unchanged.


Validation results: frontend production build passed; production route/private-file/CSP checks passed; applicant browser journey passed at all three widths; existing admin password/MFA/recovery browser test passed. The isolated MongoDB suite passed 25 tests; the additional invoice-math and Exams Officer permissions test passed separately. Backend compilation is checked before the review checkpoint is committed.
