const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
require('dotenv').config();
const db = require('./db');

async function main() {
  const studentId = process.argv[2]?.trim();
  if (!studentId || studentId.length > 32 || !/^[a-z0-9-]+$/i.test(studentId)) {
    throw new Error('Usage: npm run create-student -- <student-id> (letters, numbers, and hyphens only)');
  }

  if (db.prepare('SELECT 1 FROM students WHERE student_id = ?').get(studentId)) {
    throw new Error(`Student ${studentId} already exists.`);
  }

  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    const password = await terminal.question('New password (minimum 12 characters): ');
    const confirmation = await terminal.question('Confirm password: ');

    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters.');
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Password must not exceed 72 UTF-8 bytes.');
    }
    if (password !== confirmation) {
      throw new Error('Passwords do not match.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('INSERT INTO students (student_id, password_hash) VALUES (?, ?)').run(studentId, passwordHash);
    console.log(`Student ${studentId} created.`);
  } finally {
    terminal.close();
    db.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  if (db.open) db.close();
  process.exitCode = 1;
});
