import { db } from "../db";
import { threads, messages } from "../db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { generateText, ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import {
	PaginationParams,
	PaginatedResponse,
	createPaginatedResponse,
} from "../utils/pagination";

export async function generateThreadName(firstMessage: string) {
	const { text } = await generateText({
		model: openai("gpt-4o-mini"),
		system:
			"Generate a short, descriptive title (max 6 words) for a CRM conversation. Return only the title, no quotes or punctuation.",
		prompt: firstMessage,
		maxOutputTokens: 20,
	});

	return text.trim();
}

export async function createThread(userId: string, firstMessage: string) {
	const name = await generateThreadName(firstMessage);
	const [thread] = await db
		.insert(threads)
		.values({ userId, name })
		.returning();
	return thread;
}

export async function getThread(userId: string, threadId: string) {
	return db.query.threads.findFirst({
		where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
		with: {
			messages: {
				orderBy: messages.createdAt,
			},
		},
	});
}

export async function getRecentThreads(
	userId: string,
	pagination: PaginationParams
): Promise<PaginatedResponse<typeof threads.$inferSelect>> {
	const conditions = [eq(threads.userId, userId)];

	const [totalResult] = await db
		.select({ count: count() })
		.from(threads)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.threads.findMany({
		where: and(...conditions),
		orderBy: desc(threads.updatedAt),
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

export async function addMessage(
	threadId: string,
	role: "user" | "assistant" | "tool",
	content: string | null,
	toolCalls?: unknown,
	toolResults?: unknown
) {
	const [message] = await db
		.insert(messages)
		.values({
			threadId,
			role,
			content,
			toolCalls: toolCalls || null,
			toolResults: toolResults || null,
		})
		.returning();

	await db
		.update(threads)
		.set({ updatedAt: new Date() })
		.where(eq(threads.id, threadId));

	return message;
}

export function toAIMessages(
	dbMessages: (typeof messages.$inferSelect)[]
): ModelMessage[] {
	return dbMessages.map((msg) => {
		if (msg.role === "tool") {
			return {
				role: "tool" as const,
				content: msg.toolResults as any,
			};
		}

		return {
			role: msg.role as "user" | "assistant",
			content: msg.content || "",
			...((msg.toolCalls as unknown as Record<string, unknown>) && {
				toolCalls: msg.toolCalls,
			}),
		};
	});
}
