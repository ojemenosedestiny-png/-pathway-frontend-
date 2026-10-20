# Release verification — 20 Oct 2026

Status: tested review branch; production deployment pending the Render pre-deploy setup and backup confirmation. No production migration or research seed has run from this workstation.

## Completed checks

- Frontend TypeScript/assets build and backend TypeScript build pass.
- Fresh disposable MongoDB integration suite: 32 passed, 0 failed.
- Additional admissions and storage-status tests: 7 passed, 0 failed.
- Browser suites passed: frontend deployment, workspace authentication, workspace roles, public admissions, typography, workspace typography, live reliability, device uploads, applicant account, public trust content and trust administration. APIs and email/storage flows use synthetic fixtures.
- Typography route/viewport checks report zero contrast failures.
- Globe checks pass: geometry, rotation, drag, hover/offscreen/visibility pause, reduced motion, pixel density, destination navigation and label bounds. Viewports include 320, 360, 390, 768 and 1440px.
- Fixed footer overflow at 320px. Updated the globe test to start its own server and use a synthetic catalogue.
- Fixed the signup privacy-link 404. The replacement information page explicitly identifies the full policy as awaiting approval; signup consent no longer claims agreement to an unavailable policy.
- Globe source hashes match the pre-change baseline; no globe implementation was edited.

## Release order

1. Confirm a recoverable Atlas backup.
2. Save backend Render pre-deploy command: `node dist/prisma/migrate-phase2.js --apply && node dist/prisma/seed-exam-research.js --apply`.
3. Release backend main, confirm successful pre-deploy and `/health/ready`, and release its email worker from the same commit.
4. Release frontend main, then verify custom-domain pages, admin authentication, applicant flow and public endpoints.

Research seeds remain drafts and preserve existing owner edits. They do not set school fees. The owner still needs to approve legal/privacy/refund content and provide the outstanding details in the owner confirmation sheet.

## Current access limitation

Read-only Atlas previews from this workstation fail with a server-selection timeout, including with network permission. The live backend readiness endpoint returned 200; the existing production release is running. This workstation has no Render browser session or configured Render API access. A successful local build is not evidence of a production deployment.
