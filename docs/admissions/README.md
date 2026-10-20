# Public applications

Visitors can open `/apply`, choose an academic programme and submit their contact and study details without signing in. They receive an application reference on screen. No email delivery is promised by this flow.

Admissions staff open **Admin → Applicants** to read an application and record a review decision and comment. Acceptance does not create a student account, Student ID, password or payment. The existing verified registration payment and authorised owner exception flows remain responsible for creating portal accounts.

## Validation and privacy

- Consent is required. Programme choices and field lengths are validated by the API.
- CSRF checks and per-IP/per-email rate limits protect submissions.
- A UUID `Idempotency-Key` prevents duplicate records when a failed request is retried. Changing the form creates a new submission attempt. The browser stores only the attempt key and a SHA-256 signature, not the application details.
- Public responses contain only the reference, status and submission time. Reading applications requires the existing applications permission; changing a decision requires write access.
- Submission and review actions are audited. This feature does not expose a public applicant search.

## API and deployment

`GET /public/admission-programmes` returns the available programme names. `POST /public/applications` accepts firstName, lastName, email, phone, programme, consent (true), and optional currentSchool, currentLevel, guardianName, guardianPhone and notes. A new submission returns 201; an identical retry returns 200. Reusing a key with different details returns 409.

`GET /admin/applicants` lists applications. `PATCH /admin/applicants/:id/status` accepts status (UNDER_REVIEW, NEEDS_INFORMATION, ACCEPTED or REJECTED) and a required comment.

Deploy the backend before the frontend. Regenerate the Prisma client during the backend build. Startup creates the additional AdmissionApplication collection if needed; existing student records are not converted or removed. MongoDB must support transactions, as the existing backend already requires.

## Verification

Run `npm run build` in both repositories. Backend isolated checks: `node --test dist/test/admissions.test.js`. Full MongoDB integration: `npm test` in backend (requires Docker or a dedicated test replica set). Frontend browser check: `node public-admissions-qa.cjs` against the local frontend server. Its fixtures cover guest submission, consent, retries, staff review, restricted navigation and 360/768/1440px widths. The screenshot in this directory uses fictional applicant details.
