CREATE TYPE "public"."message_type" AS ENUM('text', 'photo', 'video', 'document', 'sticker', 'other');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigint NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid(),
	"chat_id" bigint NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"embedding" vector(1536),
	"media_info" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"from_id" bigint,
	"reply_to_id" bigint,
	"forward_from_chat_id" bigint,
	"forward_from_message_id" bigint,
	"views" integer,
	"forwards" integer
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"last_message_id" bigint,
	"last_sync_time" timestamp DEFAULT now() NOT NULL
);
