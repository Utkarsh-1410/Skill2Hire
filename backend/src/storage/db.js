import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { createRequire } from 'module';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'skill2hire.sqlite');

let singleton;

export async function getDb() {
  if (singleton) return singleton;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const require = createRequire(import.meta.url);
  const wasmDir = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file)
  });

  let db;
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  migrate(db);

  singleton = createDbFacade({ db, persist: () => persist(db) });
  return singleton;
}

function migrate(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      passwordHash TEXT NOT NULL
    );
  `);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

  db.run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      resumeText TEXT NOT NULL,
      jobDescription TEXT NOT NULL,
      resultJson TEXT NOT NULL
    );
  `);

  try {
    db.run(`ALTER TABLE analyses ADD COLUMN userId TEXT NOT NULL DEFAULT '';`);
  } catch {
    // ignore if already exists
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      weekOf TEXT NOT NULL,
      dsa INTEGER NOT NULL,
      projects INTEGER NOT NULL,
      skills INTEGER NOT NULL,
      notes TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_week ON progress(userId, weekOf);`);
}

function persist(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function createDbFacade({ db, persist }) {
  return {
    createUser({ name, email, passwordHash }) {
      const id = cryptoRandomId();
      const createdAt = new Date().toISOString();
      const stmt = db.prepare(`INSERT INTO users (id, createdAt, name, email, passwordHash) VALUES (?, ?, ?, ?, ?);`);
      stmt.run([id, createdAt, name, email.toLowerCase(), passwordHash]);
      stmt.free();
      persist();
      return { id, createdAt, name, email: email.toLowerCase() };
    },

    getUserByEmail(email) {
      const stmt = db.prepare(`SELECT id, createdAt, name, email, passwordHash FROM users WHERE email = ?;`);
      stmt.bind([String(email || '').toLowerCase()]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row && row.id ? row : null;
    },

    getUserById(id) {
      const stmt = db.prepare(`SELECT id, createdAt, name, email FROM users WHERE id = ?;`);
      stmt.bind([id]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row && row.id ? row : null;
    },

    insertAnalysis({ userId, resumeText, jobDescription, resultJson }) {
      const id = cryptoRandomId();
      const createdAt = new Date().toISOString();
      const stmt = db.prepare(`INSERT INTO analyses (id, userId, createdAt, resumeText, jobDescription, resultJson) VALUES (?, ?, ?, ?, ?, ?);`);
      stmt.run([id, userId, createdAt, resumeText, jobDescription, resultJson]);
      stmt.free();
      persist();
      return id;
    },

    getAnalysisByIdForUser({ id, userId }) {
      const stmt = db.prepare(`SELECT id, userId, createdAt, resumeText, jobDescription, resultJson FROM analyses WHERE id = ? AND userId = ?;`);
      stmt.bind([id, userId]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row && row.id ? row : null;
    },

    upsertProgress({ userId, weekOf, dsa, projects, skills, notes }) {
      const existing = this.getProgressByUserWeek(userId, weekOf);
      const updatedAt = new Date().toISOString();

      if (!existing) {
        const id = cryptoRandomId();
        const stmt = db.prepare(`
          INSERT INTO progress (id, userId, weekOf, dsa, projects, skills, notes, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `);
        stmt.run([id, userId, weekOf, dsa, projects, skills, notes || '', updatedAt]);
        stmt.free();
        persist();
        return { id, userId, weekOf, dsa, projects, skills, notes: notes || '', updatedAt };
      }

      const stmt = db.prepare(`
        UPDATE progress
        SET dsa = ?, projects = ?, skills = ?, notes = ?, updatedAt = ?
        WHERE userId = ? AND weekOf = ?;
      `);
      stmt.run([dsa, projects, skills, notes || '', updatedAt, userId, weekOf]);
      stmt.free();
      persist();

      return { ...existing, dsa, projects, skills, notes: notes || '', updatedAt };
    },

    getProgressByUserWeek(userId, weekOf) {
      const stmt = db.prepare(`SELECT id, userId, weekOf, dsa, projects, skills, notes, updatedAt FROM progress WHERE userId = ? AND weekOf = ?;`);
      stmt.bind([userId, weekOf]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row && row.id ? row : null;
    },

    listProgress(userId) {
      const stmt = db.prepare(`SELECT id, userId, weekOf, dsa, projects, skills, notes, updatedAt FROM progress WHERE userId = ? ORDER BY weekOf DESC;`);
      stmt.bind([userId]);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    }
  };
}

function cryptoRandomId() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}
