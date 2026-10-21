# Website and portal release review — 21 October 2026

## Changes

- Portal startup retries read requests after network failures or HTTP 502/503/504, with three delayed retries. It displays connection progress and provides reconnect, sign-in and website navigation if the service stays unavailable. Authentication failures still redirect to login. Writes are never automatically replayed by this recovery flow.
- The bundled director portrait has a content version in its URL so browsers refresh an older cached image. Admin-selected replacement portraits remain supported.
- Upload signing no longer attaches an optional CRC32 checksum calculated from an empty body before the browser supplies the file. Cloudflare R2 configuration with region `auto` now explicitly requires its account endpoint instead of silently creating an AWS upload URL.
- The backend runner discovers every test file. Previously omitted admissions and storage-status coverage now runs by default. The frontend has a repeatable `npm test` regression runner.
- Student welcome and exam introduction panels have solid green background fallbacks and stronger text contrast.

## Verification

- Backend: build and all **48 tests passed**, using an isolated Docker MongoDB replica set. No production student records were changed.
- Frontend: all 26 existing regression checks passed after correcting an outdated footer-link assertion and a hydration race in the logo test. The resulting **27 checks all pass**. Added a startup recovery check for transient failures, sustained failure, manual reconnect, mobile width and logged-out redirects.
- Coverage includes public CMS updates, admin permissions, student examination publication, applications, consultation requests, authentication/MFA, upload UI, server-authoritative payments, responsive layouts, typography, globe motion, FAQs and director navigation.
- Browser integration tests use synthetic API responses. They verify client wiring and failure handling; they do not establish that every external production provider is configured.

## Live checks

At approximately 17:39–17:45 WAT, the public site and session API responded again after the earlier deployment interruption. A real Chrome check at 360px confirmed the director page displays **Mrs. Folakemi Olasanya**, loads the portrait and has no horizontal overflow. The downloaded live portrait, bundled portrait and owner-supplied `mrs fumi.jpeg` have identical SHA-256 hashes. A logged-out visit to `/portal` redirected to `/student/login` successfully.

The live frontend release observed during this check was `ef1d42bcb79d`; it predates the recovery and portrait-version changes in this review. Those changes require deployment. No Render service settings were changed and no paid hosting was created. Client retries cannot guarantee availability during an extended hosting outage.

A real authenticated Cloudflare upload and signed-in production student/admin session still require an authorized account session. The upload signer and client flow were tested locally; this report does not claim a real production file was uploaded.

## Technical references

- [AWS SDK data integrity configuration](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html)
- [Cloudflare R2 AWS SDK v3 endpoint configuration](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
