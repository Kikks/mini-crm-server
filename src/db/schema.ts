import {
	pgTable,
	text,
	timestamp,
	boolean,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Helper functions
 */
const id = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => nanoid());
const createdAt = () =>
	timestamp("created_at", { mode: "date" }).$defaultFn(() => new Date());
const updatedAt = () =>
	timestamp("updated_at", { mode: "date" }).$defaultFn(() => new Date());

/**
 * Users table - synced with Clerk
 */
export const users = pgTable(
	"users",
	{
		id: text("id").primaryKey(), // Clerk user ID
		email: text("email").notNull(),
		firstName: text("first_name"),
		lastName: text("last_name"),
		imageUrl: text("image_url"),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => ({
		emailIdx: index("users_email_idx").on(table.email),
	})
);

/**
 * Core Entities
 */
export const companies = pgTable(
	"companies",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		name: text("name").notNull(),
		website: text("website"),
		industry: text("industry"),
		address: text("address"),
		description: text("description"),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => ({
		userIdIdx: index("companies_user_id_idx").on(table.userId),
	})
);

export const contacts = pgTable(
	"contacts",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		firstName: text("first_name").notNull(),
		lastName: text("last_name"),
		email: text("email"),
		phone: text("phone"),
		jobTitle: text("job_title"),
		companyId: text("company_id").references(() => companies.id, {
			onDelete: "set null",
		}),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => ({
		userIdIdx: index("contacts_user_id_idx").on(table.userId),
	})
);

export const interactions = pgTable(
	"interactions",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		contactId: text("contact_id")
			.references(() => contacts.id, { onDelete: "cascade" })
			.notNull(),
		type: text("type", {
			enum: ["call", "email", "meeting", "other"],
		}).notNull(),
		summary: text("summary"),
		outcome: text("outcome"),
		sentiment: text("sentiment", { enum: ["positive", "neutral", "negative"] }),
		occurredAt: timestamp("occurred_at", { mode: "date" }).notNull(),
		createdAt: createdAt(),
	},
	(table) => ({
		userIdIdx: index("interactions_user_id_idx").on(table.userId),
	})
);

export const notes = pgTable(
	"notes",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		content: text("content").notNull(),
		contactId: text("contact_id").references(() => contacts.id, {
			onDelete: "cascade",
		}),
		companyId: text("company_id").references(() => companies.id, {
			onDelete: "cascade",
		}),
		interactionId: text("interaction_id").references(() => interactions.id, {
			onDelete: "cascade",
		}),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => ({
		userIdIdx: index("notes_user_id_idx").on(table.userId),
	})
);

export const notifications = pgTable(
	"notifications",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		contactId: text("contact_id").references(() => contacts.id, {
			onDelete: "cascade",
		}),
		interactionId: text("interaction_id").references(() => interactions.id, {
			onDelete: "set null",
		}),
		type: text("type", {
			enum: [
				"follow_up_email",
				"follow_up_call",
				"follow_up_meeting",
				"general",
			],
		}).notNull(),
		title: text("title").notNull(),
		description: text("description"),
		dueDate: timestamp("due_date"),
		isCompleted: boolean("is_completed").default(false),
		completedAt: timestamp("completed_at"),
		createdAt: createdAt(),
	},
	(table) => ({
		userIdIdx: index("notifications_user_id_idx").on(table.userId),
	})
);

export const threads = pgTable(
	"threads",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		name: text("name").notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => ({
		userIdIdx: index("threads_user_id_idx").on(table.userId),
	})
);

export const messages = pgTable("messages", {
	id: id(),
	threadId: text("thread_id")
		.references(() => threads.id, { onDelete: "cascade" })
		.notNull(),
	role: text("role", { enum: ["user", "assistant", "tool"] }).notNull(),
	content: text("content"),
	toolCalls: jsonb("tool_calls"),
	toolResults: jsonb("tool_results"),
	createdAt: createdAt(),
});

export const embeddings = pgTable(
	"embeddings",
	{
		id: id(),
		userId: text("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		entityType: text("entity_type", {
			enum: ["contact", "company", "interaction", "note"],
		}).notNull(),
		entityId: text("entity_id").notNull(),
		sourceText: text("source_text").notNull(),
		vector: jsonb("vector").$type<number[]>().notNull(),
		createdAt: createdAt(),
	},
	(table) => ({
		userIdIdx: index("embeddings_user_id_idx").on(table.userId),
	})
);

/**
 * Relations
 */
export const usersRelations = relations(users, ({ many }) => ({
	companies: many(companies),
	contacts: many(contacts),
	interactions: many(interactions),
	notes: many(notes),
	notifications: many(notifications),
	threads: many(threads),
	embeddings: many(embeddings),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
	user: one(users, {
		fields: [companies.userId],
		references: [users.id],
	}),
	contacts: many(contacts),
	notes: many(notes),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
	user: one(users, {
		fields: [contacts.userId],
		references: [users.id],
	}),
	company: one(companies, {
		fields: [contacts.companyId],
		references: [companies.id],
	}),
	interactions: many(interactions),
	notes: many(notes),
	notifications: many(notifications),
}));

export const interactionsRelations = relations(
	interactions,
	({ one, many }) => ({
		user: one(users, {
			fields: [interactions.userId],
			references: [users.id],
		}),
		contact: one(contacts, {
			fields: [interactions.contactId],
			references: [contacts.id],
		}),
		notes: many(notes),
		notifications: many(notifications),
	})
);

export const notesRelations = relations(notes, ({ one }) => ({
	user: one(users, {
		fields: [notes.userId],
		references: [users.id],
	}),
	contact: one(contacts, {
		fields: [notes.contactId],
		references: [contacts.id],
	}),
	company: one(companies, {
		fields: [notes.companyId],
		references: [companies.id],
	}),
	interaction: one(interactions, {
		fields: [notes.interactionId],
		references: [interactions.id],
	}),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id],
	}),
	contact: one(contacts, {
		fields: [notifications.contactId],
		references: [contacts.id],
	}),
	interaction: one(interactions, {
		fields: [notifications.interactionId],
		references: [interactions.id],
	}),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
	user: one(users, {
		fields: [threads.userId],
		references: [users.id],
	}),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	thread: one(threads, {
		fields: [messages.threadId],
		references: [threads.id],
	}),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
	user: one(users, {
		fields: [embeddings.userId],
		references: [users.id],
	}),
}));
