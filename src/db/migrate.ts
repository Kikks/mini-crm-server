import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { logger } from "../utils/logger.js";
import { DB_URL } from "../utils/constants.js";

const connectionString = DB_URL;

const pool = new pg.Pool({
	connectionString,
});

const db = drizzle(pool);

logger.info("Starting database migrations...");

try {
	await migrate(db, { migrationsFolder: "./src/db/drizzle" });
	logger.info("Migrations applied successfully!");
} catch (error) {
	logger.error("Migration failed", error);
	process.exit(1);
} finally {
	await pool.end();
}
