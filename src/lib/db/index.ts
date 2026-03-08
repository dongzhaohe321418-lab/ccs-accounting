import { createClient, type Client } from '@libsql/client';
import { runMigrations } from './schema';

let client: Client | null = null;
let migrated = false;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

export async function ensureDb(): Promise<Client> {
  const db = getDb();
  if (!migrated) {
    await runMigrations(db);
    migrated = true;
  }
  return db;
}
