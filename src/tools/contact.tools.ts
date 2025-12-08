import { tool } from "ai";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { contacts, companies, notifications } from "../db/schema";
import { indexContact } from "../lib/search.lib";
import {
	listContactsSchema,
	createContactSchema,
	updateContactSchema,
	contactIdSchema,
} from "./schemas";

export function getContactTools(userId: string): Record<string, any> {
	const listContacts = tool({
		description: "List all contacts, optionally filtered by company",
		inputSchema: listContactsSchema,
		execute: async ({ companyId }) => {
			const conditions = [eq(contacts.userId, userId)];
			if (companyId) {
				conditions.push(eq(contacts.companyId, companyId));
			}

			const results = await db.query.contacts.findMany({
				where: and(...conditions),
				orderBy: desc(contacts.updatedAt),
				with: { company: true },
			});

			return { contacts: results };
		},
	});

	const createContact = tool({
		description:
			"Create a new contact. ALWAYS search first to avoid duplicates.",
		inputSchema: createContactSchema,
		execute: async ({
			companyName,
			companyId,
			firstName,
			lastName,
			email,
			phone,
			jobTitle,
		}) => {
			let finalCompanyId = companyId;

			if (companyName && !companyId) {
				// First find the company by name
				const company = await db.query.companies.findFirst({
					where: and(
						eq(companies.name, companyName),
						eq(companies.userId, userId)
					),
				});

				if (company) {
					finalCompanyId = company.id;
				} else {
					// If no company found, create a new one
					const [company] = await db
						.insert(companies)
						.values({ userId, name: companyName })
						.returning();
					finalCompanyId = company.id;
				}
			}

			const [contact] = await db
				.insert(contacts)
				.values({
					firstName,
					lastName,
					email,
					phone,
					jobTitle,
					userId,
					companyId: finalCompanyId,
				})
				.returning();

			await indexContact(userId, contact.id);

			return { success: true, contact };
		},
	});

	const updateContact = tool({
		description: "Update an existing contact's information",
		inputSchema: updateContactSchema,
		execute: async ({ contactId, updates }) => {
			const [contact] = await db
				.update(contacts)
				.set({ ...updates, updatedAt: new Date() })
				.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
				.returning();

			if (!contact) {
				return { success: false, error: "Contact not found" };
			}

			await indexContact(userId, contact.id);

			return { success: true, contact };
		},
	});

	const getContactDetails = tool({
		description:
			"Get full details about a contact including interactions, notes, and pending notifications",
		inputSchema: contactIdSchema,
		execute: async ({ contactId }) => {
			const contact = await db.query.contacts.findFirst({
				where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
				with: {
					company: true,
					interactions: {
						orderBy: (i, { desc }) => [desc(i.occurredAt)],
						limit: 10,
					},
					notes: { orderBy: (n, { desc }) => [desc(n.createdAt)], limit: 10 },
					notifications: { where: eq(notifications.isCompleted, false) },
				},
			});

			if (!contact) {
				return { success: false, error: "Contact not found" };
			}

			return { success: true, contact };
		},
	});

	const deleteContact = tool({
		description:
			"Request to delete a contact. Returns contact details for user confirmation. Call confirmDeleteContact after user confirms.",
		inputSchema: contactIdSchema,
		execute: async ({ contactId }) => {
			const contact = await db.query.contacts.findFirst({
				where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
				with: { company: true },
			});

			if (!contact) {
				return { success: false, error: "Contact not found" };
			}

			return {
				success: true,
				requiresConfirmation: true,
				message: `Are you sure you want to delete ${contact.firstName} ${
					contact.lastName || ""
				}${
					contact.company ? ` from ${contact.company.name}` : ""
				}? This will also delete all associated interactions, notes, and notifications.`,
				contact,
			};
		},
	});

	const confirmDeleteContact = tool({
		description:
			"Execute contact deletion after user has confirmed. Only call this after deleteContact and user confirmation.",
		inputSchema: contactIdSchema,
		execute: async ({ contactId }) => {
			const [deleted] = await db
				.delete(contacts)
				.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
				.returning();

			if (!deleted) {
				return { success: false, error: "Contact not found" };
			}

			return {
				success: true,
				message: `Deleted ${deleted.firstName} ${deleted.lastName || ""}`,
			};
		},
	});

	return {
		listContacts,
		createContact,
		updateContact,
		getContactDetails,
		deleteContact,
		confirmDeleteContact,
	};
}
