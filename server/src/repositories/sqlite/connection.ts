import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

/**
 * SQLite connection — the ONLY module that owns the database handle.
 * Uses Node's built-in `node:sqlite` (no native addons, no external server),
 * so `npm install && npm run dev` works with zero configuration.
 */

const defaultDataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../data',
);

export function resolveDatabasePath(): string {
  if (process.env.AVIORA_DB_PATH) return path.resolve(process.env.AVIORA_DB_PATH);
  const dataDir = process.env.AVIORA_DATA_DIR
    ? path.resolve(process.env.AVIORA_DATA_DIR)
    : defaultDataDir;
  return path.join(dataDir, 'aviora.db');
}

let database: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (database) return database;
  const filePath = resolveDatabasePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  database = new DatabaseSync(filePath);
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');
  return database;
}

/** Run a group of statements atomically. Do NOT nest transactions. */
export function withTransaction<T>(operation: () => T): T {
  const db = getDatabase();
  db.exec('BEGIN');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** Test/diagnostic helper — closes and forgets the handle. */
export function closeDatabase(): void {
  database?.close();
  database = null;
}
