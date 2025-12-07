-- Add generated tsvector column for full-text search
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "content_tsvector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;
--> statement-breakpoint
-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "notes_content_tsvector_idx" ON "notes" USING GIN ("content_tsvector");

