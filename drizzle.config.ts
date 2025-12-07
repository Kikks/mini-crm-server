import { defineConfig } from "drizzle-kit";

import { DB_URL } from "./src/utils/constants";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: DB_URL,
	},
});
