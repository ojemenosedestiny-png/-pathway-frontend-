const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
require('dotenv').config();
const db = require('./db');

async function main() {
  const username = process.argv[2]?.trim();
  if (!username || username.length > 32 || !/^[a-z0-9._-]+$/i.test(username)) {
    throw new Error('Usage: npm run create-admin -- <username> (letters, numbers, dots, underscores, and hyphens only)');
  }
  if (db.prepare('SELECT 1 FROM admins WHERE username = ?').get(username)) {
    throw new Error(`Administrator ${username} already exists.`);
  }

  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    const password = await terminal.question('Admin password (12–72 UTF-8 bytes): ');
    const confirmation = await terminal.question('Confirm password: ');
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Password must be 12–72 UTF-8 bytes.');
    }
    if (password !== confirmation) throw new Error('Passwords do not match.');

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    console.log(`Administrator ${username} created. Keep the credentials private.`);
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
