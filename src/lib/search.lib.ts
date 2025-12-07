import Fuse from "fuse.js";
import { db } from "../db";
import { contacts, companies, embeddings } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

interface SearchableContact {
	id: string;
	firstName: string;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	companyName: string | null;
	jobTitle: string | null;
}

/**
 * FUZZY SEARCH
 */

export async function fuzzySearchContacts(
	userId: string,
	query: string,
	threshold = 0.4
): Promise<SearchableContact[]> {
	// Get all contacts for this user with company names
	const allContacts = await db
		.select({
			id: contacts.id,
			firstName: contacts.firstName,
			lastName: contacts.lastName,
			email: contacts.email,
			phone: contacts.phone,
			jobTitle: contacts.jobTitle,
			companyName: companies.name,
		})
		.from(contacts)
		.leftJoin(companies, eq(contacts.companyId, companies.id))
		.where(eq(contacts.userId, userId));

	const fuse = new Fuse(allContacts, {
		keys: [
			{ name: "firstName", weight: 2 },
			{ name: "lastName", weight: 2 },
			{ name: "email", weight: 1.5 },
			{ name: "companyName", weight: 1 },
			{ name: "jobTitle", weight: 0.5 },
		],
		threshold,
		includeScore: true,
	});

	return fuse.search(query).map((result) => result.item);
}

export async function fuzzySearchCompanies(
	userId: string,
	query: string,
	threshold = 0.4
) {
	const allCompanies = await db
		.select()
		.from(companies)
		.where(eq(companies.userId, userId));

	const fuse = new Fuse(allCompanies, {
		keys: ["name", "industry", "description"],
		threshold,
		includeScore: true,
	});

	return fuse.search(query).map((result) => result.item);
}

/**
 * SEMANTIC SEARCH
 */

export async function generateEmbedding(text: string): Promise<number[]> {
	const { embedding } = await embed({
		model: openai.embedding("text-embedding-3-small"),
		value: text,
	});

	return embedding;
}

export async function indexEntity(
	userId: string,
	entityType: "contact" | "company" | "interaction" | "note",
	entityId: string,
	text: string
) {
	const vector = await generateEmbedding(text);

	// Upsert: delete existing then insert (scoped by user)
	await db
		.delete(embeddings)
		.where(
			sql`${embeddings.userId} = ${userId} AND ${embeddings.entityType} = ${entityType} AND ${embeddings.entityId} = ${entityId}`
		);

	await db.insert(embeddings).values({
		userId,
		entityType,
		entityId,
		sourceText: text,
		vector,
		createdAt: new Date(),
	});
}

export async function indexContact(userId: string, contactId: string) {
	const contact = await db.query.contacts.findFirst({
		where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
		with: {
			company: true,
			notes: true,
		},
	});

	if (!contact) return;

	const textParts = [
		contact.firstName,
		contact.lastName,
		contact.email,
		contact.jobTitle,
		contact.company?.name,
		...contact.notes.map((n) => n.content),
	].filter(Boolean);

	await indexEntity(userId, "contact", contactId, textParts.join(" "));
}

export async function semanticSearch(
	userId: string,
	query: string,
	entityTypes?: ("contact" | "company" | "interaction" | "note")[],
	limit = 10
): Promise<
	Array<{
		entityType: string;
		entityId: string;
		score: number;
		sourceText: string;
	}>
> {
	const queryVector = await generateEmbedding(query);

	// Only fetch embeddings for this user
	let userEmbeddings = await db
		.select()
		.from(embeddings)
		.where(eq(embeddings.userId, userId));

	if (entityTypes && entityTypes.length > 0) {
		userEmbeddings = userEmbeddings.filter((e) =>
			entityTypes.includes(e.entityType)
		);
	}

	// Calculate cosine similarity
	const scored = userEmbeddings.map((emb) => ({
		...emb,
		score: cosineSimilarity(queryVector, emb.vector),
	}));

	// Sort by score descending and take top results
	return scored
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ entityType, entityId, score, sourceText }) => ({
			entityType,
			entityId,
			score,
			sourceText,
		}));
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * HYBRID SEARCH
 */

export async function hybridContactSearch(userId: string, query: string) {
	// Run both searches in parallel (scoped to user)
	const [fuzzyResults, semanticResults] = await Promise.all([
		fuzzySearchContacts(userId, query),
		semanticSearch(userId, query, ["contact"]),
	]);

	// Merge results, prioritizing contacts that appear in both
	const semanticContactIds = new Set(semanticResults.map((r) => r.entityId));
	const fuzzyContactIds = new Set(fuzzyResults.map((r) => r.id));

	// Contacts in both get boosted to the top
	const inBoth = fuzzyResults.filter((c) => semanticContactIds.has(c.id));
	const fuzzyOnly = fuzzyResults.filter((c) => !semanticContactIds.has(c.id));
	const semanticOnly = semanticResults.filter(
		(r) => !fuzzyContactIds.has(r.entityId)
	);

	// For semantic-only results, we need to fetch the full contact (scoped to user)
	const semanticOnlyContacts = await Promise.all(
		semanticOnly.slice(0, 5).map(async (r) => {
			const contact = await db.query.contacts.findFirst({
				where: and(eq(contacts.id, r.entityId), eq(contacts.userId, userId)),
				with: { company: true },
			});
			return contact;
		})
	);

	return {
		bestMatches: inBoth,
		fuzzyMatches: fuzzyOnly.slice(0, 5),
		semanticMatches: semanticOnlyContacts.filter(Boolean),
	};
}
