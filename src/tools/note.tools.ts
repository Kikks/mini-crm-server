import { tool } from "ai";
import { db } from "../db";
import { notes } from "../db/schema";
import { addNoteSchema } from "./schemas";

export function getNoteTools(userId: string): Record<string, any> {
	const addNote = tool({
		description: "Add a note to a contact, company, or interaction",
		inputSchema: addNoteSchema,
		execute: async ({ content, contactId, companyId, interactionId }) => {
			const [note] = await db
				.insert(notes)
				.values({ content, contactId, companyId, interactionId, userId })
				.returning();

			return { success: true, note };
		},
	});

	return {
		addNote,
	};
}
