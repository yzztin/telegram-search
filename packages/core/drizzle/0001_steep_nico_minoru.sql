CREATE TABLE IF NOT EXISTS "sync_state" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"last_message_id" bigint,
	"last_sync_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'messages'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "messages" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "uuid" uuid DEFAULT gen_random_uuid();