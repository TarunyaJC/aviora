/**
 * SQLite-backed collections — drop-in replacement for the JSON layer.
 *
 * The `payload` column stores each row EXACTLY as the domain models it, so
 * read/write round-trips are lossless and services need no changes. A few
 * derived columns (per-table mappers) are extracted on write to power UNIQUE
 * constraints, indexes and referential checks at the storage layer.
 */
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase, withTransaction } from './connection.js';
import { runMigrations } from './migrate.js';
import { ApiError, ErrorCodes } from '../../utils/ApiError.js';

export interface CollectionRow {
  id: string;
  payload: string;
}

export type DerivedColumns<T> = (row: T) => Record<string, string | number | null>;

export interface SqliteCollectionOptions<T> {
  /** Column that holds the row identity (default 'id'; airports use 'code'). */
  idField?: keyof T & string;
  /** Extra physical columns extracted from the row on write. */
  columns?: DerivedColumns<T>;
}

let initialized: DatabaseSync | null = null;

function ensureSchema(db: DatabaseSync): void {
  if (initialized === db) return;
  runMigrations(db);
  initialized = db;
}

function getReadyDatabase(): DatabaseSync {
  const db = getDatabase();
  ensureSchema(db);
  return db;
}

function storageError(operation: string, detail = ''): ApiError {
  return new ApiError(500, ErrorCodes.INTERNAL, `Data storage error during ${operation}${detail ? `: ${detail}` : ''}`);
}

function allRows(db: DatabaseSync, table: string, idField: string): CollectionRow[] {
  try {
    return db.prepare(`SELECT ${quoteIdent(idField)} AS id, payload FROM ${table} ORDER BY rowid`).all() as unknown as CollectionRow[];
  } catch {
    throw storageError(`read (${table})`);
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Mirror the domain shape: id-keyed rows ordered by numeric suffix (FLT-002 < FLT-010). */
function numericIdSuffix(id: string): number {
  const match = /(\d+)$/.exec(id);
  return match ? Number(match[1]) : Number.NaN;
}

function compareIds(a: string, b: string): number {
  const na = numericIdSuffix(a);
  const nb = numericIdSuffix(b);
  if (Number.isNaN(na) || Number.isNaN(nb) || na === nb) return a.localeCompare(b);
  return na - nb;
}

export class SqliteCollection<T extends object> {
  private readonly idField: keyof T & string;

  constructor(
    private readonly table: string,
    private readonly options: SqliteCollectionOptions<T> = {},
  ) {
    this.idField = options.idField ?? ('id' as keyof T & string);
  }

  async read(): Promise<T[]> {
    const rows = allRows(getReadyDatabase(), this.table, this.idField);
    return rows
      .map((row) => {
        const parsed = JSON.parse(row.payload) as T;
        const record = parsed as { id?: unknown };
        // Keep the authoritative identity in sync with the physical column.
        if (this.idField !== 'id' || record.id === row.id) return parsed;
        return { ...parsed, id: row.id } as T;
      })
      .sort((a, b) => compareIds(String(a[this.idField]), String(b[this.idField])));
  }

  async findById(value: string): Promise<T | undefined> {
    const rows = await this.read();
    return rows.find((row) => String(row[this.idField]) === value);
  }

  async write(rows: T[]): Promise<void> {
    try {
      withTransaction(() => {
        const db = getDatabase();
        const existing = new Set(
          (db.prepare(`SELECT ${quoteIdent(this.idField)} FROM ${this.table}`).all() as Array<Record<string, unknown>>)
            .map((r) => String(r[this.idField])),
        );
        const incoming = new Set<string>();

        for (const row of rows) {
          const rowId = String(row[this.idField]);
          incoming.add(rowId);
          const derived = this.options.columns ? this.options.columns(row) : {};
          const colNames = [this.idField, ...Object.keys(derived), 'payload'];
          const values = [rowId, ...Object.values(derived), JSON.stringify(row)];
          const placeholders = colNames.map(() => '?').join(', ');
          const updates = Object.keys(derived)
            .map((c) => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`)
            .join(', ');
          const sql =
            `INSERT INTO ${this.table} (${colNames.map(quoteIdent).join(', ')}) VALUES (${placeholders}) ` +
            `ON CONFLICT(${quoteIdent(this.idField)}) DO UPDATE SET payload = excluded.payload${updates ? `, ${updates}` : ''}`;
          db.prepare(sql).run(...values);
        }

        for (const staleId of existing) {
          if (!incoming.has(staleId)) {
            db.prepare(`DELETE FROM ${this.table} WHERE ${quoteIdent(this.idField)} = ?`).run(staleId);
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      throw storageError(`write (${this.table})`, detail);
    }
  }
}

/**
 * Reference data (airports, airlines, aircraft) is write-once at seed time and
 * read constantly — expose it through the read-only repository shape the
 * services already depend on.
 */
export class SqliteReferenceRepository<T extends object> {
  constructor(private readonly collection: SqliteCollection<T>) {}

  async all(): Promise<T[]> {
    return this.collection.read();
  }

  async findById(id: string): Promise<T | undefined> {
    return this.collection.findById(id);
  }
}
