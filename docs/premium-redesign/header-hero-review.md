# Header and hero: review checkpoint

This is the requested first visual checkpoint, **not the completed full-site redesign**.
Branch: `ui-premium-redesign`. Production `main` is not changed or deployed by this work.

## Visual changes

- Ivory editorial hero with a rounded deep-emerald frame around the existing globe.
- Pill-shaped desktop navigation, phone link and Apply action. Compact sticky header on scroll.
- Mobile navigation drawer with focus containment, Escape/scrim close and focus restoration.
- Fraunces headline, an italic highlighted word and one-time staggered word reveal. Decorative word cycles stop after eight changes, pause while the tab is hidden and disable under reduced motion. The accessible heading stays constant and uses the existing editable title.
- Existing school's own photo, responsive WebP sizes, explicit dimensions and lazy loading. The photo overlaps the frame edge but not the interactive globe.
- Existing hero text, CTA destinations, search field name, globe host attribute and main rendering APIs retained. `hero.trustChip` is rendered only if configured; no student count, result rate, founding year or testimonial is invented.
- Shared Pill, SectionTag, AnimatedHeading, Counter, Card and Accordion helpers are available for the later sections. Only the first three and the responsive image helper are used in this checkpoint.

## Before and after

- [Before](header-hero-before.png)
- [Desktop 1440px](header-hero-1440.png)
- [Tablet 1024px](header-hero-1024.png)
- [Tablet 768px](header-hero-768.png)
- [Phone 360px](header-hero-360.png)

Screenshots show local isolated fixtures and the school's existing photograph. They do not assert a partnership with the test university fixture.

## Tests and limits

The baseline ran every one of the 16 existing root QA/audit scripts: **9 passed, 7 failed** before UI changes.
Full diagnostic tails are in `baseline-qa.json`. The failures are:

1. `globe-qa.cjs`: pre-existing whole-page overflow at 320px, outside the requested minimum 360px.
2. `journey-passes-qa.cjs`: the same 320px whole-page overflow.
3. `access-qa.cjs`: expects an older preview registration/login transition.
4. `journey-qa.cjs`: expects the retired "Enter staff preview" screen.
5. `services-qa.cjs`: expects retired demonstration services/forms.
6. `ui-qa.cjs`: expects the former static homepage controls.
7. `live-connection-qa.cjs`: a live readiness assumption cannot pass against the deliberately isolated proxy.

`premium-header-qa.cjs` covers 360/768/1024/1440px, drawer controls, reduced motion, unchanged accessible heading, absent unset trust chip, text contrast, no photo/globe overlap, rotation rate, hover pause, drag and tab-hidden pause. It passes.
Rendered contrast findings for essential text are empty in `header-hero-contrast.json`. Decorative globe labels retain their original styles and are not included in the text scan.
No Lighthouse score has been measured; performance 85+ is a target, not a verified result. The real student photo is ~10 KB at 240px or ~22 KB at 480px.

The full QA inventory is rerun after this section; see `header-hero-qa.json` for exact final results. Existing failures are reported, never described as passing or hidden by changing application behaviour.

Final results: the full inventory ran 17 scripts. Its first batch recorded 9 passes, the same 7 known baseline failures, and a 60-second batch timeout in `typography-qa.cjs`. That typography script was rerun separately with the same isolation and passed all route/width/contrast checks (zero failures). Thus the 9 previously passing checks plus the new focused hero check pass on the final implementation; no newly failing behaviour was found. The raw batch timeout is preserved in the JSON rather than overwritten.
The final build passed. These are honest baseline-relative results; the entire historical suite is **not** described as green.

## Globe evidence

`git diff 0fcd626 -- journey/animated-globe.ts journey/globe-geometry.ts` is empty.
The `new AnimatedGlobe(...)` constructor call, rotationSpeed 60 and destination handling match the starting version.
Original `theme.css` is preserved verbatim before appended public-only rules; no globe selector is overridden.
SHA-256:

- `animated-globe.ts`: `ac232dc23c068f0bd05deafb474292789094791a2ebf67ef48bc90c226d7f489`
- `globe-geometry.ts`: `8b9ac1f56cbaf8458199c317e4f06040daa9038d7c0f4400e9a5072a3996f10c`

## Next checkpoint

Wait for the user's header/hero visual feedback before implementing the story, benefits, exact curriculum text, facilities, exam/pathway highlights, real voices, notices, FAQ, CTA and footer.
No admin, student portal, backend, authentication, payment or production data is changed.
Admin-only missing-content hints and structured lower-section CMS values belong to that next step and have not been claimed complete here.
