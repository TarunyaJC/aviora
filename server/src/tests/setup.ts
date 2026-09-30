import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Point the DataStore at an isolated fixture directory BEFORE any app module
 * is imported, so tests never read or overwrite the real JSON seed data.
 */
const testDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.testdata');
mkdirSync(testDir, { recursive: true });
process.env.AVIORA_DATA_DIR = testDir;
