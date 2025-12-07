import { z } from "zod";

export const searchSchema = z.object({
	query: z.string().describe("Natural language search query"),
});

export const listContactsSchema = z.object({
	companyId: z.string().optional().describe("Filter by company ID"),
});

export const createContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	jobTitle: z.string().optional(),
	companyId: z.string().optional(),
	companyName: z
		.string()
		.optional()
		.describe("If provided and companyId is not, creates new company"),
});

export const updateContactSchema = z.object({
	contactId: z.string(),
	updates: z.object({
		firstName: z.string().optional(),
		lastName: z.string().optional(),
		email: z.string().optional(),
		phone: z.string().optional(),
		jobTitle: z.string().optional(),
		companyId: z.string().optional(),
	}),
});

export const contactIdSchema = z.object({ contactId: z.string() });

export const companyIdSchema = z.object({ companyId: z.string() });

export const createCompanySchema = z.object({
	name: z.string(),
	website: z.string().optional(),
	industry: z.string().optional(),
	address: z.string().optional(),
	description: z.string().optional(),
});

export const updateCompanySchema = z.object({
	companyId: z.string(),
	updates: z.object({
		name: z.string().optional(),
		website: z.string().optional(),
		industry: z.string().optional(),
		address: z.string().optional(),
		description: z.string().optional(),
	}),
});

export const addInteractionSchema = z.object({
	contactId: z.string(),
	type: z.enum(["call", "email", "meeting", "other"]),
	summary: z.string().optional(),
	outcome: z.string().optional(),
	sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
	occurredAt: z
		.string()
		.optional()
		.describe('When it happened, e.g. "yesterday", "last Tuesday"'),
});

export const updateInteractionSchema = z.object({
	interactionId: z.string(),
	updates: z.object({
		type: z.enum(["call", "email", "meeting", "other"]).optional(),
		summary: z.string().optional(),
		outcome: z.string().optional(),
		sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
		occurredAt: z.string().optional(),
	}),
});

export const getInteractionsSchema = z.object({
	contactId: z.string(),
	limit: z.number().optional().default(20),
});

export const addNoteSchema = z.object({
	content: z.string(),
	contactId: z.string().optional(),
	companyId: z.string().optional(),
	interactionId: z.string().optional(),
});

export const createNotificationSchema = z.object({
	title: z.string(),
	type: z.enum([
		"follow_up_email",
		"follow_up_call",
		"follow_up_meeting",
		"general",
	]),
	contactId: z.string().optional(),
	interactionId: z.string().optional(),
	description: z.string().optional(),
	dueDate: z
		.string()
		.optional()
		.describe('When to follow up, e.g. "tomorrow", "next week"'),
});

export const getNotificationsSchema = z.object({
	includeCompleted: z.boolean().optional(),
	contactId: z.string().optional(),
});

export const notificationIdSchema = z.object({ notificationId: z.string() });
