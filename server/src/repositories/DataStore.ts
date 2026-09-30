import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';

/**
 * DataStore — the ONLY module allowed to touch the filesystem.
 * JSON files are the persistence layer; there is intentionally no database.
 * Collections are cached in memory and flushed to disk on every write, so
 * in-memory state is always authoritative and survives restarts via files.
 */

export class JsonCollection<T extends { id: string }> {
  private cache: T[] | null = null;

  constructor(
    private readonly fileName: string,
    private readonly directory: string,
  ) {}

  private get filePath(): string {
    return path.join(this.directory, this.fileName);
  }

  async read(): Promise<T[]> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(raw) as T[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = [];
      } else {
        throw new ApiError(500, ErrorCodes.INTERNAL, `Data file ${this.fileName} is unreadable`);
      }
    }
    return this.cache;
  }

  async write(rows: T[]): Promise<void> {
    this.cache = rows;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(rows, null, 2), 'utf-8');
  }
}

/** Read-only reference collections (airports, airlines, aircraft). */
export class ReferenceRepository<T extends { id: string }> {
  private cache: T[] | null = null;

  constructor(private readonly load: () => Promise<T[]>) {}

  async all(): Promise<T[]> {
    this.cache ??= await this.load();
    return this.cache;
  }

  async findById(id: string): Promise<T | undefined> {
    const rows = await this.all();
    return rows.find((row) => row.id === id);
  }
}
