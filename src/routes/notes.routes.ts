import { Router } from "express";
import { z } from "zod";
import { getUserId } from "../lib/auth.lib";
import {
	createNote,
	getNote,
	getAllNotes,
	updateNote,
	deleteNote,
	getNotesByContact,
	getNotesByCompany,
	getNotesByInteraction,
} from "../lib/notes.lib";
import { logger } from "../utils/logger";
import { parsePaginationParams } from "../utils/pagination";

const router = Router();

const createNoteSchema = z.object({
	content: z.string().min(1, "Content is required"),
	contactId: z.string().optional().nullable(),
	companyId: z.string().optional().nullable(),
	interactionId: z.string().optional().nullable(),
});

const updateNoteSchema = z.object({
	content: z.string().min(1).optional(),
	contactId: z.string().optional().nullable(),
	companyId: z.string().optional().nullable(),
	interactionId: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const filters = {
			contactId: req.query.contactId as string | undefined,
			companyId: req.query.companyId as string | undefined,
			interactionId: req.query.interactionId as string | undefined,
			query: req.query.query as string | undefined,
		};

		const notes = await getAllNotes(userId, pagination, filters);
		res.json(notes);
	} catch (error) {
		logger.error("Failed to fetch notes", error);
		res.status(500).json({ error: "Failed to fetch notes" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const note = await getNote(userId, req.params.id);

		if (!note) {
			return res.status(404).json({ error: "Note not found" });
		}

		res.json(note);
	} catch (error) {
		logger.error("Failed to fetch note", error);
		res.status(500).json({ error: "Failed to fetch note" });
	}
});

router.post("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = createNoteSchema.parse(req.body);
		const note = await createNote(userId, data);

		logger.info(`Created note: ${note.id}`);
		res.status(201).json(note);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to create note", error);
		res.status(500).json({ error: "Failed to create note" });
	}
});

router.put("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = updateNoteSchema.parse(req.body);
		const note = await updateNote(userId, req.params.id, data);

		if (!note) {
			return res.status(404).json({ error: "Note not found" });
		}

		logger.info(`Updated note: ${note.id}`);
		res.json(note);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to update note", error);
		res.status(500).json({ error: "Failed to update note" });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const note = await deleteNote(userId, req.params.id);

		if (!note) {
			return res.status(404).json({ error: "Note not found" });
		}

		logger.info(`Deleted note: ${note.id}`);
		res.status(204).send();
	} catch (error) {
		logger.error("Failed to delete note", error);
		res.status(500).json({ error: "Failed to delete note" });
	}
});

router.get("/contact/:contactId", async (req, res) => {
	try {
		const userId = getUserId(req);
		const contactId = req.params.contactId;
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const notes = await getNotesByContact(userId, contactId, pagination);
		res.json(notes);
	} catch (error) {
		logger.error("Failed to fetch notes", error);
		res.status(500).json({ error: "Failed to fetch notes" });
	}
});

router.get("/company/:companyId", async (req, res) => {
	try {
		const userId = getUserId(req);
		const companyId = req.params.companyId;
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const notes = await getNotesByCompany(userId, companyId, pagination);
		res.json(notes);
	} catch (error) {
		logger.error("Failed to fetch notes", error);
		res.status(500).json({ error: "Failed to fetch notes" });
	}
});

router.get("/interaction/:interactionId", async (req, res) => {
	try {
		const userId = getUserId(req);
		const interactionId = req.params.interactionId;
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const notes = await getNotesByInteraction(
			userId,
			interactionId,
			pagination
		);
		res.json(notes);
	} catch (error) {
		logger.error("Failed to fetch notes", error);
		res.status(500).json({ error: "Failed to fetch notes" });
	}
});

export default router;
