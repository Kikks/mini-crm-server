import dotenv from "dotenv";
dotenv.config();

// Database URL
export const DB_URL = process.env.DATABASE_URL;

// Server Configuration
export const PORT = process.env.PORT;
export const NODE_ENV = process.env.NODE_ENV;

// OpenAI
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Clerk Webhook Secret
export const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
export const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
