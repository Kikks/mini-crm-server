import { tool } from "ai";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema";
import { parseDate } from "../utils/date-parser";
import {
	createNotificationSchema,
	getNotificationsSchema,
	notificationIdSchema,
} from "./schemas";

export function getNotificationTools(userId: string): Record<string, any> {
	const createNotification = tool({
		description: "Create a follow-up reminder or task",
		inputSchema: createNotificationSchema,
		execute: async ({
			title,
			type,
			contactId,
			interactionId,
			description,
			dueDate,
		}) => {
			const parsedDate = dueDate ? parseDate(dueDate) : null;

			const [notification] = await db
				.insert(notifications)
				.values({
					title,
					type,
					contactId,
					interactionId,
					description,
					userId,
					dueDate: parsedDate?.date,
				})
				.returning();

			return { success: true, notification };
		},
	});

	const getNotifications = tool({
		description: "Get pending follow-up reminders and tasks",
		inputSchema: getNotificationsSchema,
		execute: async ({ includeCompleted, contactId }) => {
			const conditions = [eq(notifications.userId, userId)];

			if (!includeCompleted) {
				conditions.push(eq(notifications.isCompleted, false));
			}

			if (contactId) {
				conditions.push(eq(notifications.contactId, contactId));
			}

			const results = await db.query.notifications.findMany({
				where: and(...conditions),
				with: { contact: true },
				orderBy: (n, { asc }) => [asc(n.dueDate)],
			});

			return { notifications: results };
		},
	});

	const completeNotification = tool({
		description: "Mark a notification/reminder as complete",
		inputSchema: notificationIdSchema,
		execute: async ({ notificationId }) => {
			const [notification] = await db
				.update(notifications)
				.set({
					isCompleted: true,
					completedAt: new Date(),
				})
				.where(
					and(
						eq(notifications.id, notificationId),
						eq(notifications.userId, userId)
					)
				)
				.returning();

			if (!notification) {
				return { success: false, error: "Notification not found" };
			}

			return { success: true, notification };
		},
	});

	return {
		createNotification,
		getNotifications,
		completeNotification,
	};
}
