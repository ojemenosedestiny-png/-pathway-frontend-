// Server-only owner bootstrap. Never expose this script or its environment to a browser.
require('dotenv').config();
const crypto=require('node:crypto');
const bcrypt=require('bcryptjs');
const db=require('./db');
try {
 const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const password=process.env.ADMIN_INITIAL_PASSWORD||'';
 if(!/^\S+@\S+\.\S+$/.test(email))throw Error('Set ADMIN_EMAIL to a valid owner email.');
 if(password.length<12||Buffer.byteLength(password,'utf8')>72)throw Error('ADMIN_INITIAL_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes.');
 db.exec(`CREATE TABLE IF NOT EXISTS owner_admin_accounts (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL COLLATE NOCASE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role='Super Admin'),requires_two_factor INTEGER NOT NULL DEFAULT 1,must_change_password INTEGER NOT NULL DEFAULT 1,is_active INTEGER NOT NULL DEFAULT 1,session_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
 if(db.prepare('SELECT id FROM owner_admin_accounts WHERE email = ?').get(email))throw Error('Owner already exists. This script will not overwrite an existing account or password.');
 const digest=bcrypt.hashSync(password,12);
 db.prepare('INSERT INTO owner_admin_accounts(id,email,password_hash,role) VALUES (?,?,?,?)').run(crypto.randomUUID(),email,digest,'Super Admin');
 console.log('Owner seed created. Two-factor authentication and initial password change are required. No credentials were printed.');
 console.log('BACKEND REQUIRED: connect this server-side identity table to the contracted admin authentication endpoints. Browser preview accounts are separate.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{db.close();}
