import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export interface ClerkUserData {
	id: string;
	email: string;
	firstName?: string | null;
	lastName?: string | null;
	imageUrl?: string | null;
}

export async function getOrCreateUser(clerkData: ClerkUserData) {
	const existingUser = await db.query.users.findFirst({
		where: eq(users.id, clerkData.id),
	});

	if (existingUser) {
		return existingUser;
	}

	const [newUser] = await db
		.insert(users)
		.values({
			id: clerkData.id,
			email: clerkData.email,
			firstName: clerkData.firstName ?? null,
			lastName: clerkData.lastName ?? null,
			imageUrl: clerkData.imageUrl ?? null,
		})
		.returning();

	return newUser;
}

export async function updateUser(clerkData: ClerkUserData) {
	const [updatedUser] = await db
		.update(users)
		.set({
			email: clerkData.email,
			firstName: clerkData.firstName ?? null,
			lastName: clerkData.lastName ?? null,
			imageUrl: clerkData.imageUrl ?? null,
			updatedAt: new Date(),
		})
		.where(eq(users.id, clerkData.id))
		.returning();

	return updatedUser;
}

export async function deleteUser(clerkUserId: string) {
	await db.delete(users).where(eq(users.id, clerkUserId));
}

export async function getUser(clerkUserId: string) {
	return db.query.users.findFirst({
		where: eq(users.id, clerkUserId),
	});
}
