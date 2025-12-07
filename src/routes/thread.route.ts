import { Router } from "express";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { threads, messages } from "../db/schema";
import { generateThreadName, getRecentThreads } from "../lib/thread.lib.js";
import { getUserId } from "../lib/auth.lib";
import { parsePaginationParams } from "../utils/pagination";

export const threadsRouter = Router();

threadsRouter.get("/", async (req, res) => {
	const userId = getUserId(req);
	const pagination = parsePaginationParams(
		req.query as Record<string, string | undefined>
	);

	const userThreads = await getRecentThreads(userId, pagination);

	res.json(userThreads);
});

threadsRouter.post("/", async (req, res) => {
	const userId = getUserId(req);
	const { firstMessage } = req.body;

	const name = firstMessage
		? await generateThreadName(firstMessage)
		: "New conversation";

	const [thread] = await db
		.insert(threads)
		.values({ userId, name })
		.returning();

	res.status(201).json(thread);
});

threadsRouter.get("/:threadId", async (req, res) => {
	const userId = getUserId(req);
	const { threadId } = req.params;

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

	res.json(thread);
});

threadsRouter.delete("/:threadId", async (req, res) => {
	const userId = getUserId(req);
	const { threadId } = req.params;

	await db
		.delete(threads)
		.where(and(eq(threads.id, threadId), eq(threads.userId, userId)));

	res.status(204).send();
});
