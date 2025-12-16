import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";

import appRoutes from "./src/routes";
import { logger, logRequests } from "./src/utils/logger.js";
import { pingDatabase, getKeepAliveStatus } from "./src/utils/keepalive.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(logRequests);
app.use(clerkMiddleware());

// Routes
app.use("/api", appRoutes);
app.get("/api/health", (_, res) => {
	res.json({ status: "ok" });
});

// Keep-alive endpoint for Render and Supabase
// External cron service should ping this every 10-14 minutes to keep Render awake
// This endpoint also pings Supabase periodically (every 5 days) to keep it active
app.get("/api/keepalive", async (req, res) => {
	try {
		// Optional: Check for keep-alive secret token if configured
		const keepAliveSecret = process.env.KEEPALIVE_SECRET;
		if (keepAliveSecret) {
			const providedSecret =
				req.query.secret || req.headers["x-keepalive-secret"];
			if (providedSecret !== keepAliveSecret) {
				return res.status(401).json({
					status: "error",
					message: "Unauthorized: Invalid keep-alive secret",
				});
			}
		}

		// Ping database if needed (throttled to every 5 days)
		const dbPingResult = await pingDatabase();
		const status = getKeepAliveStatus();

		// Always return success to keep Render awake, even if database ping failed
		res.json({
			status: "ok",
			timestamp: new Date().toISOString(),
			database: {
				pinged: dbPingResult.pinged,
				success: dbPingResult.success,
				message: dbPingResult.message,
				lastPing: status.lastPing?.toISOString() || null,
				nextPingDue: status.nextPingDue?.toISOString() || null,
				daysUntilNextPing: status.daysUntilNextPing,
			},
		});
	} catch (error) {
		// Even on unexpected errors, return success to keep Render awake
		logger.error("Keep-alive endpoint error:", error);
		res.json({
			status: "ok",
			timestamp: new Date().toISOString(),
			error: "Internal error occurred, but endpoint is functional",
		});
	}
});

// Start server
app.listen(PORT, () => {
	logger.info(`Server started on http://localhost:${PORT}`);
	logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});
