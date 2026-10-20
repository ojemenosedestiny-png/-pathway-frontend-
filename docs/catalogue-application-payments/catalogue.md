# Catalogue milestone

Thirteen starter entries are defined in `backend/src/catalogue-drafts.ts`: four destinations, six preparation programmes and three explicitly illustrative demo hostel slides. Fees and deadlines are null. Every seed entry is DRAFT. The seed is additive and preserves all edits/publication decisions on subsequent runs.

After deploying this branch's backend, run `npm run seed:catalogue` in the backend environment. This writes draft content to the configured database; inspect the environment before running it. Do not run it against a test database expecting production content to appear.

Admin → Destination guides / Exam programmes / Hostel slides offers Quick add, Edit, Delete, Draft/Published, uploaded images and drag-to-reorder. Move up/down buttons provide the keyboard alternative. Publishing requires explicit confirmation. Existing university, exam-enrolment, room and legacy slide managers remain available. General guidance is kept separate from transactional capacity/availability records.

Public homepage sections use `GET /public/catalogue`, which returns only published entries in display order. Fees and deadlines show “to be confirmed” when unset. Hostel demos use bundled SVG illustrations and link to an adviser, never to a booking action. Removing/unpublishing all content shows adviser-led empty states. If the new endpoint is not deployed yet, existing catalogue rendering remains available.

The seed does not silently publish content. Until staff publish confirmed entries, the live sections intentionally show their improved empty states. Public screenshots in `screenshots/` use synthetic published fixtures to verify the intended presentation.

API: `GET /admin/catalogue/:kind`, `POST /admin/catalogue/:kind`, `PATCH /admin/catalogue/:kind/:id`, `DELETE /admin/catalogue/:kind/:id`. Kinds are DESTINATION, EXAM and HOSTEL. They use existing countries, exams and slides permissions respectively, inside the existing authenticated admin router. Each write is audited. File uploads reuse the existing scan-and-approve media workflow.

New environment variables: none for this milestone. Uploads still require the existing S3 settings, PUBLIC_MEDIA_BASE and scanner configuration. Email links and private payment-proof storage are separate later milestones and are not implemented by this catalogue change.
