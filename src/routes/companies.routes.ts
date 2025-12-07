import { Router } from "express";
import { z } from "zod";
import { getUserId } from "../lib/auth.lib";
import {
	createCompany,
	getCompany,
	getAllCompanies,
	updateCompany,
	deleteCompany,
	CompanySortBy,
	SortOrder,
} from "../lib/companies.lib";
import { logger } from "../utils/logger";
import { parsePaginationParams } from "../utils/pagination";

const router = Router();

const createCompanySchema = z.object({
	name: z.string().min(1, "Name is required"),
	website: z.string().url().optional().nullable(),
	industry: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
});

const updateCompanySchema = z.object({
	name: z.string().min(1).optional(),
	website: z.string().url().optional().nullable(),
	industry: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const pagination = parsePaginationParams(
			req.query as Record<string, string | undefined>
		);

		const sortBy = req.query.sortBy as CompanySortBy | undefined;
		const sortOrder = req.query.sortOrder as SortOrder | undefined;

		const sortParams =
			sortBy && ["name", "createdAt"].includes(sortBy)
				? { sortBy, sortOrder: sortOrder || "asc" }
				: undefined;

		const query = req.query.query as string | undefined;

		const companies = await getAllCompanies(
			userId,
			pagination,
			sortParams,
			query
		);
		res.json(companies);
	} catch (error) {
		logger.error("Failed to fetch companies", error);
		res.status(500).json({ error: "Failed to fetch companies" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const company = await getCompany(userId, req.params.id);

		if (!company) {
			return res.status(404).json({ error: "Company not found" });
		}

		res.json(company);
	} catch (error) {
		logger.error("Failed to fetch company", error);
		res.status(500).json({ error: "Failed to fetch company" });
	}
});

router.post("/", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = createCompanySchema.parse(req.body);
		const company = await createCompany(userId, data);

		logger.info(`Created company: ${company.name}`);
		res.status(201).json(company);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to create company", error);
		res.status(500).json({ error: "Failed to create company" });
	}
});

router.put("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const data = updateCompanySchema.parse(req.body);
		const company = await updateCompany(userId, req.params.id, data);

		if (!company) {
			return res.status(404).json({ error: "Company not found" });
		}

		logger.info(`Updated company: ${company.name}`);
		res.json(company);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: error.errors });
		}
		logger.error("Failed to update company", error);
		res.status(500).json({ error: "Failed to update company" });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const userId = getUserId(req);
		const company = await deleteCompany(userId, req.params.id);

		if (!company) {
			return res.status(404).json({ error: "Company not found" });
		}

		logger.info(`Deleted company: ${company.name}`);
		res.status(204).send();
	} catch (error) {
		logger.error("Failed to delete company", error);
		res.status(500).json({ error: "Failed to delete company" });
	}
});

export default router;
