# Catalogue, applications and bank-transfer payments

Feature branches in both repositories: `feature/catalogue-application-payments`.

## Delivery sequence

1. Capture baseline checks and commit this plan.
2. Add editable draft catalogue content, public cards/empty states and managers. No invented fees, deadlines or institutional relationships. Draft content must not silently become published.
3. Extend guest applications with private, expiring draft access, seven-step UI, catalogue-driven options, conditional guardian consent, document validation and review.
4. Calculate charges on the server, snapshot active bank instructions and accept private payment proof.
5. Add bank-account step-up authentication (password plus TOTP), masked audit history, owner alerts and verification queue. Never issue an ID from an uploaded screenshot alone.
6. Connect verified transfers to the existing atomic account/Student ID/password-link flow, outbox emails, PDF receipts and CSV exports. Keep provider checkout available.
7. Run regressions and security checks; document screenshots, changed files, environment settings and deployment steps.

## Invariants

- Preserve all existing routes and permissions. Do not edit the rotating globe.
- No fees, visa rules, guarantees, accreditation or available beds inferred from example content.
- No applicant document, payment proof or draft token in public media, URL query logs or browser local storage.
- Ownership checks apply to every applicant/payment/document read. Public APIs never list applicants.
- Private uploads require real type/size validation and scanning; missing scanner/storage fails closed.
- A bank transfer is verified only after staff confirm actual credit. Verify/retry must be idempotent and transactional.
- Bank-account modifications require password and authenticator verification, not just an existing session.
- Use a dedicated isolated MongoDB replica set for integration tests. Do not write test applications into production.

## Baseline

20 Oct 2026: frontend and backend builds pass. Frontend deployment and admin authentication regressions pass. Thirteen isolated backend configuration, admissions, job-runner and storage tests pass. Full MongoDB integration cannot currently run: Docker Desktop Linux engine is unavailable. This is a verification gap, not a passing integration suite.

The unrelated untracked `backend/ops/public-media-worker*` files are preserved and excluded from feature commits. Keep this branch separate from production until the staged work is reviewed and verified.
