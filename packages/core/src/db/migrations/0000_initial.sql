-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create message_type enum
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'photo', 'video', 'document', 'sticker', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" bigint PRIMARY KEY,
    "chat_id" bigint NOT NULL,
    "type" message_type NOT NULL DEFAULT 'text',
    "content" text,
    "embedding" vector(1536),
    "media_info" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "from_id" bigint,
    "reply_to_id" bigint,
    "forward_from_chat_id" bigint,
    "forward_from_message_id" bigint,
    "views" integer,
    "forwards" integer
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "messages_embedding_idx" ON "messages" 
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS "messages_chat_id_created_at_idx" ON "messages" ("chat_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "messages_type_idx" ON "messages" ("type");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" ("created_at" DESC); 
