import { createClient, type Client } from '@libsql/client';
import { runMigrations } from './schema';

let client: Client | null = null;
let migrationPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  // Assign immediately to prevent race condition where concurrent calls
  // could create multiple clients
  const newClient = createClient({ url, authToken });
  client = newClient;
  return client;
}

export async function ensureDb(): Promise<Client> {
  const db = getDb();

  // Use shared promise to prevent concurrent migrations
  if (!migrationPromise) {
    migrationPromise = runMigrations(db).catch((err) => {
      // Reset on failure so next call can retry
      migrationPromise = null;
      throw err;
    });
  }
  await migrationPromise;
  return db;
}
