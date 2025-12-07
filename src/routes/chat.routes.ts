import { Router } from "express";
import { streamText, stepCountIs } from "ai";
import { eq, and } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";

import { db } from "../db";
import { threads, messages } from "../db/schema";
import { getTools } from "../tools";
import { SYSTEM_PROMPT } from "../prompts/system";
import { getUserId } from "../lib/auth.lib";
import { toAIMessages } from "../lib/thread.lib";
import { logger } from "../utils/logger";

export const chatRouter = Router();

chatRouter.post("/:threadId/messages", async (req, res) => {
	try {
		const userId = getUserId(req);
		const { threadId } = req.params;
		const { content } = req.body;

		if (!content || typeof content !== "string") {
			return res.status(400).json({ error: "Message content is required" });
		}

		// TODO: Limit the number of messages in the thread, and work on a summarisation service
		// to optimise the amount of tokens used for chat
		const thread = await db.query.threads.findFirst({
			where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
			with: {
				messages: {
					orderBy: messages.createdAt,
				},
			},
		});

		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		await db.insert(messages).values({
			threadId,
			role: "user",
			content,
		});

		const messageHistory = toAIMessages(thread.messages);

		messageHistory.push({ role: "user", content });

		const tools = getTools(userId);

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("X-Accel-Buffering", "no");

		let fullText = "";
		let toolCallsData: unknown[] = [];
		let toolResultsData: unknown[] = [];

		const result = streamText({
			model: openai.chat("gpt-4o"),
			system: SYSTEM_PROMPT,
			messages: messageHistory,
			tools,
			stopWhen: stepCountIs(10),
			onChunk: ({ chunk }) => {
				if (chunk.type === "text-delta") {
					const text = (chunk as { text?: string }).text || "";
					res.write(
						`data: ${JSON.stringify({ type: "text-delta", text })}\n\n`
					);
					fullText += text;
				} else if (chunk.type === "tool-call") {
					const toolChunk = chunk as {
						toolName?: string;
						input?: unknown;
					};
					res.write(
						`data: ${JSON.stringify({
							type: "tool-call",
							toolName: toolChunk.toolName,
							args: toolChunk.input,
						})}\n\n`
					);
				} else if (chunk.type === "tool-result") {
					const resultChunk = chunk as {
						toolName?: string;
						output?: unknown;
					};
					res.write(
						`data: ${JSON.stringify({
							type: "tool-result",
							toolName: resultChunk.toolName,
							result: resultChunk.output,
						})}\n\n`
					);
				}
			},
			onStepFinish: async ({ text, toolCalls, toolResults }) => {
				if (text) {
					fullText += text;
				}
				if (toolCalls?.length) {
					toolCallsData.push(...toolCalls);
				}
				if (toolResults?.length) {
					toolResultsData.push(...toolResults);
				}
			},
		});

		const finalText = await result.text;
		const finalToolCalls = await result.toolCalls;
		const finalToolResults = await result.toolResults;

		if (finalText) {
			fullText = finalText;
		}
		if (finalToolCalls?.length) {
			toolCallsData = finalToolCalls;
		}
		if (finalToolResults?.length) {
			toolResultsData = finalToolResults;
		}

		await db.insert(messages).values({
			threadId,
			role: "assistant",
			content: fullText,
			toolCalls: toolCallsData.length ? toolCallsData : null,
			toolResults: toolResultsData.length ? toolResultsData : null,
		});

		await db
			.update(threads)
			.set({ updatedAt: new Date() })
			.where(eq(threads.id, threadId));

		res.write(
			`data: ${JSON.stringify({
				type: "done",
				message: fullText,
				toolCalls: toolCallsData.length ? toolCallsData : undefined,
			})}\n\n`
		);

		res.end();
	} catch (error) {
		logger.error("Chat stream error", error);

		if (res.headersSent) {
			res.write(
				`data: ${JSON.stringify({ type: "error", error: "Stream failed" })}\n\n`
			);
			res.end();
		} else {
			res.status(500).json({ error: "Failed to process message" });
		}
	}
});

chatRouter.post("/:threadId/messages/sync", async (req, res) => {
	try {
		const userId = getUserId(req);
		const { threadId } = req.params;
		const { content } = req.body;

		if (!content || typeof content !== "string") {
			return res.status(400).json({ error: "Message content is required" });
		}

		const thread = await db.query.threads.findFirst({
			where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
			with: {
				messages: {
					orderBy: messages.createdAt,
				},
			},
		});

		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		await db.insert(messages).values({
			threadId,
			role: "user",
			content,
		});

		const messageHistory = toAIMessages(thread.messages);
		messageHistory.push({ role: "user", content });

		const tools = getTools(userId);

		const result = streamText({
			model: openai.chat("gpt-4o"),
			system: SYSTEM_PROMPT,
			messages: messageHistory,
			tools,
		});

		const text = await result.text;
		const toolCalls = (await result.toolCalls) || [];
		const toolResults = (await result.toolResults) || [];

		await db.insert(messages).values({
			threadId,
			role: "assistant",
			content: text,
			toolCalls: toolCalls.length ? toolCalls : null,
			toolResults: toolResults.length ? toolResults : null,
		});

		await db
			.update(threads)
			.set({ updatedAt: new Date() })
			.where(eq(threads.id, threadId));

		res.json({
			message: text,
			toolCalls: toolCalls.length ? toolCalls : undefined,
		});
	} catch (error) {
		logger.error("Chat sync error", error);
		res.status(500).json({ error: "Failed to process message" });
	}
});
