# 数据库设计

## 概述

本项目使用 PostgreSQL 数据库，并集成了 pgvector 扩展以支持向量搜索功能。数据库设计的主要目标是高效存储和检索 Telegram 消息。

## 数据表

### 消息表 (messages)

```sql
CREATE TABLE messages (
    id BIGINT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    message_id INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    from_id BIGINT,
    text TEXT,
    embedding vector(1536),
    media_type TEXT,
    media_file TEXT,
    reply_to_message_id INTEGER,
    forward_from_chat_id BIGINT,
    forward_from_message_id INTEGER,
    views INTEGER,
    forwards INTEGER,
    metadata JSONB
);
```

主要特点：
- 按 chat_id 分区以提升性能
- 支持向量嵌入用于语义搜索
- 完整的消息元数据存储
- 针对普通查询和向量查询进行优化

### 会话表 (chats)

```sql
CREATE TABLE chats (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    last_message_id INTEGER,
    last_sync_time TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    settings JSONB
);
```

### 文件夹表 (folders)

```sql
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    chat_ids BIGINT[],
    sync_status TEXT,
    last_sync_time TIMESTAMP WITH TIME ZONE
);
```

## 索引设计

```sql
-- 消息表索引
CREATE INDEX idx_messages_chat_date ON messages(chat_id, date DESC);
CREATE INDEX idx_messages_text ON messages USING gin(to_tsvector('english', text));
CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops);

-- 会话表索引
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_title ON chats USING gin(to_tsvector('english', title));
```

## 分区策略

消息表按 chat_id 进行分区，以提升查询性能和便于维护：

```sql
CREATE TABLE messages_partition_template (
    LIKE messages INCLUDING ALL
) PARTITION BY RANGE (chat_id);
```

## 备份与恢复

由于向量数据的特殊性，备份策略尤为重要：

1. 每日完整数据库备份
2. 配置时间点恢复（PITR）
3. 定期执行 vacuum 和 analyze 操作

## 性能优化建议

- 合理设置向量操作的批处理大小
- 定期维护索引
- 监控表和索引大小
- 实施适当的 vacuum 策略

## 数据安全

- 定期备份
- 数据加密存储
- 访问权限控制
- 敏感信息保护

## 扩展性考虑

- 分区表可以根据数据量动态扩展
- 索引策略可根据查询模式调整
- 支持水平扩展的设计
- 预留未来功能扩展的字段 
