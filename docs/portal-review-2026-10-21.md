# Admin and student portal module review

## Scope

This follow-up checks each configured admin module and every student navigation page, plus profile and adviser appointments, at 360px and 1440px. The machine-readable result is [portal-module-review-2026-10-21.json](portal-module-review-2026-10-21.json).

Each module check verifies the correct page heading, completed loading, no error alert, no document-level horizontal overflow, and an enabled heading entrance animation. Shared browser tests additionally verify reduced-motion behavior, navigation, roles, fee saves, photograph saves, uploads, CMS publication, FAQs and examination changes reaching the student view.

## Changes

- Added a consistent, short entrance animation for first page headings on public, access and service pages. Portal headings use the same motion. Text remains complete and accessible; no typing effect, repeating animation or layout reflow is introduced. Reduced-motion preferences disable animation.
- Corrected media and document helper text that still described the retired scanning requirement. Uploads continue through server-side file validation.
- Expanded the portal regression check from a manually maintained subset to the configured module list, with extra profile/appointment pages. It now waits for loading to finish instead of ignoring loading timeouts and records each module/viewport result.

## Backend and live boundaries

The fresh backend build and all 48 tests passed against isolated local MongoDB. They exercise authentication, MFA, role limits, admissions, account issuance, payment verification and concurrency, private records, booking capacity, examination enrolment, document rebuilding, upload configuration and signed URL generation.

Live frontend health and backend readiness returned 200. An unauthenticated session returned 401 as expected. Browser feature tests use synthetic API data; they do not authorize or perform edits to real school accounts. Actual signed-in production uploads, mail delivery and payment provider transactions are not certified by these tests.

The heading/copy changes must be deployed before appearing on the live site. No paid service or hosting setting was changed.

## Individual module results

All **72 module/viewport checks passed**: 27 admin modules and 9 student pages at two widths.

| Panel | Module | 360px | 1440px |
|---|---|---|---|
| Admin | Overview | Pass | Pass |
| Admin | Students | Pass | Pass |
| Admin | Applicants | Pass | Pass |
| Admin | Applications | Pass | Pass |
| Admin | Document review | Pass | Pass |
| Admin | Payments | Pass | Pass |
| Admin | Fees manager | Pass | Pass |
| Admin | Hostel manager | Pass | Pass |
| Admin | Rooms & beds | Pass | Pass |
| Admin | Hostel bookings | Pass | Pass |
| Admin | Exam preparation | Pass | Pass |
| Admin | Exam enrolments | Pass | Pass |
| Admin | University pathways | Pass | Pass |
| Admin | Destinations | Pass | Pass |
| Admin | Courses | Pass | Pass |
| Admin | Consultations | Pass | Pass |
| Admin | Visitor consultations | Pass | Pass |
| Admin | Adviser availability | Pass | Pass |
| Admin | Post information | Pass | Pass |
| Admin | Site content | Pass | Pass |
| Admin | Hostel carousel | Pass | Pass |
| Admin | Media library | Pass | Pass |
| Admin | Admissions inbox | Pass | Pass |
| Admin | Staff accounts | Pass | Pass |
| Admin | Roles & permissions | Pass | Pass |
| Admin | Audit log | Pass | Pass |
| Admin | Settings | Pass | Pass |
| Student | Home | Pass | Pass |
| Student | My journey | Pass | Pass |
| Student | Your exams | Pass | Pass |
| Student | Payments | Pass | Pass |
| Student | Hostel | Pass | Pass |
| Student | Documents | Pass | Pass |
| Student | Messages | Pass | Pass |
| Student | Your profile | Pass | Pass |
| Student | Adviser appointments | Pass | Pass |

## Final regression result

All 28 frontend regression checks passed, including the corrected individual module rerun and the new heading-motion check. The fresh backend build and 48 tests also passed. [Regression evidence](portal-regression-results-2026-10-21.json). The initial Settings assertion counted an empty form validation slot; the corrected assertion rejects non-empty error alerts and the full module rerun passed.
