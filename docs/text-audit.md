# Text audit and changes

Audit reported in chat before implementation, 20 Oct 2026. Scope: public routes, access pages, admin modules, student modules and legacy public HTML/preview renderers.

## Audit inventory

Public: home, pathways, university detail, exams, exam detail, about, FAQs, contact and news.
Public operations: hostel, fees, application and consultation pages.
Access: student/admin login, password setup, password recovery, Student ID recovery and existing MFA/onboarding screens.
Workspace: dashboard, students, applications, documents, payments, fees, hostels, rooms, carousel, bookings, exams, enrolments, universities, countries, courses, consultations, slots, announcements, content, media, messages, users, roles, audit and settings.
Portal: home, journey/applications, exams/results, payments, hostel, documents, messages, profile and appointments.
Legacy aliases redirect to the same active screens. Dormant preview renderers and static homepage HTML were inspected for remaining copy and letter tiles.

| Finding | Evidence | Treatment |
| --- | --- | --- |
| Shortened school names and inconsistent portal names | `index.html`, `journey/public.ts` | Full school name; consistent student portal/admin login labels; real contact URLs retained |
| Repeated aspirational phrases | `journey/seed.ts`, `workspace-public.ts`, `workspace-premium.ts` | Plain page purposes and specific next steps |
| Mixed heading case | `journey/config.ts`, public defaults and access screens | Sentence case, preserving acronyms, proper nouns and role/status values |
| Two-letter tiles | Static `index.html`: WA, NE, DL, RD, SP | Bundled Lucide icons; no invented exam logo |
| Broken shared icon asset address | `journey/components.ts` | Points to the existing bundled icon directory |
| Different public/access/workspace fonts and scales | `theme.css`, `workspace-tokens.css` | Local Fraunces/Inter, shared scale, readable text leading |
| Gold/decorative text and image-backed text | Journey ticket decoration and photo section | Essential labels dark green; decorative marks remain decorative; opaque backing for photo copy |
| Generic errors and technical success messages | `live-api.ts`, workspace presentation modules | Specific next action; queued email distinguished from delivery |
| Inconsistent money/date rendering | Presentation formatters and appointment labels | NGN code, separators, exact non-zero minor units and British dates |
| Server-owned emails and saved content | Backend templates, local preview store, live content API | Explicitly deferred; no backend or database changes |

## Twenty important before/after examples

| Before | After |
| --- | --- |
| Let us help you map a thoughtful route to university... | Let us help you map a clear route to university, in Nigeria and around the world. |
| Student Journey | Student portal |
| Staff preview | Admin login |
| Find your pathway | Explore university pathways |
| Speak to an adviser | Book a consultation |
| Where will your ambition take you? | Explore university destinations |
| Strong foundations. Open doors. | Prepare for your examinations |
| A place to belong along the way. | Explore student accommodation |
| A little clarity before you begin. | Your questions, answered |
| The next chapter starts with one conversation. | Talk through your next step |
| Welcome back to your Journey. | Sign in to your student portal |
| Your school. A considered view. | Sign in to your admin workspace |
| Your school, in focus. | Your school at a glance |
| Build the foundation for your next chapter. | Start with your documents |
| Exam session dashboard | Your exams |
| Results and progress | Your results |
| Reason for the exception | Why is this student being added without an online payment? |
| Create student | Create student and send setup email (manual exception submission) |
| Credentials email queued. | Password setup email queued. Check delivery in your email provider. |
| A record with these details already exists... | An existing record or booking uses these details. Find it and update it, or enter different details. |

The school footer default now reads: "New World Emerald Private School. NewworldPathway to University. (c) 2026."
Preview email wording is covered in the style guide. Live transactional email wording remains outside scope.

## Verification and screenshots

The QA scripts use synthetic identities, local preview content and intercepted API responses, never production credentials or mutations.
See `typography-qa.json` and `typography-workspace-qa.json` for contrast findings.
The contrast check calculates WCAG relative luminance from rendered foreground and solid composited ancestor backgrounds.
Decorative `aria-hidden` elements and the untouched globe are excluded; photography text has its own solid backing.
This is a targeted text contrast check, not a claim of a full WCAG accessibility audit.

Screenshots are in `docs/typography-screenshots/`: home and login at three widths; admin, student mobile and student records; before captures for home/login/admin/student mobile.
All student details in screenshots are fictitious.

No backend, database, environment, API contract, payment/authentication flow, grid layout or globe source changes are part of this task.
Earlier untracked media Worker files in the backend belong to the preceding upload setup and are left untouched.
Published editable content was not overwritten; existing CMS keys, tokens and placeholders remain editable.

Checks completed:

- `npm run build`: passed.
- `node typography-qa.cjs`: all public/access routes at 360, 768 and 1440px; no horizontal overflow, runtime errors or measured essential-text contrast failures.
- `node typography-workspace-qa.cjs`: all admin/student modules across the same widths; table filtering, fee payload, profile drawer, role navigation, photo editor and reduced motion passed. No measured text contrast failures.
- `node workspace-auth-qa.cjs`: password/onboarding, MFA, recovery codes, CSRF, sidebar and search passed using synthetic API responses.
- `node workspace-upload-qa.cjs`: image/video upload presentation and scan-before-publication checks passed using synthetic storage.
- `node frontend-deploy-qa.cjs`: frontend assets, redirects, private-file exclusion and CSP passed.
- Source comparison: API path/method arguments and event-handler counts match HEAD across 18 changed TypeScript files. Existing layout CSS is retained verbatim before appended typography rules. Globe/projection sources are unchanged.

Representative contrast ratios: workspace ink/cream **11.77:1**, supporting text/off-white **5.62:1**, cream/deep green **11.67:1**, public muted text/cream **5.24:1**, photo text/opaque deep-green backing **15.25:1**.
Focus, icons, photographic content, custom content and the untouched globe still need their normal human accessibility review; these checks do not certify arbitrary future CMS content.

| View | Before | After |
| --- | --- | --- |
| Homepage | [Before](typography-screenshots/home-before.png) | [1440px](typography-screenshots/home-1440-after.png), [768px](typography-screenshots/home-768-after.png), [360px](typography-screenshots/home-360-after.png) |
| Student login | [Before](typography-screenshots/login-before.png) | [1440px](typography-screenshots/login-1440-after.png), [768px](typography-screenshots/login-768-after.png), [360px](typography-screenshots/login-360-after.png) |
| Admin overview | [Before](typography-screenshots/admin-before.png) | [After](typography-screenshots/admin-after.png) |
| Student mobile | [Before](typography-screenshots/student-mobile-before.png) | [After](typography-screenshots/student-mobile-after.png) |
