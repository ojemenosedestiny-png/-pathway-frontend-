# Admin to public website connection review

21 October 2026. Local code review and automated browser tests with test APIs; no production content was edited.

## Fixes in this release

- Fixed record action buttons losing their click handlers when later controls were appended. Content/programme/room Edit buttons and document Open buttons now preserve their handlers.
- Added nine default FAQ answers on the homepage and /faq, including server-rendered HTML.
- Added Site content > Edit frequently asked questions. Questions, answers and visibility save to the server content record `faqs` as structured JSON.
- New structured FAQ/statistics/testimonial records are parsed as JSON rather than saved as text.
- Hidden testimonials and statistics are excluded from public rendering; hidden FAQ entries are excluded by the FAQ renderer.
- Public content refresh starts a fresh server request instead of reusing a permanently cached response.
- Write-only content tools are hidden from read-only staff; backend permissions remain authoritative.
- Existing home.photoImage, hero.image and school.logo content editors include a device picture chooser. Images must finish server validation before their URL is attached.

## Connections checked

| Admin area | Public destination | Connection |
| --- | --- | --- |
| Site content | Header, footer, hero, contact, about and configured homepage text | /admin/content to /public/content |
| FAQ editor | Homepage FAQ and /faq | Structured content key faqs |
| Programmes / availability | /exams and homepage programme cards | Active exam records and separate preparation policy |
| Fees manager | /pay-fees and student payments | Server fee records; official references remain separate |
| Hostel manager / rooms | /hostel and student accommodation | Server hostel/room records |
| Hostel carousel | Homepage carousel | Visible slides from /public/slides |
| University catalogue | Homepage featured universities and /pathways | Active universities, countries and courses |
| Post information | Public news/banner | Published website announcements, with rich text sanitization |
| Legal details | Footer | Filled fields only via /public/legal |
| School / student pictures | Media, room editor and private student documents | Device file chooser, signed storage upload and server validation |

## Practical limits

This is not a complete page builder. The premium layout, inspiration photo collages, examination-body logo wall and globe geometry are bundled design assets, not editable CMS records. The globe is unchanged in this release.

Schedule metadata (class, term, session and residence location) can fall back to device-only storage when an account cannot write the content record. The UI warns about this; actual prices and availability still use backend records. A shared metadata write requires appropriate content permissions.

Browser connection tests use persistent synthetic responses. Backend tests cover permissions and server behavior separately. This does not establish that production credentials, Cloudflare CORS, storage permissions or deployment settings are correct. A real signed-in live device upload must still be checked after deployment. R2 bucket credentials, S3_BUCKET and public delivery remain required. No antivirus endpoint is required by the current upload release.
