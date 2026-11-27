import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

// Use Render DATABASE_URL when available
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      // Local PostgreSQL configuration
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

console.log("Database configuration: Using Render DATABASE_URL");

try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log("Database host:", dbUrl.hostname);
  console.log("Database port:", dbUrl.port || "5432");
} catch {
  console.error("DATABASE_URL is not a valid URL");
}
export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export const query = (text, params) => pool.query(text, params);

export const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
