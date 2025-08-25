![preview](./assets/preview.png)

<h1 align="center">Telegram Search</h1>

<p align="center">
  [<a href="https://discord.gg/NzYsmJSgCT">Join Discord Server</a>] [<a href="./README.md">English</a>]
</p>

<p align="center">
  <a href="https://deepwiki.com/GramSearch/telegram-search"><img src="https://deepwiki.com/badge.svg"></a>
  <a href="https://github.com/GramSearch/telegram-search/blob/main/LICENSE"><img src="https://img.shields.io/github/license/GramSearch/telegram-search.svg?style=flat&colorA=080f12&colorB=1fa669"></a>
    <a href="https://discord.gg/NzYsmJSgCT"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FNzYsmJSgCT%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&suffix=%20members&logo=discord&logoColor=white&label=%20&color=7389D8&labelColor=6A7EC2"></a>
  <a href="https://t.me/+Gs3SH2qAPeFhYmU9"><img src="https://img.shields.io/badge/Telegram-%235AA9E6?logo=telegram&labelColor=FFFFFF"></a>
</p>

> 唯一官方网站为 `intentchat.app`，其他网站均为诈骗。
>
> 我们未发行任何虚拟货币，请勿上当受骗。
>
> 本软件仅可导出您自己的聊天记录以便搜索，请勿用于非法用途。

<a href="https://trendshift.io/repositories/13868" target="_blank"><img src="https://trendshift.io/api/badge/repositories/13868" alt="groupultra%2Ftelegram-search | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

一个功能强大的 Telegram 聊天记录搜索工具，支持向量搜索和语义匹配。基于 OpenAI 的语义向量技术，让你的 Telegram 消息检索更智能、更精准。

## 💖 赞助者

![Sponsors](https://github.com/luoling8192/luoling8192/raw/master/sponsorkit/sponsors.svg)

## 🚀 快速开始

1. 克隆仓库

```bash
git clone https://github.com/GramSearch/telegram-search.git
cd telegram-search

# 切换到 release 分支
git switch release
```

2. 修改配置文件

```bash
# 根据需要，修改 `config/config.yaml` 中的设置
# 务必修改配置中的 `database.host` 的值为数据库容器的服务名称 "pgvector"

cp config/config.example.yaml config/config.yaml
```

3. 启动服务

```bash
docker compose up -d
```

访问 `http://localhost:3333` 即可打开搜索界面。

## 💻 开发教程

1. 克隆仓库

2. 安装依赖

```bash
pnpm install
```

3. 修改配置文件

4. 启动数据库容器：

```bash
# 在本地开发模式下， Docker 只用来启动数据库容器
docker compose up -d pgvector
```

5. 同步数据库表结构：

```bash
pnpm run db:migrate
```

6. 启动服务：

```bash
# 启动后端服务
pnpm run dev:server

# 启动前端界面
pnpm run dev:frontend
```

## 🚀 Activity

[![Star History Chart](https://api.star-history.com/svg?repos=luoling8192/telegram-search&type=Date)](https://star-history.com/#luoling8192/telegram-search&Date)
