# SQLite Memory System / SQLite 向量记忆系统

[English](#english) | [中文](#中文)

---

## English

### What is this?

A SQLite-based memory system with vector search for AI agents. Built for [OpenClaw](https://github.com/openclaw/openclaw), but works with any AI system.

### Problem Solved

1. **Memory Fragmentation**: AI conversations are stored in separate MD files, hard to search
2. **Slow Search**: Text matching is inefficient for semantic queries
3. **No Prioritization**: Frequently used memories should appear first
4. **No Daily Activation**: Old memories get forgotten over time

### Solution

- **SQLite Storage**: Fast, reliable, single file database
- **Vector Search**: Hash-based embeddings for semantic similarity
- **Access Frequency**: Tracks how often each memory is used
- **Daily Reset**: Reactivates all memories every morning at 7 AM

### Features

- ✅ Vector similarity search (100-dim hash embeddings)
- ✅ Access frequency tracking & smart ranking
- ✅ Automatic daily reset at 7 AM
- ✅ Health check every 8 hours
- ✅ Real-time sync between MEMORY.md and SQLite
- ✅ RESTful API

### Quick Start

```bash
# 1. Install
cd sqlite-memory
npm install

# 2. Initialize
python3 migrate.py

# 3. Start server
node memory.js &

# 4. Test
curl http://127.0.0.1:3456/list
```

### API

| Endpoint | Description |
|----------|-------------|
| `GET /list` | List all memories |
| `GET /search?q=xxx` | Keyword search |
| `GET /vsearch?q=xxx` | Vector similarity search |
| `GET /frequent` | Most accessed memories |
| `GET /reset-daily` | Reset daily counts |

### Deployment

See [Deployment Guide](README.md#deployment) for:
- Systemd service
- Cron jobs
- Nginx reverse proxy

---

## 中文

### 这是什么？

基于 SQLite 的 AI 记忆系统，支持向量搜索。为 [OpenClaw](https://github.com/openclaw/openclaw) 设计，也可用于其他 AI 系统。

### 解决什么问题？

| 痛点 | 解决方案 |
|------|----------|
| 记忆分散在多个 MD 文件 | 统一存储到 SQLite |
| 关键词搜索太慢 | 向量相似度搜索 |
| 常用记忆没有权重 | 访问频次跟踪 |
| 旧记忆逐渐被遗忘 | 每天早上重新激活 |

### 核心功能

- ✅ **向量搜索**: 基于哈希的 100 维向量，语义相似度匹配
- ✅ **频次跟踪**: 记录每条记忆的访问次数，搜索结果加权
- ✅ **每日重置**: 每天早上 7 点重置频次，重新激活所有记忆
- ✅ **健康检查**: 每 8 小时自动检查系统状态
- ✅ **实时同步**: MEMORY.md 与 SQLite 自动双向同步
- ✅ **RESTful API**: 简单易用的 HTTP 接口

### 快速开始

```bash
# 1. 安装依赖
cd sqlite-memory
npm install

# 2. 初始化数据库
python3 migrate.py

# 3. 启动服务
node memory.js &

# 4. 测试
curl http://127.0.0.1:3456/list
```

### API 接口

| 接口 | 说明 |
|------|------|
| `GET /list` | 列出所有记忆 |
| `GET /search?q=xxx` | 关键词搜索 |
| `GET /vsearch?q=xxx` | 向量相似度搜索 |
| `GET /frequent` | 获取高频记忆 |
| `GET /reset-daily` | 重置每日计数 |

### 部署

#### Systemd 服务

```ini
[Unit]
Description=SQLite Memory Server

[Service]
Type=simple
ExecStart=/usr/bin/node /path/to/sqlite-memory/memory.js
Restart=always
Environment=PORT=3456
Environment=MEMORY_DIR=/path/to/memory

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable sqlite-memory
sudo systemctl start sqlite-memory
```

#### Cron 定时任务

```crontab
# 健康检查 (每8小时)
0 */8 * * * /path/to/sqlite-memory/scripts/health_check.sh >> /var/log/sqlite_memory_health.log 2>&1

# 每日重置 (早7点)
0 7 * * * /path/to/sqlite-memory/scripts/daily_reset.sh >> /var/log/sqlite_memory_daily.log 2>&1
```

### 目录结构

```
sqlite-memory/
├── memory.js          # HTTP 服务器
├── migrate.py         # 记忆迁移脚本
├── package.json       # 依赖配置
├── scripts/
│   ├── health_check.sh   # 健康检查
│   ├── daily_reset.sh    # 每日重置
│   └── realtime_sync.sh  # 实时同步
└── README.md
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3456 | HTTP 服务端口 |
| `MEMORY_DIR` | /root/.openclaw/workspace/memory | 记忆目录 |
| `MEMORY_DB` | $MEMORY_DIR/memories.db | 数据库路径 |

### License

MIT - 完全开源，免费使用

---

Built for [OpenClaw](https://github.com/openclaw/openclaw)
