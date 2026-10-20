# Phase 1 baseline checks

Production source baselines: frontend `b60f4f8`; backend `f6c824d`. Audit branch: `platform-phase-1`. Tests use synthetic browser fixtures or a temporary localhost MongoDB replica set, not production writes.

| Check | Result |
| --- | --- |
| Frontend `npm run build` | Passed |
| Backend `npm run generate` and `npm run build` | Passed |
| Backend `npm test` | 23 passed, 0 failed; actual isolated MongoDB replica set |
| Additional isolated backend admissions/configuration/job-runner/storage tests | 13 passed, 0 failed; configuration/job-runner coverage overlaps `npm test` |
| Frontend deployment, authentication, workspace and public-admissions regressions | Passed |
| Public responsive/contrast suite | Passed at 360/768/1440px, zero reported contrast failures |
| Existing globe browser suite | Failed at page overflow at 320px; it had reached/passed earlier rotation, drag, pause and 360px checks. Do not call the whole suite passed. No globe code was changed. |
| Workspace contrast, reliability and upload regressions | Final output recorded in `results.json` |
| New requested applicant/timetable/SSE two-session E2E | Not implemented on production baseline; acceptance gates for later phases |
| Mobile Lighthouse 85+ | Not measured in Phase 1; do not claim achieved |

The existing `npm test` script explicitly runs configuration, job-runner and integration files; it does not automatically discover every test file. Supplementary isolated tests were run separately. `test-inventory.json` identifies the sixteen browser QA scripts and their environment dependencies. Older demo/fixed-port scripts are not safe substitutes for current API-backed E2E and must not bootstrap demo identities against production.

Globe source SHA-256 baseline (`journey/animated-globe.ts`):

`AC232DC23C068F0BD05DEAFB474292789094791A2EBF67EF48BC90C226D7F489`

All Phase 1 changes are documentation. Build/runtime/API/auth/globe sources are unchanged from the selected production baseline. Generated screenshots from legacy test paths are restored after copying any required evidence into this phase directory.
