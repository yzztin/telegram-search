![preview](./assets/preview.png)

<h1 align="center">Telegram Search</h1>

<p align="center">
  [<a href="https://discord.gg/NzYsmJSgCT">Join Discord Server</a>] [<a href="../README.md">简体中文</a>]
</p>

<p align="center">
  <a href="https://deepwiki.com/GramSearch/telegram-search"><img src="https://deepwiki.com/badge.svg"></a>
  <a href="https://github.com/GramSearch/telegram-search/blob/main/LICENSE"><img src="https://img.shields.io/github/license/GramSearch/telegram-search.svg?style=flat&colorA=080f12&colorB=1fa669"></a>
    <a href="https://discord.gg/NzYsmJSgCT"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FNzYsmJSgCT%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&suffix=%20members&logo=discord&logoColor=white&label=%20&color=7389D8&labelColor=6A7EC2"></a>
  <a href="https://t.me/+Gs3SH2qAPeFhYmU9"><img src="https://img.shields.io/badge/Telegram-%235AA9E6?logo=telegram&labelColor=FFFFFF"></a>
</p>

> The only official website is `intentchat.app`, all other websites are scams.
>
> We have not issued any virtual currency, please do not be deceived.
>
> This software can only export your own chat records for search, please do not use it for illegal purposes.

<a href="https://trendshift.io/repositories/13868" target="_blank"><img src="https://trendshift.io/api/badge/repositories/13868" alt="groupultra%2Ftelegram-search | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

A powerful Telegram chat history search tool that supports vector search and semantic matching. Based on OpenAI's semantic vector technology, it makes your Telegram message retrieval smarter and more precise.

## 💖 Sponsors

![Sponsors](https://github.com/luoling8192/luoling8192/raw/master/sponsorkit/sponsors.svg)

Quick Start

The simplest way to start Telegram Search is using Docker to launch all necessary services (database and application server).

1. Clone the repository:

```bash
git clone https://github.com/GramSearch/telegram-search.git
cd telegram-search
```

2. Configure settings:

```bash
# Modify settings in config/config.yaml as needed.
# Make sure to change database.host value to "pgvector" in the configuration.

cp config/config.example.yaml config/config.yaml
```

3. Start services:

```bash
docker compose up -d
```

Access http://localhost:3333 to open the search interface.

Local Run

1. Clone repository:

```bash
git clone https://github.com/GramSearch/telegram-search.git
cd telegram-search
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment:

```bash
cp config/config.example.yaml config/config.yaml
```

4. Start database container:
Docker is only used for database container in local development.

```bash
docker compose up -d pgvector
```

5. Sync database schema:

```bash
pnpm run db:migrate
```

6. Start services:

```bash
# Start backend
pnpm run dev:server

# Start frontend
pnpm run dev:frontend
```

Access http://localhost:3333 to open the search interface.

## 🚀 Activity

[![Star History Chart](https://api.star-history.com/svg?repos=luoling8192/telegram-search&type=Date)](https://star-history.com/#luoling8192/telegram-search&Date)
