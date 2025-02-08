-- Create database if not exists
SELECT 'CREATE DATABASE tg_search'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tg_search')\gexec

-- Connect to the tg_search database
\c tg_search;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create message_type enum
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'photo', 'video', 'document', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    type message_type NOT NULL DEFAULT 'text',
    content TEXT,
    embedding vector(1536),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    from_id BIGINT,
    reply_to_id BIGINT,
    forward_from_chat_id BIGINT,
    forward_from_message_id BIGINT,
    views INTEGER,
    forwards INTEGER
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
