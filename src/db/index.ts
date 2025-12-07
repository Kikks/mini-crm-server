import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import { logger } from "../utils/logger.js";
import { DB_URL } from "../utils/constants.js";

logger.info("Initializing PostgreSQL database connection");

const connectionString = DB_URL;

const pool = new pg.Pool({
	connectionString,
});

export const db = drizzle(pool, { schema });

logger.info("Database connection established");
