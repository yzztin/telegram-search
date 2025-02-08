DO $$ BEGIN
 CREATE TYPE "message_type" AS ENUM('text', 'photo', 'video', 'document', 'sticker', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" bigint PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"embedding" text,
	"media_info" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"from_id" bigint,
	"reply_to_id" bigint,
	"forward_from_chat_id" bigint,
	"forward_from_message_id" bigint,
	"views" integer,
	"forwards" integer
);
