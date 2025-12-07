// Extend Express Request to include user
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				firstName: string | null;
				lastName: string | null;
				imageUrl: string | null;
			};
		}
	}
}

export {};
