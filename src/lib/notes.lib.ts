import { db } from "../db";
import { notes, contacts, companies, interactions } from "../db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
	PaginationParams,
	PaginatedResponse,
	createPaginatedResponse,
} from "../utils/pagination";

export interface CreateNoteData {
	content: string;
	contactId?: string | null;
	companyId?: string | null;
	interactionId?: string | null;
}

export interface UpdateNoteData {
	content?: string;
	contactId?: string | null;
	companyId?: string | null;
	interactionId?: string | null;
}

export interface NoteFilters {
	contactId?: string;
	companyId?: string;
	interactionId?: string;
	query?: string;
}

export async function createNote(userId: string, data: CreateNoteData) {
	const [note] = await db
		.insert(notes)
		.values({
			userId,
			content: data.content,
			contactId: data.contactId ?? null,
			companyId: data.companyId ?? null,
			interactionId: data.interactionId ?? null,
		})
		.returning();

	return note;
}

export async function getNote(userId: string, noteId: string) {
	return db.query.notes.findFirst({
		where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
		with: {
			contact: true,
			company: true,
			interaction: true,
		},
	});
}

export async function getAllNotes(
	userId: string,
	pagination: PaginationParams,
	filters?: NoteFilters
): Promise<
	PaginatedResponse<
		typeof notes.$inferSelect & {
			contact: typeof contacts.$inferSelect | null;
			company: typeof companies.$inferSelect | null;
			interaction: typeof interactions.$inferSelect | null;
		}
	>
> {
	if (filters?.query && filters.query.trim()) {
		const searchQuery = filters.query.trim();
		// Convert search query to tsquery format (escape special chars and join with &)
		// Use plainto_tsquery for better user-friendly search (handles phrases, typos better)
		const tsQuery = searchQuery
			.split(/\s+/)
			.map((term) => term.replace(/[^\w]/g, ""))
			.filter((term) => term.length > 0)
			.join(" & ");

		if (!tsQuery) {
			return getAllNotes(userId, pagination, { ...filters, query: undefined });
		}

		const whereConditions = [eq(notes.userId, userId)];

		if (filters.contactId) {
			whereConditions.push(eq(notes.contactId, filters.contactId));
		}
		if (filters.companyId) {
			whereConditions.push(eq(notes.companyId, filters.companyId));
		}
		if (filters.interactionId) {
			whereConditions.push(eq(notes.interactionId, filters.interactionId));
		}

		whereConditions.push(
			sql`content_tsvector @@ plainto_tsquery('english', ${searchQuery})`
		);

		const [totalResult] = await db
			.select({ count: count() })
			.from(notes)
			.where(and(...whereConditions));
		const total = totalResult?.count || 0;

		const results = await db
			.select({
				note: notes,
				contact: contacts,
				company: companies,
				interaction: interactions,
			})
			.from(notes)
			.leftJoin(contacts, eq(notes.contactId, contacts.id))
			.leftJoin(companies, eq(notes.companyId, companies.id))
			.leftJoin(interactions, eq(notes.interactionId, interactions.id))
			.where(and(...whereConditions))
			.orderBy(
				sql`ts_rank(content_tsvector, plainto_tsquery('english', ${searchQuery})) DESC, ${notes.createdAt} DESC`
			)
			.limit(pagination.limit)
			.offset(pagination.offset);

		const data = results.map((row) => ({
			...row.note,
			contact: row.contact || null,
			company: row.company || null,
			interaction: row.interaction || null,
		}));

		return createPaginatedResponse(
			data,
			total,
			pagination.offset,
			pagination.limit
		);
	}

	const conditions = [eq(notes.userId, userId)];

	if (filters?.contactId) {
		conditions.push(eq(notes.contactId, filters.contactId));
	}
	if (filters?.companyId) {
		conditions.push(eq(notes.companyId, filters.companyId));
	}
	if (filters?.interactionId) {
		conditions.push(eq(notes.interactionId, filters.interactionId));
	}

	const [totalResult] = await db
		.select({ count: count() })
		.from(notes)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notes.findMany({
		where: and(...conditions),
		orderBy: desc(notes.createdAt),
		with: {
			contact: true,
			company: true,
			interaction: true,
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

export async function getNotesByContact(
	userId: string,
	contactId: string,
	pagination: PaginationParams
): Promise<PaginatedResponse<typeof notes.$inferSelect>> {
	const conditions = [eq(notes.userId, userId), eq(notes.contactId, contactId)];

	const [totalResult] = await db
		.select({ count: count() })
		.from(notes)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notes.findMany({
		where: and(...conditions),
		orderBy: desc(notes.createdAt),
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

export async function getNotesByCompany(
	userId: string,
	companyId: string,
	pagination: PaginationParams
): Promise<PaginatedResponse<typeof notes.$inferSelect>> {
	const conditions = [eq(notes.userId, userId), eq(notes.companyId, companyId)];

	const [totalResult] = await db
		.select({ count: count() })
		.from(notes)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notes.findMany({
		where: and(...conditions),
		orderBy: desc(notes.createdAt),
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

export async function getNotesByInteraction(
	userId: string,
	interactionId: string,
	pagination: PaginationParams
): Promise<PaginatedResponse<typeof notes.$inferSelect>> {
	const conditions = [
		eq(notes.userId, userId),
		eq(notes.interactionId, interactionId),
	];

	const [totalResult] = await db
		.select({ count: count() })
		.from(notes)
		.where(and(...conditions));
	const total = totalResult?.count || 0;

	const results = await db.query.notes.findMany({
		where: and(...conditions),
		orderBy: desc(notes.createdAt),
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

export async function updateNote(
	userId: string,
	noteId: string,
	data: UpdateNoteData
) {
	const [updated] = await db
		.update(notes)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.returning();

	return updated;
}

export async function deleteNote(userId: string, noteId: string) {
	const [deleted] = await db
		.delete(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.returning();

	return deleted;
}
