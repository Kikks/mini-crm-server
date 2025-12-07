import { tool } from "ai";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { contacts, interactions } from "../db/schema";
import { parseDate } from "../utils/date-parser";
import {
	addInteractionSchema,
	updateInteractionSchema,
	getInteractionsSchema,
} from "./schemas";

export function getInteractionTools(userId: string): Record<string, any> {
	const addInteraction = tool({
		description: "Log an interaction (call, email, meeting) with a contact",
		inputSchema: addInteractionSchema,
		execute: async ({
			contactId,
			type,
			summary,
			outcome,
			sentiment,
			occurredAt,
		}) => {
			const contact = await db.query.contacts.findFirst({
				where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			});

			if (!contact) {
				return { success: false, error: "Contact not found" };
			}

			const parsedDate = occurredAt ? parseDate(occurredAt) : null;

			const [interaction] = await db
				.insert(interactions)
				.values({
					type,
					summary,
					outcome,
					sentiment,
					contactId,
					userId,
					occurredAt: parsedDate?.date || new Date(),
				})
				.returning();

			return { success: true, interaction };
		},
	});

	const updateInteraction = tool({
		description: "Update an existing interaction",
		inputSchema: updateInteractionSchema,
		execute: async ({ interactionId, updates }) => {
			const updateData: Record<string, unknown> = { ...updates };

			if (updates.occurredAt) {
				const parsedDate = parseDate(updates.occurredAt);
				updateData.occurredAt = parsedDate?.date || new Date();
			}

			const [interaction] = await db
				.update(interactions)
				.set(updateData)
				.where(
					and(
						eq(interactions.id, interactionId),
						eq(interactions.userId, userId)
					)
				)
				.returning();

			if (!interaction) {
				return { success: false, error: "Interaction not found" };
			}

			return { success: true, interaction };
		},
	});

	const getInteractions = tool({
		description: "Get interactions for a contact",
		inputSchema: getInteractionsSchema,
		execute: async ({ contactId, limit }) => {
			const results = await db.query.interactions.findMany({
				where: and(
					eq(interactions.userId, userId),
					eq(interactions.contactId, contactId)
				),
				orderBy: desc(interactions.occurredAt),
				limit,
				with: { notes: true },
			});

			return { interactions: results };
		},
	});

	return {
		addInteraction,
		updateInteraction,
		getInteractions,
	};
}
