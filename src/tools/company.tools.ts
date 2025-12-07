import { z } from "zod";
import { tool } from "ai";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { companies } from "../db/schema";
import {
	companyIdSchema,
	createCompanySchema,
	updateCompanySchema,
} from "./schemas";

export function getCompanyTools(userId: string): Record<string, any> {
	const listCompanies = tool({
		description: "List all companies",
		inputSchema: z.object({}),
		execute: async () => {
			const results = await db.query.companies.findMany({
				where: eq(companies.userId, userId),
				orderBy: desc(companies.updatedAt),
				with: { contacts: true },
			});

			return { companies: results };
		},
	});

	const createCompany = tool({
		description: "Create a new company. Search first to avoid duplicates.",
		inputSchema: createCompanySchema,
		execute: async ({ name, website, industry, address, description }) => {
			const [company] = await db
				.insert(companies)
				.values({ name, website, industry, address, description, userId })
				.returning();

			return { success: true, company };
		},
	});

	const updateCompany = tool({
		description: "Update an existing company's information",
		inputSchema: updateCompanySchema,
		execute: async ({ companyId, updates }) => {
			const [company] = await db
				.update(companies)
				.set({ ...updates, updatedAt: new Date() })
				.where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
				.returning();

			if (!company) {
				return { success: false, error: "Company not found" };
			}

			return { success: true, company };
		},
	});

	const getCompanyDetails = tool({
		description: "Get full details about a company including all contacts",
		inputSchema: companyIdSchema,
		execute: async ({ companyId }) => {
			const company = await db.query.companies.findFirst({
				where: and(eq(companies.id, companyId), eq(companies.userId, userId)),
				with: {
					contacts: true,
					notes: { orderBy: (n, { desc }) => [desc(n.createdAt)], limit: 10 },
				},
			});

			if (!company) {
				return { success: false, error: "Company not found" };
			}

			return { success: true, company };
		},
	});

	const deleteCompany = tool({
		description:
			"Request to delete a company. Returns company details for user confirmation. Call confirmDeleteCompany after user confirms.",
		inputSchema: companyIdSchema,
		execute: async ({ companyId }) => {
			const company = await db.query.companies.findFirst({
				where: and(eq(companies.id, companyId), eq(companies.userId, userId)),
				with: { contacts: true },
			});

			if (!company) {
				return { success: false, error: "Company not found" };
			}

			return {
				success: true,
				requiresConfirmation: true,
				message: `Are you sure you want to delete ${company.name}? This company has ${company.contacts.length} contact(s). The contacts will remain but will no longer be associated with this company.`,
				company,
			};
		},
	});

	const confirmDeleteCompany = tool({
		description:
			"Execute company deletion after user has confirmed. Only call this after deleteCompany and user confirmation.",
		inputSchema: companyIdSchema,
		execute: async ({ companyId }) => {
			const [deleted] = await db
				.delete(companies)
				.where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
				.returning();

			if (!deleted) {
				return { success: false, error: "Company not found" };
			}

			return { success: true, message: `Deleted ${deleted.name}` };
		},
	});

	return {
		listCompanies,
		createCompany,
		updateCompany,
		getCompanyDetails,
		deleteCompany,
		confirmDeleteCompany,
	};
}
