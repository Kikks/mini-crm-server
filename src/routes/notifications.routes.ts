import { Router } from "express";
import { z } from "zod";
import { getUserId } from "../lib/auth.lib";
import {
	createNotification,
	getNotification,
	getAllNotifications,
	getPendingNotifications,
	getUpcomingNotifications,
	getOverdueNotifications,
	markNotificationComplete,
	markNotificationIncomplete,
	updateNotification,
	deleteNotification,
	getNotificationCount,
} from "../lib/notifications.lib";
import { logger } from "../utils/logger";
import { parsePaginationParams } from "../utils/pagination";

const router = Router();

const notificationTypeSchema = z.enum([
	"follow_up_email",
	"follow_up_call",
	"follow_up_meeting",
	"general",
]);

const createNotificationSchema = z.object({
	contactId: z.string().optional().nullable(),
	interactionId: z.string().optional().nullable(),
	type: notificationTypeSchema,
	title: z.string().min(1, "Title is required"),
	description: z.string().optional().nullable(),
	dueDate: z
		.string()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
});

const updateNotificationSchema = z.object({
	contactId: z.string().optional().nullable(),
	interactionId: z.string().optional().nullable(),
	type: notificationTypeSchema.optional(),
	title: z.string().min(1).optional(),
	description: z.string().optional().nullable(),
	dueDate: z
		.string()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
});

router.get("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const options = {
			contactId: req.query.contactId as string | undefined,
			completed:
				req.query.completed !== undefined
					? req.query.completed === "true"
					: undefined,
		};

		const notifications = await getAllNotifications(
			userId,
			pagination,
			options
		);
		res.json(notifications);
	} catch (error) {
		logger.error("Failed to fetch notifications", error);
		res.status(500).json({ error: "Failed to fetch notifications" });
	}
});

router.get("/count", async (req, res) => {
	try {
		const userId = getUserId(req);
		const status = req.query.status as
			| "pending"
			| "upcoming"
			| "overdue"
			| undefined;
		const countResult = await getNotificationCount(userId, status);
		const count = countResult[0]?.count ?? 0;
		res.json({ count });
	} catch (error) {
		logger.error("Failed to fetch notification count", error);
		res.status(500).json({ error: "Failed to fetch notification count" });
	}
});

router.get("/pending", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const notifications = await getPendingNotifications(userId, pagination);
		res.json(notifications);
	} catch (error) {
		logger.error("Failed to fetch pending notifications", error);
		res.status(500).json({ error: "Failed to fetch pending notifications" });
	}
});

router.get("/upcoming", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const days = req.query.days ? parseInt(req.query.days as string) : 7;
		const notifications = await getUpcomingNotifications(
			userId,
			pagination,
			days
		);
		res.json(notifications);
	} catch (error) {
		logger.error("Failed to fetch upcoming notifications", error);
		res.status(500).json({ error: "Failed to fetch upcoming notifications" });
	}
});

router.get("/overdue", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const notifications = await getOverdueNotifications(userId, pagination);
		res.json(notifications);
	} catch (error) {
		logger.error("Failed to fetch overdue notifications", error);
		res.status(500).json({ error: "Failed to fetch overdue notifications" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const notification = await getNotification(userId, req.params.id);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found" });
		}

		res.json(notification);
	} catch (error) {
		logger.error("Failed to fetch notification", error);
		res.status(500).json({ error: "Failed to fetch notification" });
	}
});

router.post("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = createNotificationSchema.parse(req.body);
		const notification = await createNotification(userId, data);

		logger.info(`Created notification: ${notification.title}`);
		res.status(201).json(notification);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to create notification", error);
		res.status(500).json({ error: "Failed to create notification" });
	}
});

router.post("/:id/complete", async (req, res) => {
	try {
		const userId = getUserId(req);
		const notification = await markNotificationComplete(userId, req.params.id);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found" });
		}

		logger.info(`Completed notification: ${notification.title}`);
		res.json(notification);
	} catch (error) {
		logger.error("Failed to complete notification", error);
		res.status(500).json({ error: "Failed to complete notification" });
	}
});

router.post("/:id/incomplete", async (req, res) => {
	try {
		const userId = getUserId(req);
		const notification = await markNotificationIncomplete(
			userId,
			req.params.id
		);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found" });
		}

		logger.info(`Marked notification incomplete: ${notification.title}`);
		res.json(notification);
	} catch (error) {
		logger.error("Failed to mark notification incomplete", error);
		res.status(500).json({ error: "Failed to mark notification incomplete" });
	}
});

router.put("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = updateNotificationSchema.parse(req.body);
		const notification = await updateNotification(userId, req.params.id, data);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found" });
		}

		logger.info(`Updated notification: ${notification.title}`);
		res.json(notification);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to update notification", error);
		res.status(500).json({ error: "Failed to update notification" });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const notification = await deleteNotification(userId, req.params.id);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found" });
		}

		logger.info(`Deleted notification: ${notification.title}`);
		res.status(204).send();
	} catch (error) {
		logger.error("Failed to delete notification", error);
		res.status(500).json({ error: "Failed to delete notification" });
	}
});

export default router;
