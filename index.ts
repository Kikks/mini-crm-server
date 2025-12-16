import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";

import appRoutes from "./src/routes";
import { logger, logRequests } from "./src/utils/logger.js";
import { keepAliveHandler } from "./src/utils/keepalive.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(logRequests);
app.use(clerkMiddleware());

// Routes
app.use("/api", appRoutes);
app.get("/api/health", (_, res) => {
	res.json({ status: "ok" });
});

// Support both GET and HEAD requests
app.get("/api/keepalive", keepAliveHandler);
app.head("/api/keepalive", keepAliveHandler);

// Start server
app.listen(PORT, () => {
	logger.info(`Server started on http://localhost:${PORT}`);
	logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});
