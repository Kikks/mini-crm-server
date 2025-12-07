import { db } from "../db";
import {
	companies,
	contacts,
	interactions,
	notes,
	notifications,
} from "../db/schema";
import {
	eq,
	and,
	count,
	sql,
	gte,
	lte,
	lt,
	isNull,
	isNotNull,
} from "drizzle-orm";

export type TimeRange = "7d" | "30d" | "all";

interface DateRange {
	start: Date;
	end: Date;
}

function getDateRange(timeRange?: TimeRange): DateRange | null {
	if (!timeRange || timeRange === "all") {
		return null;
	}

	const end = new Date();
	const start = new Date();

	if (timeRange === "7d") {
		start.setDate(start.getDate() - 7);
	} else if (timeRange === "30d") {
		start.setDate(start.getDate() - 30);
	}

	return { start, end };
}

async function getOverviewStats(userId: string) {
	const [
		companiesCount,
		contactsCount,
		interactionsCount,
		notesCount,
		pendingNotifications,
		overdueNotifications,
		upcomingNotifications,
	] = await Promise.all([
		db
			.select({ count: count() })
			.from(companies)
			.where(eq(companies.userId, userId)),
		db
			.select({ count: count() })
			.from(contacts)
			.where(eq(contacts.userId, userId)),
		db
			.select({ count: count() })
			.from(interactions)
			.where(eq(interactions.userId, userId)),
		db.select({ count: count() }).from(notes).where(eq(notes.userId, userId)),
		db
			.select({ count: count() })
			.from(notifications)
			.where(
				and(
					eq(notifications.userId, userId),
					eq(notifications.isCompleted, false)
				)
			),
		db
			.select({ count: count() })
			.from(notifications)
			.where(
				and(
					eq(notifications.userId, userId),
					eq(notifications.isCompleted, false),
					lt(notifications.dueDate, new Date())
				)
			),
		(async () => {
			const now = new Date();
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			const [result] = await db
				.select({ count: count() })
				.from(notifications)
				.where(
					and(
						eq(notifications.userId, userId),
						eq(notifications.isCompleted, false),
						gte(notifications.dueDate, now),
						lte(notifications.dueDate, nextWeek)
					)
				);
			return result;
		})(),
	]);

	return {
		totalCompanies: companiesCount[0]?.count || 0,
		totalContacts: contactsCount[0]?.count || 0,
		totalInteractions: interactionsCount[0]?.count || 0,
		totalNotes: notesCount[0]?.count || 0,
		pendingNotifications: pendingNotifications[0]?.count || 0,
		overdueNotifications: overdueNotifications[0]?.count || 0,
		upcomingNotifications: upcomingNotifications?.count || 0,
	};
}

async function getActivityStats(userId: string, timeRange?: TimeRange) {
	const dateRange = getDateRange(timeRange);
	const baseCondition = eq(interactions.userId, userId);
	const conditions = dateRange
		? and(baseCondition, gte(interactions.occurredAt, dateRange.start))
		: baseCondition;

	const byType = await db
		.select({
			type: interactions.type,
			count: count(),
		})
		.from(interactions)
		.where(conditions)
		.groupBy(interactions.type);

	const bySentiment = await db
		.select({
			sentiment: interactions.sentiment,
			count: count(),
		})
		.from(interactions)
		.where(conditions)
		.groupBy(interactions.sentiment);

	const last7Days = new Date();
	last7Days.setDate(last7Days.getDate() - 7);
	const last30Days = new Date();
	last30Days.setDate(last30Days.getDate() - 30);

	const [last7DaysCount, last30DaysCount] = await Promise.all([
		db
			.select({ count: count() })
			.from(interactions)
			.where(
				and(
					eq(interactions.userId, userId),
					gte(interactions.occurredAt, last7Days)
				)
			),
		db
			.select({ count: count() })
			.from(interactions)
			.where(
				and(
					eq(interactions.userId, userId),
					gte(interactions.occurredAt, last30Days)
				)
			),
	]);

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const overTime = await db
		.select({
			date: sql<string>`DATE(${interactions.occurredAt})`,
			count: count(),
		})
		.from(interactions)
		.where(
			and(
				eq(interactions.userId, userId),
				gte(interactions.occurredAt, thirtyDaysAgo)
			)
		)
		.groupBy(sql`DATE(${interactions.occurredAt})`)
		.orderBy(sql`DATE(${interactions.occurredAt})`);

	return {
		byType: {
			call: byType.find((r) => r.type === "call")?.count || 0,
			email: byType.find((r) => r.type === "email")?.count || 0,
			meeting: byType.find((r) => r.type === "meeting")?.count || 0,
			other: byType.find((r) => r.type === "other")?.count || 0,
		},
		bySentiment: {
			positive: bySentiment.find((r) => r.sentiment === "positive")?.count || 0,
			neutral: bySentiment.find((r) => r.sentiment === "neutral")?.count || 0,
			negative: bySentiment.find((r) => r.sentiment === "negative")?.count || 0,
		},
		recent: {
			last7Days: last7DaysCount[0]?.count || 0,
			last30Days: last30DaysCount[0]?.count || 0,
		},
		overTime: overTime.map((r) => ({
			date: r.date,
			count: r.count,
		})),
	};
}

async function getEngagementStats(userId: string) {
	const topContacts = await db
		.select({
			contactId: interactions.contactId,
			interactionCount: count(),
			contact: contacts,
		})
		.from(interactions)
		.innerJoin(contacts, eq(interactions.contactId, contacts.id))
		.where(eq(interactions.userId, userId))
		.groupBy(interactions.contactId, contacts.id)
		.orderBy(sql`${count()} DESC`)
		.limit(10);

	const contactsWithoutInteractions = await db
		.select({ count: count() })
		.from(contacts)
		.leftJoin(
			interactions,
			and(
				eq(contacts.id, interactions.contactId),
				eq(interactions.userId, userId)
			)
		)
		.where(and(eq(contacts.userId, userId), isNull(interactions.id)));

	const [totalInteractions, totalContacts] = await Promise.all([
		db
			.select({ count: count() })
			.from(interactions)
			.where(eq(interactions.userId, userId)),
		db
			.select({ count: count() })
			.from(contacts)
			.where(eq(contacts.userId, userId)),
	]);

	const avgInteractions =
		(totalContacts[0]?.count || 0) > 0
			? (totalInteractions[0]?.count || 0) / (totalContacts[0]?.count || 1)
			: 0;

	const topCompanies = await db
		.select({
			companyId: contacts.companyId,
			contactCount: count(),
			company: companies,
		})
		.from(contacts)
		.innerJoin(companies, eq(contacts.companyId, companies.id))
		.where(and(eq(contacts.userId, userId), isNotNull(contacts.companyId)))
		.groupBy(contacts.companyId, companies.id)
		.orderBy(sql`${count()} DESC`)
		.limit(10);

	const activeCompanies = await db
		.select({
			companyId: contacts.companyId,
			interactionCount: count(),
			company: companies,
		})
		.from(interactions)
		.innerJoin(contacts, eq(interactions.contactId, contacts.id))
		.innerJoin(companies, eq(contacts.companyId, companies.id))
		.where(and(eq(interactions.userId, userId), isNotNull(contacts.companyId)))
		.groupBy(contacts.companyId, companies.id)
		.orderBy(sql`${count()} DESC`)
		.limit(10);

	return {
		topContacts: topContacts.map((r) => ({
			contactId: r.contactId,
			interactionCount: r.interactionCount,
			contact: {
				id: r.contact.id,
				firstName: r.contact.firstName,
				lastName: r.contact.lastName,
				email: r.contact.email,
			},
		})),
		contactsWithoutInteractions: contactsWithoutInteractions[0]?.count || 0,
		averageInteractionsPerContact: Math.round(avgInteractions * 100) / 100,
		topCompanies: topCompanies.map((r) => ({
			companyId: r.companyId,
			contactCount: r.contactCount,
			company: {
				id: r.company.id,
				name: r.company.name,
			},
		})),
		activeCompanies: activeCompanies.map((r) => ({
			companyId: r.companyId,
			interactionCount: r.interactionCount,
			company: {
				id: r.company.id,
				name: r.company.name,
			},
		})),
	};
}

async function getTaskStats(userId: string) {
	const pendingByType = await db
		.select({
			type: notifications.type,
			count: count(),
		})
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				eq(notifications.isCompleted, false)
			)
		)
		.groupBy(notifications.type);

	const [completedCount, totalCount] = await Promise.all([
		db
			.select({ count: count() })
			.from(notifications)
			.where(
				and(
					eq(notifications.userId, userId),
					eq(notifications.isCompleted, true)
				)
			),
		db
			.select({ count: count() })
			.from(notifications)
			.where(eq(notifications.userId, userId)),
	]);

	const completionRate =
		(totalCount[0]?.count || 0) > 0
			? (completedCount[0]?.count || 0) / (totalCount[0]?.count || 1)
			: 0;

	const overdueBreakdown = await db
		.select({
			type: notifications.type,
			count: count(),
		})
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				eq(notifications.isCompleted, false),
				lt(notifications.dueDate, new Date())
			)
		)
		.groupBy(notifications.type);

	const now = new Date();
	const nextWeek = new Date();
	nextWeek.setDate(nextWeek.getDate() + 7);
	const upcomingByType = await db
		.select({
			type: notifications.type,
			count: count(),
		})
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				eq(notifications.isCompleted, false),
				gte(notifications.dueDate, now),
				lte(notifications.dueDate, nextWeek)
			)
		)
		.groupBy(notifications.type);

	return {
		pendingByType: {
			follow_up_email:
				pendingByType.find((r) => r.type === "follow_up_email")?.count || 0,
			follow_up_call:
				pendingByType.find((r) => r.type === "follow_up_call")?.count || 0,
			follow_up_meeting:
				pendingByType.find((r) => r.type === "follow_up_meeting")?.count || 0,
			general: pendingByType.find((r) => r.type === "general")?.count || 0,
		},
		completionRate: Math.round(completionRate * 100) / 100,
		overdueBreakdown: {
			follow_up_email:
				overdueBreakdown.find((r) => r.type === "follow_up_email")?.count || 0,
			follow_up_call:
				overdueBreakdown.find((r) => r.type === "follow_up_call")?.count || 0,
			follow_up_meeting:
				overdueBreakdown.find((r) => r.type === "follow_up_meeting")?.count ||
				0,
			general: overdueBreakdown.find((r) => r.type === "general")?.count || 0,
		},
		upcomingByType: {
			follow_up_email:
				upcomingByType.find((r) => r.type === "follow_up_email")?.count || 0,
			follow_up_call:
				upcomingByType.find((r) => r.type === "follow_up_call")?.count || 0,
			follow_up_meeting:
				upcomingByType.find((r) => r.type === "follow_up_meeting")?.count || 0,
			general: upcomingByType.find((r) => r.type === "general")?.count || 0,
		},
	};
}

async function getGrowthStats(userId: string) {
	const thisWeekStart = new Date();
	thisWeekStart.setDate(thisWeekStart.getDate() - 7);
	const thisMonthStart = new Date();
	thisMonthStart.setMonth(thisMonthStart.getMonth() - 1);

	const [newContactsThisWeek, newContactsThisMonth, totalContacts] =
		await Promise.all([
			db
				.select({ count: count() })
				.from(contacts)
				.where(
					and(
						eq(contacts.userId, userId),
						gte(contacts.createdAt, thisWeekStart)
					)
				),
			db
				.select({ count: count() })
				.from(contacts)
				.where(
					and(
						eq(contacts.userId, userId),
						gte(contacts.createdAt, thisMonthStart)
					)
				),
			db
				.select({ count: count() })
				.from(contacts)
				.where(eq(contacts.userId, userId)),
		]);

	const [newCompaniesThisWeek, newCompaniesThisMonth, totalCompanies] =
		await Promise.all([
			db
				.select({ count: count() })
				.from(companies)
				.where(
					and(
						eq(companies.userId, userId),
						gte(companies.createdAt, thisWeekStart)
					)
				),
			db
				.select({ count: count() })
				.from(companies)
				.where(
					and(
						eq(companies.userId, userId),
						gte(companies.createdAt, thisMonthStart)
					)
				),
			db
				.select({ count: count() })
				.from(companies)
				.where(eq(companies.userId, userId)),
		]);

	const [newInteractionsThisWeek, newInteractionsThisMonth] = await Promise.all(
		[
			db
				.select({ count: count() })
				.from(interactions)
				.where(
					and(
						eq(interactions.userId, userId),
						gte(interactions.occurredAt, thisWeekStart)
					)
				),
			db
				.select({ count: count() })
				.from(interactions)
				.where(
					and(
						eq(interactions.userId, userId),
						gte(interactions.occurredAt, thisMonthStart)
					)
				),
		]
	);

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const contactsTrend = await db
		.select({
			date: sql<string>`DATE(${contacts.createdAt})`,
			count: count(),
		})
		.from(contacts)
		.where(
			and(eq(contacts.userId, userId), gte(contacts.createdAt, thirtyDaysAgo))
		)
		.groupBy(sql`DATE(${contacts.createdAt})`)
		.orderBy(sql`DATE(${contacts.createdAt})`);

	const companiesTrend = await db
		.select({
			date: sql<string>`DATE(${companies.createdAt})`,
			count: count(),
		})
		.from(companies)
		.where(
			and(eq(companies.userId, userId), gte(companies.createdAt, thirtyDaysAgo))
		)
		.groupBy(sql`DATE(${companies.createdAt})`)
		.orderBy(sql`DATE(${companies.createdAt})`);

	return {
		newContacts: {
			thisWeek: newContactsThisWeek[0]?.count || 0,
			thisMonth: newContactsThisMonth[0]?.count || 0,
			allTime: totalContacts[0]?.count || 0,
		},
		newCompanies: {
			thisWeek: newCompaniesThisWeek[0]?.count || 0,
			thisMonth: newCompaniesThisMonth[0]?.count || 0,
			allTime: totalCompanies[0]?.count || 0,
		},
		newInteractions: {
			thisWeek: newInteractionsThisWeek[0]?.count || 0,
			thisMonth: newInteractionsThisMonth[0]?.count || 0,
		},
		trends: {
			contacts: contactsTrend.map((r) => ({
				date: r.date,
				count: r.count,
			})),
			companies: companiesTrend.map((r) => ({
				date: r.date,
				count: r.count,
			})),
		},
	};
}

async function getIndustryStats(userId: string) {
	const companiesByIndustry = await db
		.select({
			industry: companies.industry,
			count: count(),
		})
		.from(companies)
		.where(and(eq(companies.userId, userId), isNotNull(companies.industry)))
		.groupBy(companies.industry);

	const totalCompaniesWithIndustry = companiesByIndustry.reduce(
		(sum, r) => sum + r.count,
		0
	);

	const contactsByIndustry = await db
		.select({
			industry: companies.industry,
			count: count(),
		})
		.from(contacts)
		.innerJoin(companies, eq(contacts.companyId, companies.id))
		.where(
			and(
				eq(contacts.userId, userId),
				isNotNull(contacts.companyId),
				isNotNull(companies.industry)
			)
		)
		.groupBy(companies.industry);

	const interactionsByIndustry = await db
		.select({
			industry: companies.industry,
			count: count(),
		})
		.from(interactions)
		.innerJoin(contacts, eq(interactions.contactId, contacts.id))
		.innerJoin(companies, eq(contacts.companyId, companies.id))
		.where(
			and(
				eq(interactions.userId, userId),
				isNotNull(contacts.companyId),
				isNotNull(companies.industry)
			)
		)
		.groupBy(companies.industry);

	return {
		companiesByIndustry: companiesByIndustry.map((r) => ({
			industry: r.industry,
			count: r.count,
			percentage:
				totalCompaniesWithIndustry > 0
					? Math.round((r.count / totalCompaniesWithIndustry) * 10000) / 100
					: 0,
		})),
		contactsByIndustry: contactsByIndustry.map((r) => ({
			industry: r.industry,
			count: r.count,
		})),
		interactionsByIndustry: interactionsByIndustry.map((r) => ({
			industry: r.industry,
			count: r.count,
		})),
	};
}

export async function getDashboardStats(userId: string, timeRange?: TimeRange) {
	const [overview, activity, engagement, tasks, growth, industries] =
		await Promise.all([
			getOverviewStats(userId),
			getActivityStats(userId, timeRange),
			getEngagementStats(userId),
			getTaskStats(userId),
			getGrowthStats(userId),
			getIndustryStats(userId),
		]);

	return {
		overview,
		activity,
		engagement,
		tasks,
		growth,
		industries,
	};
}
