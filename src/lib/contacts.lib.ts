import { db } from "../db";
import { companies, contacts, interactions } from "../db/schema";
import { eq, and, desc, asc, count, sql, or, ilike } from "drizzle-orm";
import {
	PaginationParams,
	PaginatedResponse,
	createPaginatedResponse,
} from "../utils/pagination";

export type ContactSortBy = "name" | "createdAt" | "lastInteractionAt";
export type SortOrder = "asc" | "desc";

export interface ContactSortParams {
	sortBy?: ContactSortBy;
	sortOrder?: SortOrder;
}

export interface CreateContactData {
	firstName: string;
	lastName?: string | null;
	email?: string | null;
	phone?: string | null;
	jobTitle?: string | null;
	companyId?: string | null;
}

export interface UpdateContactData {
	firstName?: string;
	lastName?: string | null;
	email?: string | null;
	phone?: string | null;
	jobTitle?: string | null;
	companyId?: string | null;
}

export async function createContact(userId: string, data: CreateContactData) {
	const [contact] = await db
		.insert(contacts)
		.values({
			userId,
			firstName: data.firstName,
			lastName: data.lastName ?? null,
			email: data.email ?? null,
			phone: data.phone ?? null,
			jobTitle: data.jobTitle ?? null,
			companyId: data.companyId ?? null,
		})
		.returning();

	return contact;
}

export async function getContact(userId: string, contactId: string) {
	return db.query.contacts.findFirst({
		where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
		with: {
			company: true,
			interactions: {
				orderBy: desc(contacts.createdAt),
				limit: 10,
			},
			notes: true,
			notifications: true,
		},
	});
}

export async function getAllContacts(
	userId: string,
	pagination: PaginationParams,
	companyId?: string,
	sortParams?: ContactSortParams,
	query?: string
): Promise<
	PaginatedResponse<
		typeof contacts.$inferSelect & {
			company: typeof companies.$inferSelect | null;
			lastInteractionAt: Date | null;
		}
	>
> {
	const conditions = [eq(contacts.userId, userId)];

	if (companyId) {
		conditions.push(eq(contacts.companyId, companyId));
	}

	if (query && query.trim()) {
		const searchPattern = `%${query.trim()}%`;
		conditions.push(
			or(
				ilike(contacts.firstName, searchPattern),
				ilike(contacts.lastName, searchPattern),
				ilike(contacts.email, searchPattern),
				ilike(contacts.phone, searchPattern),
				ilike(contacts.jobTitle, searchPattern)
			)!
		);
	}

	const [totalResult] = await db
		.select({ count: count() })
		.from(contacts)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const sortOrder = sortParams?.sortOrder === "desc" ? desc : asc;

	let orderBy;
	if (sortParams?.sortBy === "name") {
		orderBy = sortOrder(
			sql`${contacts.firstName} || ' ' || COALESCE(${contacts.lastName}, '')`
		);
	} else if (sortParams?.sortBy === "createdAt") {
		orderBy = sortOrder(contacts.createdAt);
	} else {
		orderBy = desc(contacts.updatedAt);
	}

	const contactsList = await db.query.contacts.findMany({
		where: and(...conditions),
		orderBy,
		with: {
			company: true,
			interactions: {
				orderBy: desc(interactions.occurredAt),
				limit: 1,
			},
		},
		limit: pagination.limit,
		offset: pagination.offset,
	});

	const data = contactsList.map((contact) => ({
		...contact,
		lastInteractionAt: contact.interactions?.[0]?.occurredAt ?? null,
		interactions: undefined,
	}));

	if (sortParams?.sortBy === "lastInteractionAt") {
		const sortOrder = sortParams.sortOrder === "desc" ? -1 : 1;
		data.sort((a, b) => {
			const dateA = a.lastInteractionAt?.getTime() || 0;
			const dateB = b.lastInteractionAt?.getTime() || 0;
			return (dateA - dateB) * sortOrder;
		});
	}

	return createPaginatedResponse(
		data,
		total,
		pagination.offset,
		pagination.limit
	);
}

export async function getContactsByCompany(
	userId: string,
	companyId: string,
	pagination: PaginationParams,
	sortParams?: ContactSortParams
): Promise<
	PaginatedResponse<
		typeof contacts.$inferSelect & {
			company: typeof companies.$inferSelect | null;
			lastInteractionAt: Date | null;
		}
	>
> {
	const conditions = [
		eq(contacts.userId, userId),
		eq(contacts.companyId, companyId),
	];

	const [totalResult] = await db
		.select({ count: count() })
		.from(contacts)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const sortOrder = sortParams?.sortOrder === "desc" ? desc : asc;

	let orderBy;
	if (sortParams?.sortBy === "name") {
		orderBy = sortOrder(
			sql`${contacts.firstName} || ' ' || COALESCE(${contacts.lastName}, '')`
		);
	} else if (sortParams?.sortBy === "createdAt") {
		orderBy = sortOrder(contacts.createdAt);
	} else {
		orderBy = desc(contacts.updatedAt);
	}

	const contactsList = await db.query.contacts.findMany({
		where: and(...conditions),
		orderBy,
		with: {
			company: true,
			interactions: {
				orderBy: desc(interactions.occurredAt),
				limit: 1,
			},
		},
		limit: pagination.limit,
		offset: pagination.offset,
	});

	const data = contactsList.map((contact) => ({
		...contact,
		lastInteractionAt: contact.interactions?.[0]?.occurredAt ?? null,
		interactions: undefined,
	}));

	if (sortParams?.sortBy === "lastInteractionAt") {
		const sortOrder = sortParams.sortOrder === "desc" ? -1 : 1;
		data.sort((a, b) => {
			const dateA = a.lastInteractionAt?.getTime() || 0;
			const dateB = b.lastInteractionAt?.getTime() || 0;
			return (dateA - dateB) * sortOrder;
		});
	}

	return createPaginatedResponse(
		data,
		total,
		pagination.offset,
		pagination.limit
	);
}

export async function updateContact(
	userId: string,
	contactId: string,
	data: UpdateContactData
) {
	const [updated] = await db
		.update(contacts)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
		.returning();

	return updated;
}

export async function deleteContact(userId: string, contactId: string) {
	const [deleted] = await db
		.delete(contacts)
		.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
		.returning();

	return deleted;
}
