import * as chrono from "chrono-node";

export interface ParsedDate {
	date: Date;
	text: string;
	isAllDay: boolean;
}

export function parseDate(
	input: string,
	referenceDate?: Date
): ParsedDate | null {
	const ref = referenceDate || new Date();
	const results = chrono.parse(input, ref, { forwardDate: true });

	if (results.length === 0) return null;

	const result = results[0];
	return {
		date: result.start.date(),
		text: result.text,
		isAllDay: !result.start.isCertain("hour"),
	};
}

export function parseDateRange(
	input: string,
	referenceDate?: Date
): { start: Date; end?: Date } | null {
	const ref = referenceDate || new Date();
	const results = chrono.parse(input, ref, { forwardDate: true });

	if (results.length === 0) return null;

	const result = results[0];
	return {
		start: result.start.date(),
		end: result.end?.date(),
	};
}

export function extractDate(input: string): {
	date: ParsedDate | null;
	cleanedText: string;
} {
	const results = chrono.parse(input);

	if (results.length === 0) {
		return { date: null, cleanedText: input };
	}

	const result = results[0];
	const cleanedText =
		input.slice(0, result.index) +
		input.slice(result.index + result.text.length);

	return {
		date: {
			date: result.start.date(),
			text: result.text,
			isAllDay: !result.start.isCertain("hour"),
		},
		cleanedText: cleanedText.trim(),
	};
}
