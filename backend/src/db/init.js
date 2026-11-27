import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  try {
    console.log("Initializing database schema...");

    // Use the shared pool.
    // Render uses DATABASE_URL; local development uses local PostgreSQL.
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    await pool.query(schemaSql);

    await pool.query(`
      INSERT INTO store_settings (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log("Database schema applied successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  initializeDatabase()
    .then(async () => {
      console.log("Database initialization complete.");
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Database initialization failed:", error);
      await pool.end();
      process.exit(1);
    });
}
