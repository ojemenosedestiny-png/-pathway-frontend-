# Live API connection

The local website serves the live access screens at `/student/login`, `/admin/login`,
`/set-password`, `/forgot-password`, and `/recover-student-id`. `/portal` and `/admin`
use backend sessions and database records rather than browser demo accounts.

Run `npm.cmd run build` then `npm.cmd start` in the project root. Open
`http://localhost:3000/admin/login` or `http://localhost:3000/student/login`.

## Render settings for this local website

- `FRONTEND_ORIGIN=http://localhost:3000` (exact origin; no trailing slash).
- `PUBLIC_API_ORIGIN=https://pathway-backend-892m.onrender.com`.
- Keep `COOKIE_SECURE=true`, `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`.
- Keep the existing MongoDB URI, JWT secret and encryption key private.

The website server proxies `/backend-api/*` to the fixed Render origin. Override
the upstream only on the website server with `PATHWAY_BACKEND_ORIGIN`. This is not
a browser setting. The proxy preserves the browser Origin and backend CSRF checks;
it does not forge a permitted origin or bypass authentication. It strips the cookie
Secure flag only for local HTTP localhost development; production retains Secure.
Never log response cookies, passwords, setup keys, challenges or recovery codes.

## Authentication

Students use IDs issued by the backend and their set-password links. Existing
localStorage demo accounts cannot sign in to MongoDB. Reset/recovery messages
require the backend worker and email delivery credentials to actually send mail.

The seeded owner signs in with their private credentials. The first login requires
changing the initial password, manually enrolling a TOTP authenticator, verifying
its code, and saving one-time recovery codes. Challenges, authenticator secrets,
recovery codes and passwords are never stored in browser storage by these screens.
Cookies are HttpOnly; CSRF is in memory. Access renewal is single-flight, with at
most one retry per request. Role checks and data access are enforced by the backend.

## Current connected views

- Admin: live dashboard counts, paginated students, payments, fees, staff and audit
  lists; notices; current-device and all-device logout.
- Student: profile read/update, applications, documents, exams and payments lists,
  notices and mark-as-read, logout.

This is the authentication and record-view integration milestone. Catalog editing,
staff/role editing, announcement composition, uploads, checkout and the older
student-services pages still need adapters before production use. The homepage
still uses its existing content adapter. Do not treat the older mock payment or
admin implementations as live APIs.

Before publishing the frontend, set Render's `FRONTEND_ORIGIN` to the actual HTTPS
website origin and host the same proxy with that website. Update email-link origins
accordingly. A localhost email link will not work on a student's phone.

## Verification

`node live-connection-qa.cjs` uses installed Chrome. It checks real backend readiness,
HttpOnly cookie forwarding, CSRF rejection and invalid login. It then stubs backend
responses to test the UI's complete onboarding, sessions, profile, refresh, logout
and mobile navigation without altering the actual owner's password or authenticator.
An ORIGIN rejection is reported as pending configuration, not successful live login.
The screenshots contain test identities only. Complete one real owner login after
correcting the Render origin; real student login requires a provisioned account.
