import { getAuth, clerkClient, WebhookEvent } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { getOrCreateUser, updateUser, deleteUser } from "./user.lib";

export function getUserId(req: Request) {
	const { userId } = getAuth(req);
	if (!userId) {
		throw new Error("Unauthorized");
	}

	return userId;
}

export async function ensureUser(req: Request) {
	const { userId } = getAuth(req);
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const clerkUser = await clerkClient.users.getUser(userId);

	const user = await getOrCreateUser({
		id: clerkUser.id,
		email: clerkUser.emailAddresses[0]?.emailAddress || "",
		firstName: clerkUser.firstName,
		lastName: clerkUser.lastName,
		imageUrl: clerkUser.imageUrl,
	});

	return user;
}

export async function requireUserMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = await ensureUser(req);
		req.user = user;
		next();
	} catch {
		res.status(401).json({ error: "Unauthorized" });
	}
}

export function getCurrentUser(req: Request) {
	if (!req.user) {
		throw new Error(
			"User not found on request. Did you use requireUserMiddleware?"
		);
	}
	return req.user;
}

export async function handleClerkWebhook(event: WebhookEvent) {
	switch (event.type) {
		case "user.created":
		case "user.updated": {
			const { id, email_addresses, first_name, last_name, image_url } =
				event.data;
			const email = email_addresses[0]?.email_address || "";

			if (event.type === "user.created") {
				await getOrCreateUser({
					id,
					email,
					firstName: first_name,
					lastName: last_name,
					imageUrl: image_url,
				});
			} else {
				await updateUser({
					id,
					email,
					firstName: first_name,
					lastName: last_name,
					imageUrl: image_url,
				});
			}
			break;
		}

		case "user.deleted": {
			if (event.data.id) {
				await deleteUser(event.data.id);
			}
			break;
		}
	}
}
