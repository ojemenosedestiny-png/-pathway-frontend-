# Live content and payment-return fixes

## Changes

- Main public pages use the existing `/public/content`, catalogue and announcement endpoints rather than the browser's preview store. Existing saved preview data is left untouched but no longer controls these pages.
- CMS string values override editorial defaults; an empty live catalogue remains empty and never displays invented institutions, payments or bookings. FAQs, testimonials and statistics use structured CMS values under their existing keys. Reload the public page after saving content in admin.
- The adapter resolves country/course relationships and maps backend dates, JSON requirements and minor-unit amounts to the existing renderer. The globe component and projection are unchanged.
- `/payment-status` serves a real status screen. It accepts the returned reference, calls server verification with the checkout's browser-scoped status token (or existing authenticated ownership), and displays success only for `SUCCESS` with `verified: true`.
- Receipt requests include the same ownership token. Student IDs are copyable. Failed/abandoned payments offer the existing server retry endpoint; pending payments ask the visitor to check again without paying twice.
- Redirect query parameters cannot mark a payment successful. Missing tokens require login or the original checkout browser. No password, credentials or payment token is placed in a URL.
- GET requests retry once for HTTP 502/503/504, preserving the normal authentication-refresh handling. POST/PATCH/DELETE requests are not automatically replayed. This improves brief recovery; it cannot eliminate hosting outages or database failures.

## Validation

`npm run build`, `node live-reliability-qa.cjs`, `node workspace-auth-qa.cjs` and `node frontend-deploy-qa.cjs`.
Browser regression tests intercept APIs and use synthetic references, identities and receipts. They check live CMS changes, catalogue relationships, notices, FAQ content, no preview-store dependency, server verification, forged success query rejection, receipt token forwarding, failed/missing states, 360/768/1440px layouts and GET-only gateway recovery.
No production payment was initiated, retried, verified or refunded as part of testing.

## Remaining external setup

The local `.env` still has blank S3 access/secret keys and scanner settings. Private Render variables were not inspected or changed.
Direct uploads need the real storage credentials and authenticated scanner described in `backend/UPLOAD-SETUP.md`; unscanned files must not be approved.
The site's frontend now uses live catalogues, so an unpopulated backend catalogue will correctly display empty states rather than demonstration listings.
Backend schemas, production records and existing Worker files were not modified in this change.
