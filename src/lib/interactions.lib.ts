import { db } from "../db";
import { contacts, interactions, notes } from "../db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import {
	PaginationParams,
	PaginatedResponse,
	createPaginatedResponse,
} from "../utils/pagination";

export type InteractionType = "call" | "email" | "meeting" | "other";
export type Sentiment = "positive" | "neutral" | "negative";

export interface CreateInteractionData {
	contactId: string;
	type: InteractionType;
	summary?: string | null;
	outcome?: string | null;
	sentiment?: Sentiment | null;
	occurredAt: Date;
}

export interface UpdateInteractionData {
	type?: InteractionType;
	summary?: string | null;
	outcome?: string | null;
	sentiment?: Sentiment | null;
	occurredAt?: Date;
}

export async function createInteraction(
	userId: string,
	data: CreateInteractionData
) {
	const [interaction] = await db
		.insert(interactions)
		.values({
			userId,
			contactId: data.contactId,
			type: data.type,
			summary: data.summary ?? null,
			outcome: data.outcome ?? null,
			sentiment: data.sentiment ?? null,
			occurredAt: data.occurredAt,
		})
		.returning();

	return interaction;
}

export async function getInteraction(userId: string, interactionId: string) {
	return db.query.interactions.findFirst({
		where: and(
			eq(interactions.id, interactionId),
			eq(interactions.userId, userId)
		),
		with: {
			contact: {
				with: {
					company: true,
				},
			},
			notes: true,
			notifications: true,
		},
	});
}

export async function getAllInteractions(
	userId: string,
	pagination: PaginationParams,
	contactId?: string
): Promise<
	PaginatedResponse<
		typeof interactions.$inferSelect & {
			contact: typeof contacts.$inferSelect;
		}
	>
> {
	const conditions = [eq(interactions.userId, userId)];

	if (contactId) {
		conditions.push(eq(interactions.contactId, contactId));
	}

	const [totalResult] = await db
		.select({ count: count() })
		.from(interactions)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.interactions.findMany({
		where: and(...conditions),
		orderBy: desc(interactions.occurredAt),
		with: {
			contact: true,
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

export async function getInteractionsByContact(
	userId: string,
	contactId: string,
	pagination: PaginationParams
): Promise<
	PaginatedResponse<
		typeof interactions.$inferSelect & {
			notes: (typeof notes.$inferSelect)[];
		}
	>
> {
	const conditions = [
		eq(interactions.userId, userId),
		eq(interactions.contactId, contactId),
	];

	const [totalResult] = await db
		.select({ count: count() })
		.from(interactions)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.interactions.findMany({
		where: and(...conditions),
		orderBy: desc(interactions.occurredAt),
		with: {
			notes: true,
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

export async function updateInteraction(
	userId: string,
	interactionId: string,
	data: UpdateInteractionData
) {
	const [updated] = await db
		.update(interactions)
		.set(data)
		.where(
			and(eq(interactions.id, interactionId), eq(interactions.userId, userId))
		)
		.returning();

	return updated;
}

export async function deleteInteraction(userId: string, interactionId: string) {
	const [deleted] = await db
		.delete(interactions)
		.where(
			and(eq(interactions.id, interactionId), eq(interactions.userId, userId))
		)
		.returning();

	return deleted;
}
