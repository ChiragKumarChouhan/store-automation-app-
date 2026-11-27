import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { env } from '../config/env.js';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  // Connect to default 'postgres' database to ensure target database exists
  const adminClient = new Client({
    host: env.db.host,
    port: env.db.port,
    database: 'postgres',
    user: env.db.user,
    password: env.db.password,
  });

  await adminClient.connect();
  try {
    const dbCheck = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [env.db.database]
    );
    if (dbCheck.rowCount === 0) {
      const safeDbName = env.db.database.replace(/[^a-zA-Z0-9_]/g, '');
      await adminClient.query(`CREATE DATABASE "${safeDbName}"`);
      console.log(`Created PostgreSQL database "${safeDbName}".`);
    }
  } finally {
    await adminClient.end();
  }

  // Apply schema.sql to the target database
  const dbClient = new Client({
    host: env.db.host,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
  });

  await dbClient.connect();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await dbClient.query(schemaSql);
    await dbClient.query(`
      INSERT INTO store_settings (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('Database schema applied successfully.');
  } finally {
    await dbClient.end();
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}
