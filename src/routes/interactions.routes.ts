import { Router } from "express";
import { z } from "zod";
import { getUserId } from "../lib/auth.lib";
import {
	createInteraction,
	getInteraction,
	getAllInteractions,
	updateInteraction,
	deleteInteraction,
	getInteractionsByContact,
} from "../lib/interactions.lib";
import { logger } from "../utils/logger";
import { parsePaginationParams } from "../utils/pagination";

const router = Router();

const interactionTypeSchema = z.enum(["call", "email", "meeting", "other"]);
const sentimentSchema = z.enum(["positive", "neutral", "negative"]);

const createInteractionSchema = z.object({
	contactId: z.string().min(1, "Contact ID is required"),
	type: interactionTypeSchema,
	summary: z.string().optional().nullable(),
	outcome: z.string().optional().nullable(),
	sentiment: sentimentSchema.optional().nullable(),
	occurredAt: z.string().transform((val) => new Date(val)),
});

const updateInteractionSchema = z.object({
	type: interactionTypeSchema.optional(),
	summary: z.string().optional().nullable(),
	outcome: z.string().optional().nullable(),
	sentiment: sentimentSchema.optional().nullable(),
	occurredAt: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
});

router.get("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const contactId = req.query.contactId as string | undefined;
		const interactions = await getAllInteractions(
			userId,
			pagination,
			contactId
		);
		res.json(interactions);
	} catch (error) {
		logger.error("Failed to fetch interactions", error);
		res.status(500).json({ error: "Failed to fetch interactions" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const interaction = await getInteraction(userId, req.params.id);

		if (!interaction) {
			return res.status(404).json({ error: "Interaction not found" });
		}

		res.json(interaction);
	} catch (error) {
		logger.error("Failed to fetch interaction", error);
		res.status(500).json({ error: "Failed to fetch interaction" });
	}
});

router.post("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = createInteractionSchema.parse(req.body);
		const interaction = await createInteraction(userId, data);

		logger.info(`Created ${interaction.type} interaction`);
		res.status(201).json(interaction);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to create interaction", error);
		res.status(500).json({ error: "Failed to create interaction" });
	}
});

router.put("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = updateInteractionSchema.parse(req.body);
		const interaction = await updateInteraction(userId, req.params.id, data);

		if (!interaction) {
			return res.status(404).json({ error: "Interaction not found" });
		}

		logger.info(`Updated interaction: ${interaction.id}`);
		res.json(interaction);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to update interaction", error);
		res.status(500).json({ error: "Failed to update interaction" });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const interaction = await deleteInteraction(userId, req.params.id);

		if (!interaction) {
			return res.status(404).json({ error: "Interaction not found" });
		}

		logger.info(`Deleted interaction: ${interaction.id}`);
		res.status(204).send();
	} catch (error) {
		logger.error("Failed to delete interaction", error);
		res.status(500).json({ error: "Failed to delete interaction" });
	}
});

router.get("/contact/:contactId", async (req, res) => {
	try {
		const userId = getUserId(req);
		const contactId = req.params.contactId;
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const interactions = await getInteractionsByContact(
			userId,
			contactId,
			pagination
		);
		res.json(interactions);
	} catch (error) {
		logger.error("Failed to fetch interactions", error);
		res.status(500).json({ error: "Failed to fetch interactions" });
	}
});

export default router;
