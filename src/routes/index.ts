import { Router } from "express";
import { requireAuth } from "@clerk/express";

import authRouter from "./auth.routes.js";
import companiesRouter from "./companies.routes.js";
import contactsRouter from "./contacts.routes.js";
import interactionsRouter from "./interactions.routes.js";
import notesRouter from "./notes.routes.js";
import notificationsRouter from "./notifications.routes.js";
import statsRouter from "./stats.routes.js";
import { chatRouter } from "./chat.routes.js";
import { threadsRouter } from "./thread.route.js";

const router = Router();

router.use("/auth", authRouter);

// Protected routes
router.use("/companies", requireAuth(), companiesRouter);
router.use("/contacts", requireAuth(), contactsRouter);
router.use("/interactions", requireAuth(), interactionsRouter);
router.use("/notes", requireAuth(), notesRouter);
router.use("/notifications", requireAuth(), notificationsRouter);
router.use("/stats", requireAuth(), statsRouter);
router.use("/assistant", requireAuth(), chatRouter);
router.use("/threads", requireAuth(), threadsRouter);

export default router;
