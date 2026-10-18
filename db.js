const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const databasePath = path.resolve(
  process.env.DATABASE_PATH || path.join(__dirname, 'data', 'newworldpathway.sqlite')
);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    username TEXT PRIMARY KEY COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL REFERENCES admins(username) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS admin_sessions_expires_at ON admin_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    destination TEXT NOT NULL,
    programme TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pathway_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    qualification TEXT NOT NULL,
    interests TEXT NOT NULL,
    countries_json TEXT NOT NULL,
    annual_budget_ngn INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    recommendations_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'closed')),
    counsellor_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS pathway_plans_status ON pathway_plans(status, created_at);

  CREATE TABLE IF NOT EXISTS exams (
    exam_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS exam_questions (
    question_id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    position INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS exam_answers (
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    answer TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, exam_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS exam_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS exam_submissions_student
    ON exam_submissions(student_id, submitted_at);
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('students', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('enquiries', 'status', "TEXT NOT NULL DEFAULT 'new'");

db.prepare(`
  INSERT OR IGNORE INTO exams (exam_id, title, duration_minutes)
  VALUES ('english-assessment', 'English Language Assessment', 30)
`).run();

db.prepare(`
  INSERT OR IGNORE INTO exam_questions
    (question_id, exam_id, prompt, options_json, correct_answer, position, is_active)
  VALUES (?, ?, ?, ?, ?, 1, 1)
`).run(
  'question-01',
  'english-assessment',
  'Choose the sentence that is grammatically correct.',
  JSON.stringify({
    A: 'She have completed the assignment.',
    B: 'She has completed the assignment.',
    C: 'She completed has the assignment.',
    D: 'She has complete the assignment.',
  }),
  'B'
);

module.exports = db;
