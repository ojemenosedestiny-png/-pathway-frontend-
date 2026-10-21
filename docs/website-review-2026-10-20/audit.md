# Website review: audit and first fixes

Review date: 20 Oct 2026. Work is isolated on website-trust-review; no live deployment or CMS data updates have been performed. The live homepage could not be fetched by the web tool during this pass, so findings below are verified against the current repository and the owner's supplied live text review, not a fresh complete live-site inspection.

## Confirmed findings and changes

| Finding | Change |
|---|---|
| Header says to University | Header describes exam preparation and study guidance. A service disclosure explains that the school does not award university degrees. The purchased domain is unchanged. |
| Apply Now jumps to an enquiry | Primary application labels link to /apply; the enquiry is labelled Talk to an adviser. Existing form IDs and submission handlers are preserved. |
| /portal.html and service-dashboard aliases appear in links | Public links use /portal. Existing compatibility redirects remain. |
| Cambridge branded logo without evidence of permission | Replaced with neutral qualification text in the fallback homepage. No permission claim is made. |
| Supplied third-party university/study imagery | Public study gallery uses existing school photographs; supplied originals remain in the repo, unused by this gallery. School-photo permissions still require owner confirmation. |
| 30 reference exams on fallback homepage | Moved to /other-exams with name search and an explicit availability disclaimer. Live homepage shows at most eight admin-published programmes, with a link to all published programmes. No programme has been newly asserted available. |
| Ambiguous published exam fee label | Public live catalogue identifies a preparation programme fee and preserves the separate official-registration disclaimer. Backend purposes, amounts and finance records are unchanged. Cross-system billing terminology still needs owner review. |
| Repeated next chapter / next step and vague chips | Reduced in affected public copy and defaults; CMS overrides are preserved and may still contain old text. |
| Dubai vs United Arab Emirates | Fallback destination wording uses United Arab Emirates. Globe source is untouched. |
| Copyright invisible without JavaScript | Fallback year is visible; dynamic footer has a year independent of editable footer text. |
| Favicon reportedly missing | A school-logo favicon already existed; preserved. |
| No server-rendered sharing/canonical information or sitemap | Added route-specific canonical/OG metadata, educational-organisation structured data, robots.txt and sitemap.xml for public informational pages. No degree/accreditation schema is claimed. |
| Payment/registration distinction unclear | Added /service-information, linked in static and dynamic footers. It explains separate preparation/official registration and asks for an itemised quote and applicable refund terms before payment. It does not invent a refund policy. |

## Facts and decisions still required

- Confirm the legal operating name, registration number, business address and monitored email. Do not replace the existing published contact with an unconfigured mailbox.
- Confirm programme/subject availability, real term dates and whether the school handles any official registration. Match approved labels to each fee, invoice and email before changing financial semantics.
- Confirm permissions for existing school photos and any brand assets. Replacing third-party university imagery does not establish permission for every remaining photo.
- Obtain approved privacy, terms, refund and cookie notices, including controller/contact details, minors/guardian process, retention, processors/transfers, rights handling and actual cancellation/refund rules. No legal compliance determination is made by this engineering pass. Existing /privacy links need an approved destination before the new applicant journey is released.
- Supply real staff profiles, consented testimonials/results and owned classroom/campus images. No fabricated people, outcomes, statistics or accreditation claims are added.
- Confirm map address, social profiles and inbox ownership before publishing them. Sending through Resend does not create an info@ mailbox.
- Google Business Profile, Search Console and analytics require the owner's accounts and choices. Analytics/Turnstile are not silently enabled; Turnstile needs server verification and environment keys, not just a browser widget.
- Consider dedicated WAEC/NECO/Cambridge landing content after actual provision is confirmed. Avoid pages that promise subjects or outcomes without evidence.
- Image optimisation remains a follow-up; existing below-fold images retain lazy loading. This pass does not claim all files are WebP.

## Release boundary

This branch inherits the pending Phase 2 code. Do not merge it directly to production without the documented Phase 2 migration and backend release. Review the website-only changes separately if releasing public copy first. Globe and curriculum source/content are preserved.


## Owner instructions incorporated

Follow-up portal verification on 21 October 2026: see the [individual admin/student module report](../portal-review-2026-10-21.md). All 72 module/viewport checks, 28 frontend regression checks and 48 backend tests passed. The report distinguishes local/synthetic coverage from live production checks.

The owner subsequently supplied the draft availability list and explicitly withheld business registration details, logo/photo permissions and refund terms. The implementation now adds blank legal-details fields, per-exam Offered by us controls, separate official reference fee editors, a draft research import, media source/licence records and an unpublished refund editor. See docs/exam-research.md and docs/owner-confirmation-sheet.md. Existing contact email and WhatsApp remain unchanged. The official reference seed is a preview/apply operation; it is not a live-data write during this task.

Validation: frontend and backend builds pass. The final isolated MongoDB suite passes 32 tests, including a real preparation invoice that ignores a deliberately different official reference amount. Four focused trust-content checks cover draft hiding, blank legal fields, role protection, source/date validation, freshness/session warnings and availability enforcement. Browser checks pass for public pages at 360/768/1440px, searchable references, admin legal/refund controls, existing guest admissions, frontend deployment and admin password/MFA flow. Globe and geometry SHA-256 values match the Phase 1 baseline. Curriculum labels remain untouched. Screenshots use synthetic API data.
