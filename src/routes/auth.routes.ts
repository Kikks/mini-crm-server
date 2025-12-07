import { Router } from "express";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/express";
import { ensureUser, handleClerkWebhook } from "../lib/auth.lib";
import { logger } from "../utils/logger";
import { CLERK_WEBHOOK_SECRET } from "../utils/constants";

const router = Router();

router.get("/me", async (req, res) => {
	try {
		const user = await ensureUser(req);
		res.json(user);
	} catch (error) {
		logger.error("Failed to get current user", error);
		res.status(401).json({ error: "Unauthorized" });
	}
});

router.post("/webhooks/clerk", async (req, res) => {
	if (!CLERK_WEBHOOK_SECRET) {
		logger.error("CLERK_WEBHOOK_SECRET is not set");
		return res.status(500).json({ error: "Webhook secret not configured" });
	}

	const svix_id = req.headers["svix-id"] as string;
	const svix_timestamp = req.headers["svix-timestamp"] as string;
	const svix_signature = req.headers["svix-signature"] as string;

	if (!svix_id || !svix_timestamp || !svix_signature) {
		return res.status(400).json({ error: "Missing svix headers" });
	}

	const body = JSON.stringify(req.body);

	const wh = new Webhook(CLERK_WEBHOOK_SECRET);

	let event: WebhookEvent;

	try {
		event = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		logger.error("Webhook verification failed", err);
		return res.status(400).json({ error: "Webhook verification failed" });
	}

	try {
		await handleClerkWebhook(event);
		logger.info(`Processed Clerk webhook: ${event.type}`);
		res.json({ received: true });
	} catch (error) {
		logger.error(`Failed to process Clerk webhook: ${event.type}`, error);
		res.status(500).json({ error: "Failed to process webhook" });
	}
});

export default router;
