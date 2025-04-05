# Telegram Search

[CN](./README.md) | [TODO](https://github.com/GramSearch/telegram-search/issues/23)

A powerful Telegram chat history search tool that supports vector search and semantic matching. Based on OpenAI's semantic vector technology, it makes your Telegram message retrieval smarter and more precise.

## ⚠️ **Note**

- Using UserBot comes with the risk of account suspension, please use with caution.
- Due to the project being in a rapid iteration phase, database incompatibility may occur. It's recommended to back up your data regularly.
- Get the API key: #111

## 🚀 Quick Start

### Installation Steps

1. Clone the repository:

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

4. Start the database container:

```bash
docker compose up -d
```

5. Initialize the database:

```bash
pnpm run db:migrate
```

6. Start services:

```bash
# Start backend service
pnpm run dev:server

# Start frontend interface
pnpm run dev:frontend
```

Visit `http://localhost:3333` to open the search interface.

## 🚀 Activity

[![Star History Chart](https://api.star-history.com/svg?repos=luoling8192/telegram-search&type=Date)](https://star-history.com/#luoling8192/telegram-search&Date)

![Alt](https://repobeats.axiom.co/api/embed/c0fe5f057a33ce830a632c6ae421433f50e9083f.svg "Repobeats analytics image")

## 📝 License

MIT License © 2025
