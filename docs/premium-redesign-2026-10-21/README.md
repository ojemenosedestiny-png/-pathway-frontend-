# Green and white public-site redesign — 21 Oct 2026

The supplied university UI screenshot guides the visual treatment, not its claims or content. The public site now uses a deep green hero, white surfaces, pale green section breaks, refined serif headlines, consistent buttons, photo programme cards, an editorial campus section, destination cards, a varied community mosaic and a compact application call to action. The recently approved bright school photo card remains, with its caption separate from the photograph. Published CMS copy and live fees retain their existing data sources.

Five owner-supplied photographs are included as study inspiration, clearly distinguished from the school's own photographs. Sources and rights-documentation status are recorded in assets/inspiration-sources.md. The Nile logo/entrance and Toronto image are excluded pending the outstanding owner confirmation; no institutional partnership or results are invented. Empty student stories remain hidden rather than populated with fictitious testimonials or statistics.

Headline and section text enter subtly; reduced-motion preferences disable the added animations. The rotating globe source, geometry, controls and rotation configuration are preserved. Backend, registration, payments and authenticated-workspace logic are unchanged.

Validation: TypeScript build; production Docker build and asset/route smoke test; premium photo and layout checks at 360, 768 and 1440px; reduced motion; public admissions; admin authentication; public API outage/recovery; globe interaction/geometry/mobile bounds. Responsive typography checks cover 18 routes at three widths and report zero contrast failures. All browser journey fixtures are synthetic.

Previews: hero-360.png, hero-768.png, hero-1440.png and full-page home screenshots at each width. These use empty synthetic catalogue data to exercise honest editorial fallbacks; published live catalogue records still replace those fallbacks.

Release: frontend only. Render must deploy the new main commit; a GitHub push alone does not confirm the live deployment. The Docker runtime explicitly includes journey/public-premium.css and assets/ includes all five photographs.
