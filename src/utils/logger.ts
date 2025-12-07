import { Request, Response, NextFunction } from "express";
import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp} ${level} ${message}`;
});

export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: combine(colorize(), timestamp({ format: "HH:mm:ss.SSS" }), logFormat),
	transports: [new winston.transports.Console()],
});

export const logRequests = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const start = Date.now();

	res.on("finish", () => {
		logger.info(
			`${req.method} ${req.path} ${res.statusCode} - ${Date.now() - start}ms`
		);
	});

	next();
};
