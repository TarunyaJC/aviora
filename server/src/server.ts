import { createApp } from './app.js';
import { env } from './config/env.js';
import { getDatabase, resolveDatabasePath, closeDatabase } from './repositories/sqlite/connection.js';
import { isDatabaseSeeded, seedDatabase } from './scripts/seed.js';

async function main(): Promise<void> {
  // Ensure the SQLite database exists, then auto-seed an empty one so a fresh
  // clone works with `npm install && npm run dev` — no manual seed step needed.
  getDatabase();
  if (!isDatabaseSeeded()) {
    console.log('[AVIORA] Empty database detected — seeding demo catalog…');
    await seedDatabase();
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[AVIORA] API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[AVIORA] Database: ${resolveDatabasePath()}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`[AVIORA] ${signal} received — shutting down`);
      closeDatabase();
      server.close(() => process.exit(0));
    });
  }
}

main().catch((error) => {
  console.error('[AVIORA] Failed to start server:', error);
  process.exit(1);
});
