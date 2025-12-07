export interface PaginationParams {
	offset: number;
	limit: number;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	offset: number;
	limit: number;
	hasMore: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

export function parsePaginationParams(
	query: Record<string, string | undefined>
): PaginationParams {
	const offset = query.offset ? parseInt(query.offset, 10) : 0;
	const limit = query.limit ? parseInt(query.limit, 10) : DEFAULT_LIMIT;

	const validOffset = Math.max(0, isNaN(offset) ? 0 : offset);
	const validLimit = Math.min(
		MAX_LIMIT,
		Math.max(1, isNaN(limit) ? DEFAULT_LIMIT : limit)
	);

	return {
		offset: validOffset,
		limit: validLimit,
	};
}

export function createPaginatedResponse<T>(
	data: T[],
	total: number,
	offset: number,
	limit: number
): PaginatedResponse<T> {
	return {
		data,
		total,
		offset,
		limit,
		hasMore: offset + data.length < total,
	};
}
