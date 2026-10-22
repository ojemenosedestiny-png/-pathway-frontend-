# Recurring application availability failure

The application page requires `/public/admission-programmes` from the backend. A gateway failure prevents loading the real programme choices. Recent public readiness/content/legal checks also returned 502. Successful older request logs do not explain the current gateway failure, and no production crash cause has been established.

## Fixes

- Backend startup previously reran index provisioning, migration backfills and collection scans on every process restart, even with a completed migration. The Docker startup now uses `--apply --if-needed`. A valid completion record skips that repeated work. First-time migration and repair of incomplete completion records still run. Explicit migration commands retain their repair behavior.
- The application loader retries temporary connection failures and 502/503/504 responses at bounded intervals spanning about a minute. It shows connection progress and opens the real form after recovery. It does not invent programme data or automatically submit an application.
- The frontend proxy logs upstream HTTP failures separately from connection failures, including route, upstream host, status/code and elapsed time. Cookies, bodies and query strings are excluded; client cancellations are not reported as backend failures. Look for `backend_proxy_failure` in frontend Render logs when backend logs show no corresponding request.

## Verification

Both builds passed. All 48 backend tests passed with isolated MongoDB, including restart migration skip and incomplete-marker repair. Frontend regression results total 29 passing checks. Updated admission tests reproduce two temporary programme-loading failures, then verify recovery, consent, manual submission, idempotent retry, receipt and staff review. A synthetic transport test verifies safe proxy diagnostics.

## Deployment and remaining hosting boundary

Deploy the backend and frontend commits from this change. The backend must use the updated Dockerfile startup; an existing Render Docker Command override must be reviewed if it replaces that command.

The production backend instance type has been requested but is not confirmed. If it is Render Free, [Render documents](https://render.com/docs/free) that it sleeps after 15 idle minutes, takes approximately a minute to start again, and can be restarted by the platform. Code cannot remove those hosting limits. Continuous availability requires an always-on hosting configuration. No paid plan was created or enabled during this change.

A successful live deployment and subsequent production request are still required before this report can claim that the live incident is resolved.
