# Telegram Search

一个功能强大的 Telegram 聊天记录搜索工具，支持向量搜索和语义匹配。

## 功能特点

- 🤖 支持 Telegram Bot 实时收集消息
- 📥 支持导入 Telegram 导出的 HTML 聊天记录
- 🔍 基于 OpenAI 的语义向量搜索
- 📊 支持多种消息类型（文本、图片、视频、文件、贴纸等）
- 🌐 完整的消息元数据（回复、转发、查看次数等）
- 🚀 批量处理和向量生成
- 💾 PostgreSQL 数据存储
- ⚠️ 注意：使用 userbot 可能存在封号风险，请谨慎使用

## 安装

1. 克隆仓库：
```bash
git clone https://github.com/luoling8192/telegram-search.git
cd telegram-search
```

2. 安装依赖：
```bash
pnpm install
```

3. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

4. 初始化数据库：
```bash
pnpm -F @tg-search/core db:migrate
```

## 使用方法

### 导入聊天记录

从 Telegram Desktop 导出的 HTML 文件导入：

```bash
# 正常导入（包含向量嵌入）
nr dev:core import -c <chat_id> -p <path_to_html_files>

# 跳过向量嵌入
nr dev:core import -c <chat_id> -p <path_to_html_files> --no-embedding
```

### 生成向量嵌入

```bash
nr dev:core embed -b <batch_size> -c <chat_id>
```

### 启动 Bot

```bash
nr dev:core bot
```

### 搜索消息

```bash
nr dev:core search
```

### 监听新消息

```bash
nr dev:core watch
```

## 环境要求

- Node.js >= 18
- PostgreSQL >= 15
- OpenAI API Key（用于向量嵌入）
- Telegram Bot Token
- Telegram API ID 和 Hash

## 项目结构

```
packages/
  ├── core/           # 核心功能模块
  │   ├── src/
  │   │   ├── commands/   # CLI 命令
  │   │   ├── db/        # 数据库相关
  │   │   ├── services/  # 服务层
  │   │   └── adapter/   # 适配器
  │   └── package.json
  └── common/         # 共享工具和类型
```

## 数据库架构

- `messages` 表：存储所有消息
  - 支持向量搜索（使用 pgvector）
  - 自动分区（按聊天 ID）
  - 完整的消息元数据

## 开发

1. 生成数据库迁移：
```bash
pnpm -F @tg-search/core db:generate
```

2. 应用迁移：
```bash
pnpm -F @tg-search/core db:migrate
```

3. 启动开发服务器：
```bash
pnpm -F @tg-search/core dev
```

## 许可证

MIT 
