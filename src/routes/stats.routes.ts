import { Router } from "express";
import { getUserId } from "../lib/auth.lib";
import { getDashboardStats, TimeRange } from "../lib/stats.lib";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const timeRange = (req.query.timeRange as TimeRange | undefined) || "all";

		if (timeRange && !["7d", "30d", "all"].includes(timeRange)) {
			return res.status(400).json({
				error: "Invalid timeRange. Must be '7d', '30d', or 'all'",
			});
		}

		const stats = await getDashboardStats(userId, timeRange);
		res.json(stats);
	} catch (error) {
		logger.error("Failed to fetch dashboard stats", error);
		res.status(500).json({ error: "Failed to fetch dashboard stats" });
	}
});

export default router;
