# Premium public website redesign

Branch: `ui-premium-redesign`, starting from `0fcd626`.

## Review checkpoints

1. Record build and all root QA/audit scripts in a local-only baseline. Existing legacy scripts that target retired preview routes are reported separately, not silently treated as passing.
2. Commit baseline and shared public presentation components.
3. Implement header and hero only, run QA again, capture 360/768/1024/1440px screenshots and pause for visual review.
4. After review, proceed with story, benefits, curriculum, facilities, examinations/pathways, real testimonials, notices, FAQ, CTA and footer.

## Files

- `journey/public.ts`: retain current IDs, classes, routes, CMS keys, APIs and globe constructor; compose new header/hero around them.
- `journey/premium-components.ts`: Pill, SectionTag, AnimatedHeading, Counter, Card, Accordion and responsive image helpers.
- `journey/premium-motion.ts`: isolated text motion and accessible drawer controls; no globe hooks.
- `journey/theme.css`: append public-only tokens and rules; no workspace or globe selectors changed.
- `assets/premium/`: compressed responsive WebP versions of existing school photography.
- Test helpers and this report: baseline/results/screenshots.

## Boundaries

No backend, admin/student flow, authentication, payment or database changes. No made-up numbers, founding year, partnerships, claims or testimonials. Existing CMS string keys remain editable. A trust chip is displayed only when a real `hero.trustChip` string is set; there is no fabricated fallback.
The reference supplies rhythm and composition only; its copy, identity, people, campus, numbers and reviews are not used.
The entire globe component, projection, constructor speed/destinations and existing globe CSS remain untouched. Only its surrounding frame changes.
No production deployment from this review branch until the user has reviewed the header and hero.

## Curriculum requirement

The current source does not contain the specified curriculum section. The later curriculum step must include exactly: Cambridge Curriculum; Nigerian Curriculum; Cambridge International Examination - Year 8; Checkpoint (Cambridge); IGCSE - JSS 3; BECE - ERC / NECO - JSS 3; SSCE - WAEC; SSCE - NECO; SAT; HMB (Pre-Degree). These labels are not to be rewritten.

## Test isolation

`premium-qa-isolation.cjs` replaces the proxy only inside QA child processes. Browser fixtures and local demonstration writes stay local; no request is forwarded to a production API. `premium-baseline.cjs` starts isolated servers for historical port assumptions, runs every root `*qa.cjs`/`*audit.cjs`, and records exit codes, timeouts and diagnostic tails.
The network-dependent historical connection test cannot prove live configuration under isolation; its failure is documented rather than bypassing isolation.
