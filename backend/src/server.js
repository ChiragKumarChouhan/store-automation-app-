import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { seedDatabase } from './db/seed.js';

async function startServer() {
  try {
    await seedDatabase();
    await pool.query('SELECT 1');
    app.listen(env.port, () => {
      console.log(`Store Automation API running on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error('Failed to start Store Automation API:', err);
    process.exit(1);
  }
}

startServer();
