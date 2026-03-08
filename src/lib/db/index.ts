import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './schema';

const DB_PATH = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/ccs.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Critical stability settings
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  runMigrations(db);

  return db;
}
