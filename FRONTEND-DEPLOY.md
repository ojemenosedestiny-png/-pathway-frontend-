# Deploy the public website to Render

The frontend is a separate Docker Web Service. Its `frontend-server.cjs` serves
the existing Journey website and forwards `/backend-api` to the live API. It does
not load the old SQLite database. No backend credentials belong in this repository
or the frontend environment. Old checkout and legacy portal routes redirect to the
live login/contact screens until their service adapters are implemented.

1. Push this repository to GitHub as `pathway-frontend`.
2. In Render choose New → Web Service and select that repository.
3. Name: `pathway-frontend`; branch: `main`; language: Docker; root directory: blank;
   Dockerfile: `./Dockerfile`; health check: `/health/live`.
4. Set `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`, and
   `PATHWAY_BACKEND_ORIGIN=https://pathway-backend-892m.onrender.com`.
   The supplied render.yaml contains the same settings and uses the Free plan.
5. Deploy. Copy the actual frontend HTTPS URL from Render.
6. On the **backend service**, change `FRONTEND_ORIGIN` to that exact frontend URL,
   without a trailing slash, and redeploy. Leave its `PUBLIC_API_ORIGIN` pointing
   to the backend URL. This controls CSRF checks and password-setup email links.
7. Check frontend `/health/live`, frontend `/backend-api/health/ready`, homepage,
   and `/admin/login`. Complete the owner password/authenticator onboarding privately.

API cookies stay HttpOnly and Secure on the frontend HTTPS origin. The proxy keeps
CSRF and backend permissions active. SameSite cookies do not depend on cross-site
browser cookie support. Never set `COOKIE_SECURE=false` on the production backend.

The free service can sleep when idle, so the first visit may take time. Choose a
paid instance if always-warm responses are required. Configure custom domains on
Render and update the backend's FRONTEND_ORIGIN when the frontend domain changes.

Validation: `npm.cmd run build`, `node frontend-deploy-qa.cjs`, and
`docker build -t pathway-frontend-check .`. Local preview:
`npm.cmd run start:frontend`. The richer frontend integration status and remaining
checkout/CMS adapters are documented in `journey/LIVE-CONNECTION.md`.
