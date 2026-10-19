const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./db');
const { qualificationLabels, recommendPathways } = require('./pathway-planner');
const { liveApiProxy } = require('./live-api-proxy.cjs');

const app = express();
const port = Number(process.env.PORT) || 3000;
const sessionCookie = 'nwp_session';
const adminSessionCookie = 'nwp_admin';
const sessionDurationSeconds = 7 * 24 * 60 * 60;
const destinations = new Set(['United Kingdom', 'Canada', 'United States', 'Dubai, UAE']);
const examId = 'english-assessment';

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https://newworldemeraldprivateschool.com', 'data:', 'blob:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
}));
// Stream before JSON parsing; preserve backend CSRF, HttpOnly cookies and PDF responses.
app.use('/backend-api', liveApiProxy());
app.use(express.json({ limit: '10kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many enquiries from this connection. Please try again later.' },
});

const pathwayLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many planner submissions. Please try again later.' },
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie || '';
  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return cookie.slice(separator + 1).trim();
  }
  return null;
}

function setSessionCookie(response, name, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDurationSeconds}${secure}`
  );
}

function requireStudent(request, response, next) {
  const token = readCookie(request, sessionCookie);
  if (!token) return response.status(401).json({ error: 'Please log in to continue.' });

  const session = db.prepare(`
    SELECT students.student_id
    FROM sessions
    JOIN students ON students.student_id = sessions.student_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND students.is_active = 1
  `).get(hashToken(token), Date.now());

  if (!session) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    return response.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  request.studentId = session.student_id;
  return next();
}

function requireAdmin(request, response, next) {
  const token = readCookie(request, adminSessionCookie);
  if (!token) return response.status(401).json({ error: 'Administrator sign-in is required.' });

  const session = db.prepare(`
    SELECT admins.username
    FROM admin_sessions
    JOIN admins ON admins.username = admin_sessions.username
    WHERE admin_sessions.token_hash = ? AND admin_sessions.expires_at > ? AND admins.is_active = 1
  `).get(hashToken(token), Date.now());

  if (!session) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
    return response.status(401).json({ error: 'Your administrator session has expired.' });
  }

  request.adminUsername = session.username;
  return next();
}

function stringField(value, maximumLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength ? normalized : null;
}

function examConfiguration(identifier = examId) {
  return db.prepare('SELECT exam_id AS id, title, duration_minutes AS durationMinutes FROM exams WHERE exam_id = ?')
    .get(identifier);
}

function examQuestions(identifier = examId, includeAnswers = false) {
  const questions = db.prepare(`
    SELECT question_id AS id, prompt, options_json AS optionsJson, correct_answer AS correctAnswer,
      position, is_active AS isActive
    FROM exam_questions
    WHERE exam_id = ?
    ORDER BY position, question_id
  `).all(identifier);

  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: JSON.parse(question.optionsJson),
    ...(includeAnswers ? { correctAnswer: question.correctAnswer } : {}),
    position: question.position,
    isActive: Boolean(question.isActive),
  }));
}

function latestExamResults(studentId) {
  return db.prepare(`
    SELECT exam_id AS examId, score, total_questions AS totalQuestions, submitted_at AS submittedAt
    FROM exam_submissions
    WHERE student_id = ?
    ORDER BY submitted_at DESC, id DESC
  `).all(studentId);
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/auth/login', loginLimiter, async (request, response, next) => {
  try {
    const body = request.body || {};
    const studentId = stringField(body.studentId, 32);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!studentId || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return response.status(400).json({ error: 'Enter your student ID and password.' });
    }

    const student = db.prepare('SELECT student_id, password_hash FROM students WHERE student_id = ? AND is_active = 1').get(studentId);
    const validPassword = student && await bcrypt.compare(password, student.password_hash);
    if (!validPassword) {
      return response.status(401).json({ error: 'Student ID or password is incorrect.' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO sessions (token_hash, student_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), student.student_id, Date.now() + sessionDurationSeconds * 1000);
    setSessionCookie(response, sessionCookie, token);
    return response.json({ student: { studentId: student.student_id } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (request, response) => {
  const token = readCookie(request, sessionCookie);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  response.setHeader('Set-Cookie', `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  response.status(204).end();
});

app.post('/api/admin/auth/login', loginLimiter, async (request, response, next) => {
  try {
    const body = request.body || {};
    const username = stringField(body.username, 32);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return response.status(400).json({ error: 'Enter your administrator username and password.' });
    }
    const admin = db.prepare('SELECT username, password_hash FROM admins WHERE username = ? AND is_active = 1').get(username);
    const validPassword = admin && await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return response.status(401).json({ error: 'Administrator username or password is incorrect.' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO admin_sessions (token_hash, username, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), admin.username, Date.now() + sessionDurationSeconds * 1000);
    setSessionCookie(response, adminSessionCookie, token);
    return response.json({ admin: { username: admin.username } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/auth/logout', (request, response) => {
  const token = readCookie(request, adminSessionCookie);
  if (token) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
  response.setHeader('Set-Cookie', `${adminSessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  response.status(204).end();
});

app.put('/api/admin/auth/password', requireAdmin, async (request, response, next) => {
  try {
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return response.status(400).json({ error: 'Choose a password that is 12–72 UTF-8 bytes long.' });
    }
    const currentToken = readCookie(request, adminSessionCookie);
    if (!currentToken) return response.status(401).json({ error: 'Sign in again before changing your password.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const update = db.transaction(() => {
      db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(passwordHash, request.adminUsername);
      db.prepare('DELETE FROM admin_sessions WHERE username = ? AND token_hash != ?')
        .run(request.adminUsername, hashToken(currentToken));
    });
    update();
    response.json({ passwordChanged: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/me', requireStudent, (request, response) => {
  const results = latestExamResults(request.studentId);
  const averageScore = results.length
    ? Math.round(results.reduce((total, result) => total + result.score, 0) / results.length)
    : null;
  const exam = examConfiguration();
  const activeQuestions = examQuestions().filter((question) => question.isActive);

  response.json({
    student: { studentId: request.studentId },
    dashboard: {
      exams: exam ? [{
        id: exam.id,
        title: exam.title,
        questions: activeQuestions.length,
        durationMinutes: exam.durationMinutes,
        status: activeQuestions.length ? 'Ready' : 'Unavailable',
      }] : [],
      submissions: results,
      averageScore,
    },
  });
});

app.post('/api/enquiries', enquiryLimiter, (request, response) => {
  const body = request.body || {};
  const enquiry = {
    name: stringField(body.name, 120),
    email: stringField(body.email, 254),
    phone: stringField(body.phone, 40),
    destination: stringField(body.destination, 40),
    programme: stringField(body.programme, 160),
    message: stringField(body.message, 2000),
  };

  if (Object.values(enquiry).some((value) => !value)) {
    return response.status(400).json({ error: 'Complete every field using the permitted lengths.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email)) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (enquiry.destination !== 'Nigeria' && !destinations.has(enquiry.destination)) {
    return response.status(400).json({ error: 'Choose one of the listed study destinations.' });
  }

  const result = db.prepare(`
    INSERT INTO enquiries (name, email, phone, destination, programme, message)
    VALUES (@name, @email, @phone, @destination, @programme, @message)
  `).run(enquiry);
  response.status(201).json({ id: result.lastInsertRowid, message: 'Your enquiry has been received.' });
});

app.post('/api/pathway-plans', pathwayLimiter, (request, response) => {
  const body = request.body || {};
  const profile = {
    name: stringField(body.name, 120),
    email: stringField(body.email, 254),
    phone: stringField(body.phone, 40),
    qualification: body.qualification,
    interests: stringField(body.interests, 500),
    countries: body.countries,
    annualBudgetNgn: body.annualBudgetNgn,
    startDate: body.startDate,
  };
  const countryOptions = new Set(destinations);

  if (!profile.name || !profile.email || !profile.phone || !profile.interests
    || !Object.hasOwn(qualificationLabels, profile.qualification)
    || !Array.isArray(profile.countries) || !profile.countries.length
    || profile.countries.some((country) => !countryOptions.has(country))
    || new Set(profile.countries).size !== profile.countries.length
    || !Number.isSafeInteger(profile.annualBudgetNgn) || profile.annualBudgetNgn < 1
    || profile.annualBudgetNgn > 10_000_000_000
    || typeof profile.startDate !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(profile.startDate)
    || profile.startDate < new Date().toISOString().slice(0, 7)
    || body.consent !== true) {
    return response.status(400).json({ error: 'Complete the planner with valid details, at least one destination, a future start month, and consent.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!/^[+0-9() -]{7,40}$/.test(profile.phone)) {
    return response.status(400).json({ error: 'Enter a valid phone number.' });
  }

  const recommendations = recommendPathways(profile);
  const result = db.prepare(`
    INSERT INTO pathway_plans
      (name, email, phone, qualification, interests, countries_json, annual_budget_ngn, start_date, recommendations_json)
    VALUES
      (@name, @email, @phone, @qualification, @interests, @countries, @budget, @startDate, @recommendations)
  `).run({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    qualification: profile.qualification,
    interests: profile.interests,
    countries: JSON.stringify(profile.countries),
    budget: profile.annualBudgetNgn,
    startDate: profile.startDate,
    recommendations: JSON.stringify(recommendations),
  });

  response.status(201).json({ id: result.lastInsertRowid, recommendations });
});

app.get('/api/exams/:examId', requireStudent, (request, response) => {
  const config = examConfiguration(request.params.examId);
  if (!config) return response.status(404).json({ error: 'Exam not found.' });
  const questions = examQuestions(config.id).filter((question) => question.isActive);
  const savedAnswers = db.prepare(`
    SELECT question_id AS questionId, answer
    FROM exam_answers
    WHERE student_id = ? AND exam_id = ?
  `).all(request.studentId, config.id);

  response.json({
    exam: config,
    questions: questions.map(({ isActive, ...question }) => question),
    answers: Object.fromEntries(savedAnswers.map((item) => [item.questionId, item.answer])),
  });
});

app.put('/api/exams/:examId/answers/:questionId', requireStudent, (request, response) => {
  const question = db.prepare(`
    SELECT question_id FROM exam_questions
    WHERE exam_id = ? AND question_id = ? AND is_active = 1
  `).get(request.params.examId, request.params.questionId);
  if (!question) return response.status(404).json({ error: 'Active exam question not found.' });
  const answer = request.body?.answer;
  if (!['A', 'B', 'C', 'D'].includes(answer)) {
    return response.status(400).json({ error: 'Choose a valid answer before saving.' });
  }

  db.prepare(`
    INSERT INTO exam_answers (student_id, exam_id, question_id, answer, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(student_id, exam_id, question_id)
    DO UPDATE SET answer = excluded.answer, updated_at = CURRENT_TIMESTAMP
  `).run(request.studentId, request.params.examId, request.params.questionId, answer);
  response.json({ saved: true });
});

app.post('/api/exams/:examId/submissions', requireStudent, (request, response) => {
  const questions = examQuestions(request.params.examId, true).filter((question) => question.isActive);
  if (!questions.length) return response.status(409).json({ error: 'This exam has no active questions.' });

  const answers = request.body?.answers;
  const timedOut = request.body?.timedOut === true;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)
    || questions.some((question) => answers[question.id] !== undefined && !['A', 'B', 'C', 'D'].includes(answers[question.id]))
    || (!timedOut && questions.some((question) => !answers[question.id]))) {
    return response.status(400).json({ error: 'Answer every active question before submitting.' });
  }

  const correctAnswers = questions.filter((question) => answers[question.id] === question.correctAnswer).length;
  const score = Math.round((correctAnswers / questions.length) * 100);
  const submit = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO exam_submissions (student_id, exam_id, score, total_questions)
      VALUES (?, ?, ?, ?)
    `).run(request.studentId, request.params.examId, score, questions.length);
    db.prepare('DELETE FROM exam_answers WHERE student_id = ? AND exam_id = ?')
      .run(request.studentId, request.params.examId);
    return result.lastInsertRowid;
  });

  response.status(201).json({
    submission: { id: submit(), examId: request.params.examId, score, totalQuestions: questions.length },
  });
});

app.get('/api/admin/overview', requireAdmin, (_request, response) => {
  response.json({
    students: db.prepare('SELECT COUNT(*) AS total, SUM(is_active) AS active FROM students').get(),
    enquiries: db.prepare("SELECT COUNT(*) AS total, SUM(status = 'new') AS new FROM enquiries").get(),
    pathwayPlans: db.prepare("SELECT COUNT(*) AS total, SUM(status = 'new') AS new FROM pathway_plans").get(),
    submissions: db.prepare('SELECT COUNT(*) AS total FROM exam_submissions').get(),
    questions: db.prepare('SELECT COUNT(*) AS total FROM exam_questions WHERE exam_id = ? AND is_active = 1').get(examId),
  });
});

app.get('/api/admin/pathway-plans', requireAdmin, (_request, response) => {
  const plans = db.prepare(`
    SELECT id, name, email, phone, qualification, interests, countries_json AS countriesJson,
      annual_budget_ngn AS annualBudgetNgn, start_date AS startDate,
      recommendations_json AS recommendationsJson, status, counsellor_notes AS counsellorNotes,
      created_at AS createdAt
    FROM pathway_plans ORDER BY created_at DESC, id DESC
  `).all().map((plan) => ({
    ...plan,
    qualificationLabel: qualificationLabels[plan.qualification] || 'Other qualification',
    countries: JSON.parse(plan.countriesJson),
    recommendations: JSON.parse(plan.recommendationsJson),
  }));
  response.json({ plans });
});

app.patch('/api/admin/pathway-plans/:id', requireAdmin, (request, response) => {
  const status = request.body?.status;
  const counsellorNotes = request.body?.counsellorNotes;
  if (!['new', 'reviewed', 'contacted', 'closed'].includes(status)
    || typeof counsellorNotes !== 'string' || counsellorNotes.length > 2000) {
    return response.status(400).json({ error: 'Provide a valid review status and notes (up to 2000 characters).' });
  }
  const result = db.prepare(`
    UPDATE pathway_plans SET status = ?, counsellor_notes = ? WHERE id = ?
  `).run(status, counsellorNotes.trim(), request.params.id);
  if (!result.changes) return response.status(404).json({ error: 'Pathway plan not found.' });
  response.json({ id: Number(request.params.id), status, counsellorNotes: counsellorNotes.trim() });
});

app.delete('/api/admin/pathway-plans/:id', requireAdmin, (request, response) => {
  const result = db.prepare('DELETE FROM pathway_plans WHERE id = ?').run(request.params.id);
  if (!result.changes) return response.status(404).json({ error: 'Pathway plan not found.' });
  response.status(204).end();
});

app.get('/api/admin/me', requireAdmin, (request, response) => {
  response.json({ admin: { username: request.adminUsername } });
});

app.get('/api/admin/students', requireAdmin, (_request, response) => {
  const students = db.prepare(`
    SELECT students.student_id AS studentId, students.is_active AS isActive,
      students.created_at AS createdAt, COUNT(exam_submissions.id) AS submissions
    FROM students
    LEFT JOIN exam_submissions ON exam_submissions.student_id = students.student_id
    GROUP BY students.student_id
    ORDER BY students.created_at DESC, students.student_id
  `).all().map((student) => ({ ...student, isActive: Boolean(student.isActive) }));
  response.json({ students });
});

app.post('/api/admin/students', requireAdmin, async (request, response, next) => {
  try {
    const body = request.body || {};
    const studentId = stringField(body.studentId, 32);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!studentId || !/^[a-z0-9-]+$/i.test(studentId)) {
      return response.status(400).json({ error: 'Student ID must use only letters, numbers, and hyphens.' });
    }
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return response.status(400).json({ error: 'Student password must be 12–72 UTF-8 bytes.' });
    }
    if (db.prepare('SELECT 1 FROM students WHERE student_id = ?').get(studentId)) {
      return response.status(409).json({ error: 'That student ID is already in use.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('INSERT INTO students (student_id, password_hash) VALUES (?, ?)').run(studentId, passwordHash);
    response.status(201).json({ student: { studentId, isActive: true } });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/students/:studentId', requireAdmin, (request, response) => {
  const active = request.body?.isActive;
  if (typeof active !== 'boolean') return response.status(400).json({ error: 'Choose whether the student account is active.' });
  const student = db.prepare('SELECT student_id FROM students WHERE student_id = ?').get(request.params.studentId);
  if (!student) return response.status(404).json({ error: 'Student not found.' });
  db.prepare('UPDATE students SET is_active = ? WHERE student_id = ?').run(active ? 1 : 0, student.student_id);
  if (!active) db.prepare('DELETE FROM sessions WHERE student_id = ?').run(student.student_id);
  response.json({ studentId: student.student_id, isActive: active });
});

app.put('/api/admin/students/:studentId/password', requireAdmin, async (request, response, next) => {
  try {
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return response.status(400).json({ error: 'Student password must be 12–72 UTF-8 bytes.' });
    }
    const student = db.prepare('SELECT student_id FROM students WHERE student_id = ?').get(request.params.studentId);
    if (!student) return response.status(404).json({ error: 'Student not found.' });
    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE students SET password_hash = ? WHERE student_id = ?').run(passwordHash, student.student_id);
    db.prepare('DELETE FROM sessions WHERE student_id = ?').run(student.student_id);
    response.json({ studentId: student.student_id, passwordChanged: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/enquiries', requireAdmin, (_request, response) => {
  const enquiries = db.prepare(`
    SELECT id, name, email, phone, destination, programme, message, status, created_at AS createdAt
    FROM enquiries ORDER BY created_at DESC, id DESC
  `).all();
  response.json({ enquiries });
});

app.patch('/api/admin/enquiries/:id', requireAdmin, (request, response) => {
  const status = request.body?.status;
  if (!['new', 'contacted', 'closed'].includes(status)) {
    return response.status(400).json({ error: 'Enquiry status must be new, contacted, or closed.' });
  }
  const result = db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, request.params.id);
  if (!result.changes) return response.status(404).json({ error: 'Enquiry not found.' });
  response.json({ id: Number(request.params.id), status });
});

app.delete('/api/admin/enquiries/:id', requireAdmin, (request, response) => {
  const result = db.prepare('DELETE FROM enquiries WHERE id = ?').run(request.params.id);
  if (!result.changes) return response.status(404).json({ error: 'Enquiry not found.' });
  response.status(204).end();
});

app.get('/api/admin/results', requireAdmin, (_request, response) => {
  const results = db.prepare(`
    SELECT exam_submissions.id, exam_submissions.student_id AS studentId,
      exams.title AS examTitle, exam_submissions.score,
      exam_submissions.total_questions AS totalQuestions,
      exam_submissions.submitted_at AS submittedAt
    FROM exam_submissions
    LEFT JOIN exams ON exams.exam_id = exam_submissions.exam_id
    ORDER BY exam_submissions.submitted_at DESC, exam_submissions.id DESC
    LIMIT 500
  `).all();
  response.json({ results });
});

app.get('/api/admin/exam', requireAdmin, (_request, response) => {
  response.json({ exam: examConfiguration(), questions: examQuestions(examId, true) });
});

app.put('/api/admin/exam', requireAdmin, (request, response) => {
  const title = stringField(request.body?.title, 120);
  const durationMinutes = request.body?.durationMinutes;
  if (!title || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
    return response.status(400).json({ error: 'Enter an exam title and a duration from 1 to 240 minutes.' });
  }
  db.prepare('UPDATE exams SET title = ?, duration_minutes = ? WHERE exam_id = ?')
    .run(title, durationMinutes, examId);
  response.json({ exam: examConfiguration() });
});

function validateQuestion(body) {
  const prompt = stringField(body?.prompt, 1000);
  const options = body?.options;
  const correctAnswer = body?.correctAnswer;
  if (!prompt || !options || typeof options !== 'object' || Array.isArray(options)
    || ['A', 'B', 'C', 'D'].some((key) => !stringField(options[key], 500))
    || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    return null;
  }
  return {
    prompt,
    options: Object.fromEntries(['A', 'B', 'C', 'D'].map((key) => [key, options[key].trim()])),
    correctAnswer,
    isActive: body.isActive !== false,
  };
}

app.post('/api/admin/exam/questions', requireAdmin, (request, response) => {
  const question = validateQuestion(request.body);
  if (!question) {
    return response.status(400).json({ error: 'Provide a question, four options, and a correct answer.' });
  }
  const questionId = `q-${crypto.randomUUID()}`;
  const position = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM exam_questions WHERE exam_id = ?').get(examId).next;
  db.prepare(`
    INSERT INTO exam_questions (question_id, exam_id, prompt, options_json, correct_answer, position, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(questionId, examId, question.prompt, JSON.stringify(question.options), question.correctAnswer, position, question.isActive ? 1 : 0);
  response.status(201).json({ question: { id: questionId, ...question, position } });
});

app.put('/api/admin/exam/questions/:questionId', requireAdmin, (request, response) => {
  const question = validateQuestion(request.body);
  if (!question) {
    return response.status(400).json({ error: 'Provide a question, four options, and a correct answer.' });
  }
  const current = db.prepare('SELECT position FROM exam_questions WHERE question_id = ? AND exam_id = ?')
    .get(request.params.questionId, examId);
  if (!current) return response.status(404).json({ error: 'Question not found.' });
  if (!question.isActive) {
    const activeCount = db.prepare('SELECT COUNT(*) AS total FROM exam_questions WHERE exam_id = ? AND is_active = 1').get(examId).total;
    if (activeCount === 1 && db.prepare('SELECT is_active FROM exam_questions WHERE question_id = ?').get(request.params.questionId).is_active) {
      return response.status(400).json({ error: 'At least one exam question must remain active.' });
    }
  }
  db.prepare(`
    UPDATE exam_questions
    SET prompt = ?, options_json = ?, correct_answer = ?, is_active = ?
    WHERE question_id = ? AND exam_id = ?
  `).run(question.prompt, JSON.stringify(question.options), question.correctAnswer, question.isActive ? 1 : 0, request.params.questionId, examId);
  response.json({ question: { id: request.params.questionId, ...question, position: current.position } });
});

app.delete('/api/admin/exam/questions/:questionId', requireAdmin, (request, response) => {
  const question = db.prepare('SELECT is_active FROM exam_questions WHERE question_id = ? AND exam_id = ?')
    .get(request.params.questionId, examId);
  if (!question) return response.status(404).json({ error: 'Question not found.' });
  if (question.is_active) {
    const activeCount = db.prepare('SELECT COUNT(*) AS total FROM exam_questions WHERE exam_id = ? AND is_active = 1').get(examId).total;
    if (activeCount === 1) return response.status(400).json({ error: 'At least one exam question must remain active.' });
  }
  db.prepare('DELETE FROM exam_questions WHERE question_id = ? AND exam_id = ?').run(request.params.questionId, examId);
  db.prepare('DELETE FROM exam_answers WHERE exam_id = ? AND question_id = ?').run(examId, request.params.questionId);
  response.status(204).end();
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not found.' });
});

app.get('/', (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get(['/portal.html','/student-dashboard'], (_request,response)=>response.redirect('/portal'));
app.get(['/hostel','/pay-fees','/apply','/book-consultation'], (_request,response)=>response.sendFile(path.join(__dirname,'journey/live.html')));
app.get(['/enrol','/payment-status'],(_request,response)=>response.sendFile(path.join(__dirname,'journey/access.html')));
app.get(['/student/login','/set-password','/forgot-password','/recover-student-id','/admin/login','/portal','/admin'],(_request,response)=>response.sendFile(path.join(__dirname,'journey/live.html')));
app.get(['/pathways','/university/:id','/exams','/exams/:id','/about','/faq','/contact','/news','/login','/signup'], (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.use('/journey/dist', express.static(path.join(__dirname, 'journey/dist'), { dotfiles: 'deny', index: false }));
app.get('/journey/theme.css', (_request,response)=>response.sendFile(path.join(__dirname,'journey/theme.css')));
app.get('/journey/workspace-tokens.css', (_request,response)=>response.sendFile(path.join(__dirname,'journey/workspace-tokens.css')));
app.get('/journey/workspace.css', (_request,response)=>response.sendFile(path.join(__dirname,'journey/workspace.css')));
app.get('/journey/icons/:name.svg', (request,response)=>{const allowed=new Set(['route','house','book-open','bell','user-round','menu','search','globe','credit-card','file-text','check','mail','calendar-days']);if(!allowed.has(request.params.name))return response.sendStatus(404);response.sendFile(path.join(__dirname,'journey/dist/icons',`${request.params.name}.svg`));});
app.get(['/pay-fees', '/apply', '/application-status', '/book-consultation', '/hostel', '/my-bookings', '/student-dashboard'], (_request, response) => response.sendFile(path.join(__dirname, 'student-services.html')));
app.use('/student-services', express.static(path.join(__dirname, 'student-services'), { dotfiles: 'deny', index: false }));
app.get(
  ['/index.html', '/portal.html', '/exam.html', '/admin.html', '/styles.css', '/portal.css', '/admin.css', '/admin-polish.css', '/redesign.css', '/script.js', '/admin.js', '/admin-design.js', '/ui-enhancements.js'],
  express.static(path.join(__dirname), { index: false, dotfiles: 'deny' })
);
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny', index: false }));

app.use((error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) return;
  const status = error.type === 'entity.parse.failed' ? 400 : 500;
  response.status(status).json({ error: status === 400 ? 'Request body must contain valid JSON.' : 'An unexpected server error occurred.' });
});

const server = app.listen(port, () => {
  console.log(`NewworldPathway server listening at http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
