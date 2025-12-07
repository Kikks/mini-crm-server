import { Router } from "express";
import { z } from "zod";
import { getUserId } from "../lib/auth.lib";
import {
	createContact,
	getContact,
	getAllContacts,
	updateContact,
	deleteContact,
	ContactSortBy,
	SortOrder,
} from "../lib/contacts.lib";
import { logger } from "../utils/logger";
import { parsePaginationParams } from "../utils/pagination";

const router = Router();

const createContactSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	jobTitle: z.string().optional().nullable(),
	companyId: z.string().optional().nullable(),
});

const updateContactSchema = z.object({
	firstName: z.string().min(1).optional(),
	lastName: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	jobTitle: z.string().optional().nullable(),
	companyId: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);
		const companyId = req.query.companyId as string | undefined;

		const sortBy = req.query.sortBy as ContactSortBy | undefined;
		const sortOrder = req.query.sortOrder as SortOrder | undefined;

		const sortParams =
			sortBy && ["name", "createdAt", "lastInteractionAt"].includes(sortBy)
				? { sortBy, sortOrder: sortOrder || "asc" }
				: undefined;

		const query = req.query.query as string | undefined;

		const contacts = await getAllContacts(
			userId,
			pagination,
			companyId,
			sortParams,
			query
		);
		res.json(contacts);
	} catch (error) {
		logger.error("Failed to fetch contacts", error);
		res.status(500).json({ error: "Failed to fetch contacts" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const contact = await getContact(userId, req.params.id);

		if (!contact) {
			return res.status(404).json({ error: "Contact not found" });
		}

		res.json(contact);
	} catch (error) {
		logger.error("Failed to fetch contact", error);
		res.status(500).json({ error: "Failed to fetch contact" });
	}
});

router.post("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = createContactSchema.parse(req.body);
		const contact = await createContact(userId, data);

		logger.info(
			`Created contact: ${contact.firstName} ${contact.lastName || ""}`
		);
		res.status(201).json(contact);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to create contact", error);
		res.status(500).json({ error: "Failed to create contact" });
	}
});

router.put("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = updateContactSchema.parse(req.body);
		const contact = await updateContact(userId, req.params.id, data);

		if (!contact) {
			return res.status(404).json({ error: "Contact not found" });
		}

		logger.info(
			`Updated contact: ${contact.firstName} ${contact.lastName || ""}`
		);
		res.json(contact);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to update contact", error);
		res.status(500).json({ error: "Failed to update contact" });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const contact = await deleteContact(userId, req.params.id);

		if (!contact) {
			return res.status(404).json({ error: "Contact not found" });
		}

		logger.info(
			`Deleted contact: ${contact.firstName} ${contact.lastName || ""}`
		);
		res.status(204).send();
	} catch (error) {
		logger.error("Failed to delete contact", error);
		res.status(500).json({ error: "Failed to delete contact" });
	}
});

export default router;
