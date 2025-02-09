CREATE TYPE "public"."chat_type" AS ENUM('user', 'group', 'channel', 'saved');--> statement-breakpoint
CREATE TABLE "chats" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "chat_type" NOT NULL,
	"last_message" text,
	"last_message_date" timestamp,
	"last_sync_time" timestamp DEFAULT now() NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"folder_id" integer
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"emoji" text,
	"last_sync_time" timestamp DEFAULT now() NOT NULL
);
