import { db } from "../db";
import { companies, contacts } from "../db/schema";
import { eq, and, desc, asc, count, or, ilike } from "drizzle-orm";
import {
	PaginationParams,
	PaginatedResponse,
	createPaginatedResponse,
} from "../utils/pagination";

export type CompanySortBy = "name" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface CompanySortParams {
	sortBy?: CompanySortBy;
	sortOrder?: SortOrder;
}

export interface CreateCompanyData {
	name: string;
	website?: string | null;
	industry?: string | null;
	address?: string | null;
	description?: string | null;
}

export interface UpdateCompanyData {
	name?: string;
	website?: string | null;
	industry?: string | null;
	address?: string | null;
	description?: string | null;
}

export async function createCompany(userId: string, data: CreateCompanyData) {
	const [company] = await db
		.insert(companies)
		.values({
			userId,
			name: data.name,
			website: data.website ?? null,
			industry: data.industry ?? null,
			address: data.address ?? null,
			description: data.description ?? null,
		})
		.returning();

	return company;
}

export async function getCompany(userId: string, companyId: string) {
	return db.query.companies.findFirst({
		where: and(eq(companies.id, companyId), eq(companies.userId, userId)),
		with: {
			contacts: true,
			notes: true,
		},
	});
}

export async function getAllCompanies(
	userId: string,
	pagination: PaginationParams,
	sortParams?: CompanySortParams,
	query?: string
): Promise<
	PaginatedResponse<
		typeof companies.$inferSelect & {
			contacts: (typeof contacts.$inferSelect)[];
		}
	>
> {
	const conditions = [eq(companies.userId, userId)];

	if (query && query.trim()) {
		const searchPattern = `%${query.trim()}%`;
		conditions.push(
			or(
				ilike(companies.name, searchPattern),
				ilike(companies.industry, searchPattern),
				ilike(companies.description, searchPattern),
				ilike(companies.website, searchPattern)
			)!
		);
	}

	const [totalResult] = await db
		.select({ count: count() })
		.from(companies)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const sortOrder = sortParams?.sortOrder === "desc" ? desc : asc;

	let orderBy;
	if (sortParams?.sortBy === "name") {
		orderBy = sortOrder(companies.name);
	} else if (sortParams?.sortBy === "createdAt") {
		orderBy = sortOrder(companies.createdAt);
	} else {
		orderBy = desc(companies.updatedAt);
	}

	const results = await db.query.companies.findMany({
		where: and(...conditions),
		orderBy,
		with: {
			contacts: true,
		},
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

export async function updateCompany(
	userId: string,
	companyId: string,
	data: UpdateCompanyData
) {
	const [updated] = await db
		.update(companies)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
		.returning();

	return updated;
}

export async function deleteCompany(userId: string, companyId: string) {
	const [deleted] = await db
		.delete(companies)
		.where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
		.returning();

	return deleted;
}
