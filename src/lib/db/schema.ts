import type Database from 'better-sqlite3';
import { CATEGORIES_SEED } from '../constants';

const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        receipt_path TEXT,
        reimbursement_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (reimbursement_id) REFERENCES reimbursements(id)
      );

      CREATE TABLE IF NOT EXISTS reimbursements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        category_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        receipt_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by INTEGER,
        reviewed_at TEXT,
        review_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_sync_status ON transactions(sync_status);
      CREATE INDEX IF NOT EXISTS idx_reimbursements_user_id ON reimbursements(user_id);
      CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status);
      CREATE INDEX IF NOT EXISTS idx_reimbursements_sync_status ON reimbursements(sync_status);
      CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
    `,
  },
];

export function runMigrations(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`);

  const applied = new Set(
    (db.prepare('SELECT version FROM _migrations').all() as { version: number }[]).map(r => r.version)
  );

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) {
      db.transaction(() => {
        db.exec(migration.up);
        db.prepare(`INSERT INTO _migrations (version, applied_at) VALUES (?, datetime('now'))`).run(migration.version);
      })();
    }
  }

  // Seed categories if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    const seedAll = db.transaction(() => {
      for (const cat of CATEGORIES_SEED) {
        insert.run(cat.name, cat.type);
      }
    });
    seedAll();
  }
}
