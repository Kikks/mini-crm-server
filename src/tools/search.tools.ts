import { tool } from "ai";
import { searchSchema } from "./schemas";
import { hybridContactSearch, fuzzySearchCompanies } from "../lib/search.lib";

export function getSearchTools(userId: string): Record<string, any> {
	const search = tool({
		description:
			"Search across contacts and companies using natural language. Use this before creating new records to avoid duplicates.",
		inputSchema: searchSchema,
		execute: async ({ query }) => {
			const results = await hybridContactSearch(userId, query);
			return results;
		},
	});

	const searchCompanies = tool({
		description: "Search for companies by name, industry, or description",
		inputSchema: searchSchema,
		execute: async ({ query }) => {
			const results = await fuzzySearchCompanies(userId, query);
			return { companies: results };
		},
	});

	return {
		search,
		searchCompanies,
	};
}
