# NewworldPathway website, student portal, and admin panel

## Journey extension

### Payment-linked access and owner workspace

New registration checkout: `/enrol`. Student login: `/student/login`. Staff login with two-factor preview: `/admin/login`. The Journey workspaces now require their local authenticated preview sessions instead of the old profile chooser. In a fresh browser, use **Provision local owner preview** on the staff sign-in screen with your own throwaway test password. Students obtain an ID only after a simulated verified registration/enrolment payment, then set their password through the local delivery preview. No real email or provider verification occurs.

For server owner provisioning, privately set `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` and run `npm run seed-owner`; the script creates a bcrypt-hashed server identity with mandatory 2FA/initial-password-change flags. It does not connect that identity to the browser mock. No default owner credentials are provided.

See [Access and Post Information API contract](journey/ACCESS-API-CONTRACT.md) for exact backend endpoints, shapes, transactional requirements, CSRF, sessions, roles, delivery, and production replacement notes. Verification: `node access-qa.cjs` and `node access-edge-qa.cjs` (set `UI_BASE_URL` to your server). Earlier Journey UI tests that expect the old profile chooser need the new access bootstrap/login helpers.

The existing site is extended with a CMS-driven public catalogue, staff workspace at `/admin`, and student Journey portal at `/portal`. The original authenticated exam screens remain at `/admin.html`, `/portal.html`, and `/exam.html`.

Run `npm run build` before `npm start` to compile the new TypeScript modules. The Journey workspaces use an explicit local preview-role/profile chooser and shared browser persistence; they are not production authentication. Use synthetic data and documents. No live payments, reservations, or external messages are performed.

See [Journey architecture and backend handoff](journey/INTEGRATION.md) for routes, editable content, roles, integration endpoints, environment variables, and limitations. Run `node journey-qa.cjs` with `UI_BASE_URL` set to your server origin for integration and responsive checks.

The website and API are served by the same Express server. SQLite stores student and admin accounts, sessions, consultation enquiries, exam questions, saved answers, and exam results.

## Requirements

- Node.js 22 or later
- npm

## First-time setup

Open PowerShell in the project folder and install the packages:

```powershell
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Create your private administrator login. Replace `siteadmin` with the username you want:

```powershell
npm run create-admin -- siteadmin
```

The command prompts you for a password and confirmation. Use a password at least 12 characters long and no more than 72 UTF-8 bytes. Passwords are stored as bcrypt hashes, not as readable text. There is no pre-created admin username or default password.

Start the server:

```powershell
npm start
```

Open the website at `http://localhost:3000` and the admin panel at `http://localhost:3000/admin.html`. Do not open the HTML files directly with `file://`; the frontend needs the running API.

## Create a student ID and password

There are two ways to create a student account:

1. Sign in to `/admin.html`, go to **Student accounts**, enter a unique ID (letters, numbers, and hyphens) and an initial password, then choose **Create student**.
2. Alternatively, open another PowerShell window in the project folder and run `npm run create-student -- NWE-20481`. The command asks for a password twice.

Choose a password that is 12–72 UTF-8 bytes long. The system hashes it before storing it. It does not email or display the password later, so give the initial password to the student privately. The student goes to `/portal.html`, enters their ID and password, and selects **Login to Portal**. There are no sample student credentials.

An administrator can reset a student's password from the student table. This signs that student's existing sessions out; share the new password privately. **Disable** prevents sign-in and revokes current sessions; **Enable** restores access. Accounts are disabled rather than deleted so their exam history remains intact.

## How the site works

1. **Website enquiries:** The consultation form sends its fields to the API. The server validates them and saves them in the database. In the admin panel, staff can review the applicant's contact details and message, set status to New, Contacted, or Closed, or delete the enquiry.
2. **Find My Pathway:** Visitors submit qualifications, subject or career interests, preferred destinations, approximate annual NGN budget, and intended start month. The server creates transparent discussion routes and requirement checks; it does not assess admission eligibility, compare live costs, or guarantee entry. With explicit consent, name, contact details, answers, and recommendations are saved in the counsellor queue. Counsellors can record a review, add notes, update status, or delete the request.
3. **Student authentication:** The server checks the ID and bcrypt password hash. On success, it issues a random, HTTP-only, same-site cookie. The browser does not store the password or session token in local storage. Student and administrator sessions are separate and expire after seven days.
4. **Student portal:** The dashboard requires a student session and displays exam availability and saved results from the API.
5. **Exams:** Active questions, four answer options, correct answers, exam title, and duration are stored in SQLite. Students receive question text and options, but not the answer key. Answers are saved when selected and autosaved every 15 seconds. The server—not the browser—calculates and saves the score. When the timer expires, the exam is submitted and unanswered questions count as incorrect.
6. **Admin panel:** Administrator authentication is required for student management, enquiries, pathway-plan review, exam settings/questions, and the results table. The results page shows up to the latest 500 submissions.

## Admin panel controls

- **Students:** create accounts, enable/disable access, and reset passwords.
- **Administrator password:** signed-in administrators can set a new private password from **Change administrator password**; other admin sessions are revoked.
- **Enquiries:** read applicant contact details and messages, update status, or delete records.
- **Pathway plans:** review an applicant's profile and suggested routes, record counsellor notes, update review status, or delete the request.
- **Exam:** update its title and duration, add/edit/activate/deactivate/delete questions, and set the correct option. At least one question must remain active.
- **Results:** see student ID, exam, score, question count, and submission time.

The homepage wording, destination cards, and visual design are static files; they are not editable in the admin panel. Pathway suggestions are a starting aid; counsellors must verify course entry rules, tuition, funding, and immigration requirements directly with official institutions and authorities.

## Data and deployment

The default database is `data/newworldpathway.sqlite`. Edit `.env` to change `PORT` or `DATABASE_PATH`. Keep `.env` and the database private and backed up; they are excluded from source control. On a production deployment, use HTTPS and set `NODE_ENV=production` so session cookies receive the `Secure` attribute. Restrict server and database access to trusted operators.

The seeded English question is a sample. Replace its prompt, choices, and answer key in the admin panel before using it for a real exam.
# PostgreSQL backend

The new TypeScript API is in [backend/README.md](backend/README.md). It is separate from this project's SQLite preview server. See [backend/API-CONTRACT.md](backend/API-CONTRACT.md) for routes and [backend/FRONTEND-INTEGRATION.md](backend/FRONTEND-INTEGRATION.md) for the exact mock-service replacement table. The current frontend remains a preview until those adapters are connected.

