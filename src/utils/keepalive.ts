import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { logger } from "./logger.js";

let lastDatabasePing: Date | null = null;

const DATABASE_PING_INTERVAL_DAYS = 5;

export async function pingDatabase(): Promise<{
	success: boolean;
	pinged: boolean;
	message: string;
	lastPing?: Date;
}> {
	const now = new Date();

	// Check if we need to ping (first time or enough days have passed)
	const shouldPing =
		!lastDatabasePing ||
		now.getTime() - lastDatabasePing.getTime() >=
			DATABASE_PING_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

	if (!shouldPing) {
		const daysSinceLastPing = Math.floor(
			(now.getTime() - lastDatabasePing!.getTime()) / (24 * 60 * 60 * 1000)
		);
		return {
			success: true,
			pinged: false,
			message: `Database ping not needed. Last ping was ${daysSinceLastPing} days ago.`,
			lastPing: lastDatabasePing ?? undefined,
		};
	}

	try {
		await db.execute(sql`SELECT 1`);

		lastDatabasePing = now;
		logger.info(
			`Database keep-alive ping successful. Next ping in ${DATABASE_PING_INTERVAL_DAYS} days.`
		);

		return {
			success: true,
			pinged: true,
			message: "Database ping successful",
			lastPing: now,
		};
	} catch (error) {
		logger.error("Database keep-alive ping failed:", error);
		return {
			success: false,
			pinged: false,
			message: `Database ping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastPing: lastDatabasePing ?? undefined,
		};
	}
}

export function getKeepAliveStatus(): {
	lastPing: Date | null;
	nextPingDue: Date | null;
	daysUntilNextPing: number | null;
} {
	const now = new Date();

	if (!lastDatabasePing) {
		return {
			lastPing: null,
			nextPingDue: null,
			daysUntilNextPing: null,
		};
	}

	const nextPingDue = new Date(
		lastDatabasePing.getTime() +
			DATABASE_PING_INTERVAL_DAYS * 24 * 60 * 60 * 1000
	);
	const daysUntilNextPing = Math.ceil(
		(nextPingDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
	);

	return {
		lastPing: lastDatabasePing,
		nextPingDue,
		daysUntilNextPing: daysUntilNextPing > 0 ? daysUntilNextPing : 0,
	};
}
