# NewworldPathway typography and writing guide

## Brand and voice

Use **NewworldPathway** for the programme and **New World Emerald Private School** for the school.
Keep the school's real website and email addresses unchanged; they are contact details, not alternative programme names.
Write in British English: programme, enrolment, centre, catalogue, adviser, organisation and instalment.
Keep official qualification and institution names as their owners write them.

Address the reader as "you". Use short, active sentences. Explain what the reader can do next.
Use sentence case for headings, navigation and actions. Preserve proper nouns, Student ID, NGN and other established abbreviations.
Reserve small uppercase text for short overlines; do not use capitals for paragraphs.
Use bold for essential words, labels and values. Use underlines for links only.

## Typography tokens

| Token | Size | Purpose |
| --- | --- | --- |
| `--type-12` | 12px | Short overlines |
| `--type-14` | 14px | Controls, captions and supporting labels |
| `--type-16` | 16px | Body copy and form inputs |
| `--type-18` | 18px | Prominent introductory copy |
| `--type-22` | 22px | Card subheadings |
| `--type-28` | 28px | Section and card headings |
| `--type-40` | 40px | Page headings |
| `--type-56` | 56px | Maximum public display heading |

Public/access tokens are in `journey/theme.css`; the corresponding `--pw-font-*` workspace tokens are in `journey/workspace-tokens.css`.
Use locally bundled Fraunces for headings and key numbers, and Inter for body copy and controls.
Both faces use `font-display: swap`, with Georgia and system sans-serif fallbacks.
Body line height is 1.6; heading line height is 1.15-1.2 with -0.025em tracking.
Display headings use `clamp()`. Paragraph measure is 68ch on public pages and 70ch in workspaces.
These are text rules, not changes to grid, spacing, card arrangement, breakpoints or globe styling.

Use dark green on cream and cream on deep green. Small body text needs at least 4.5:1 contrast.
Gold is for decorative marks and accents, not small essential copy. Text over photographs uses an opaque deep-green text backing.
Preserve visible keyboard focus. Buttons and workspace tabs/sort controls have a 44px minimum target height.
Use tabular figures for money, dates and reference values. Long Student IDs use sans-serif, not decorative numerals.

## Numbers and dates

- Money: `NGN 150,000`. Show non-zero minor units: `NGN 1,250.50`. Never round a payable balance down for presentation.
- Dates: `18 Oct 2026`. Appointment times include a 24-hour time, for example `18 Oct 2026, 09:30`.
- Preserve server amounts, currency codes, UTC values and payment verification. These conventions affect display only.

## Actions and state messages

Start action labels with a verb: "Pay school fees", "Book a consultation", "Resend setup email".
For a manual account: "Create student and send setup email".
Ask "Why is this student being added without an online payment?" and explain "This is recorded in the audit log."
Say what happened and what to do next when an operation fails. Avoid database or API terminology unless the reader needs it.
Do not describe a queued email as delivered. Do not describe a refund request as money already returned.
Empty states should explain what will appear and offer a relevant existing action where one is available.
Keep native validation, permission checks, status values and existing actions intact.

## Claims and disclaimers

Do not claim accreditation, a partnership, admission, a visa, exam registration or guaranteed results without verified evidence.
Keep: "This is a preparation enquiry. Official exam registration is confirmed separately."
Do not hide material disclaimers in low-contrast or undersized text. Preview catalogues and illustrative testimonials must remain labelled.

## Email copy for a future authorised backend change

The editable preview template now says:
"Hello {{name}}, your application {{reference}} has been updated. Sign in to your NewworldPathway student portal to review the changes."

Suggested account email: "Set up your NewworldPathway student account. Your Student ID is {{studentId}}. Choose your password using the secure link below. The link expires in {{hours}} hours."
Keep placeholders and real expiry values. Never email a password or claim confirmed delivery from a queued job.
**Production transactional email templates were not edited:** they are backend code and this task expressly excludes backend changes.

## Publishing checklist

1. Is the brand correct and the spelling British?
2. Does the heading identify the page and the introduction explain its purpose?
3. Does each button explain what happens next?
4. Are dates and money consistent and exact?
5. Are empty/error/success states truthful and actionable?
6. Are essential text and disclaimers readable, with sufficient contrast?
7. Are claims supported and illustrative content labelled?
8. Check 360px, 768px and 1440px, including focus and reduced motion.
9. Edit existing CMS fields; do not change their keys or overwrite published content automatically.

Existing browser-saved or database content can retain previous wording. Updated seed copy affects fresh preview content; no storage migration, database update or forced overwrite was added.
