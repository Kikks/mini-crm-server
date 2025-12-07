import { db } from "../db";
import { contacts, interactions, notifications } from "../db/schema";
import { eq, and, desc, lte, gte, count, lt } from "drizzle-orm";
import {
	PaginationParams,
	PaginatedResponse,
	createPaginatedResponse,
} from "../utils/pagination";

export type NotificationType =
	| "follow_up_email"
	| "follow_up_call"
	| "follow_up_meeting"
	| "general";

export interface CreateNotificationData {
	contactId?: string | null;
	interactionId?: string | null;
	type: NotificationType;
	title: string;
	description?: string | null;
	dueDate?: Date | null;
}

export interface UpdateNotificationData {
	contactId?: string | null;
	interactionId?: string | null;
	type?: NotificationType;
	title?: string;
	description?: string | null;
	dueDate?: Date | null;
}

export async function createNotification(
	userId: string,
	data: CreateNotificationData
) {
	const [notification] = await db
		.insert(notifications)
		.values({
			userId,
			contactId: data.contactId ?? null,
			interactionId: data.interactionId ?? null,
			type: data.type,
			title: data.title,
			description: data.description ?? null,
			dueDate: data.dueDate ?? null,
		})
		.returning();

	return notification;
}

export async function getNotification(userId: string, notificationId: string) {
	return db.query.notifications.findFirst({
		where: and(
			eq(notifications.id, notificationId),
			eq(notifications.userId, userId)
		),
		with: {
			contact: true,
			interaction: true,
		},
	});
}

export async function getAllNotifications(
	userId: string,
	pagination: PaginationParams,
	options?: { contactId?: string; completed?: boolean }
): Promise<
	PaginatedResponse<
		typeof notifications.$inferSelect & {
			contact: typeof contacts.$inferSelect | null;
			interaction: typeof interactions.$inferSelect | null;
		}
	>
> {
	const conditions = [eq(notifications.userId, userId)];

	if (options?.contactId) {
		conditions.push(eq(notifications.contactId, options.contactId));
	}

	if (options?.completed !== undefined) {
		conditions.push(eq(notifications.isCompleted, options.completed));
	}

	const [totalResult] = await db
		.select({ count: count() })
		.from(notifications)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notifications.findMany({
		where: and(...conditions),
		orderBy: desc(notifications.dueDate),
		with: {
			contact: true,
			interaction: true,
		},
		limit: pagination.limit,
		offset: pagination.offset,
	});

	return createPaginatedResponse(
		results,
		total,
		pagination.offset,
		pagination.limit
	);
}

export async function getNotificationCount(
	userId: string,
	status?: "pending" | "upcoming" | "overdue"
) {
	const conditions = [eq(notifications.userId, userId)];
	if (status === "pending") {
		conditions.push(eq(notifications.isCompleted, false));
	} else if (status === "upcoming") {
		const now = new Date();
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 365);
		conditions.push(gte(notifications.dueDate, now));
		conditions.push(lte(notifications.dueDate, futureDate));
		conditions.push(eq(notifications.isCompleted, false));
	} else if (status === "overdue") {
		const now = new Date();
		conditions.push(lt(notifications.dueDate, now));
		conditions.push(eq(notifications.isCompleted, false));
	}
	return db
		.select({ count: count() })
		.from(notifications)
		.where(and(...conditions));
}

export async function getPendingNotifications(
	userId: string,
	pagination: PaginationParams
): Promise<
	PaginatedResponse<
		typeof notifications.$inferSelect & {
			contact: typeof contacts.$inferSelect | null;
			interaction: typeof interactions.$inferSelect | null;
		}
	>
> {
	const conditions = [
		eq(notifications.userId, userId),
		eq(notifications.isCompleted, false),
	];

	const [totalResult] = await db
		.select({ count: count() })
		.from(notifications)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notifications.findMany({
		where: and(...conditions),
		orderBy: notifications.dueDate,
		with: {
			contact: true,
			interaction: true,
		},
		limit: pagination.limit,
		offset: pagination.offset,
	});

	return createPaginatedResponse(
		results,
		total,
		pagination.offset,
		pagination.limit
	);
}

export async function getUpcomingNotifications(
	userId: string,
	pagination: PaginationParams,
	daysAhead: number = 7
): Promise<
	PaginatedResponse<
		typeof notifications.$inferSelect & {
			contact: typeof contacts.$inferSelect | null;
			interaction: typeof interactions.$inferSelect | null;
		}
	>
> {
	const now = new Date();
	const futureDate = new Date();
	futureDate.setDate(futureDate.getDate() + daysAhead);

	const conditions = [
		eq(notifications.userId, userId),
		eq(notifications.isCompleted, false),
		gte(notifications.dueDate, now),
		lte(notifications.dueDate, futureDate),
	];

	const [totalResult] = await db
		.select({ count: count() })
		.from(notifications)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notifications.findMany({
		where: and(...conditions),
		orderBy: notifications.dueDate,
		with: {
			contact: true,
			interaction: true,
		},
		limit: pagination.limit,
		offset: pagination.offset,
	});

	return createPaginatedResponse(
		results,
		total,
		pagination.offset,
		pagination.limit
	);
}

export async function getOverdueNotifications(
	userId: string,
	pagination: PaginationParams
): Promise<
	PaginatedResponse<
		typeof notifications.$inferSelect & {
			contact: typeof contacts.$inferSelect | null;
			interaction: typeof interactions.$inferSelect | null;
		}
	>
> {
	const now = new Date();

	const conditions = [
		eq(notifications.userId, userId),
		eq(notifications.isCompleted, false),
		lte(notifications.dueDate, now),
	];

	const [totalResult] = await db
		.select({ count: count() })
		.from(notifications)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notifications.findMany({
		where: and(...conditions),
		orderBy: notifications.dueDate,
		with: {
			contact: true,
			interaction: true,
		},
		limit: pagination.limit,
		offset: pagination.offset,
	});

	return createPaginatedResponse(
		results,
		total,
		pagination.offset,
		pagination.limit
	);
}

export async function markNotificationComplete(
	userId: string,
	notificationId: string
) {
	const [updated] = await db
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

	return updated;
}

export async function markNotificationIncomplete(
	userId: string,
	notificationId: string
) {
	const [updated] = await db
		.update(notifications)
		.set({
			isCompleted: false,
			completedAt: null,
		})
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId)
			)
		)
		.returning();

	return updated;
}

export async function updateNotification(
	userId: string,
	notificationId: string,
	data: UpdateNotificationData
) {
	const [updated] = await db
		.update(notifications)
		.set(data)
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId)
			)
		)
		.returning();

	return updated;
}

export async function deleteNotification(
	userId: string,
	notificationId: string
) {
	const [deleted] = await db
		.delete(notifications)
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId)
			)
		)
		.returning();

	return deleted;
}
