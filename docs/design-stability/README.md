# First-render design stability

Cause: index.html contained the old photo hero and navigation, while public.ts fetched data and then replaced the page with the premium globe design. The earlier loading-screen removal left the old HTML visible during that wait. Mobile and desktop network timing made the two presentations appear inconsistent. This was a rendering bug, not a separate intended mobile design.

Fix: public-template.ts is now the shared server/browser template for the homepage, header, footer, About, Contact and pathway search. The server sends the premium homepage immediately, without waiting on the backend. Other public routes receive the same premium shell and safe editorial introductory content while live records are fetched. index.html no longer contains the legacy design or runs legacy script.js/ui-enhancements.js. Globe behaviour starts immediately on the server-rendered homepage. Live CMS copy and current catalogue records still enhance the page; no private data or payment amounts are rendered from defaults.

HTML, CSS and JS require cache revalidation. Entry scripts/styles carry a build-content release hash, and responses expose X-Pathway-Release so device versions can be compared. This does not control browser extensions or user-configured CDN cache overrides. All devices receive the same HTML and release; responsive CSS adapts the layout. Search text and focus survive the homepage live-data update.

Validation: build, delayed-API and JavaScript-disabled browser tests at 360/768/1440px, identical mobile/desktop server responses, cache headers, public deploy routes, public trust checks, outage recovery, CMS/catalogue/payment-status regression, admissions, admin authentication and globe interactions. Production Docker image build and shared-template import/render smoke test pass. Globe implementation and geometry hashes are unchanged. Initial and ready screenshots are included here.

Deployment requires the latest frontend main commit on Render. A push is not a confirmed Render release. No backend changes or production records were written for this fix.
