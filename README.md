# SQLite Memory System

SQLite-based memory system with vector search for AI agents. Supports semantic search, access frequency tracking, and daily memory activation.

## Features

- **Vector Search**: Hash-based embeddings for semantic similarity search
- **Frequency Tracking**: Tracks memory access count for smart ranking
- **Daily Reset**: Automatic daily reset at 7 AM with memory reactivation
- **Health Check**: Automatic health monitoring every 8 hours
- **Real-time Sync**: Automatic sync between MEMORY.md and SQLite

## Quick Start

### 1. Install Dependencies

```bash
cd sqlite-memory
npm install
```

### 2. Configure Memory Directory

```bash
export MEMORY_DIR=/root/.openclaw/workspace/memory
mkdir -p $MEMORY_DIR
```

### 3. Initialize Database

```bash
# Create initial MEMORY.md if not exists
touch /root/.openclaw/workspace/MEMORY.md

# Run migration
python3 migrate.py
```

### 4. Start Server

```bash
# Production
node memory.js &

# Or with custom port
PORT=3456 node memory.js
```

### 5. Test

```bash
npm test
# or
curl http://127.0.0.1:3456/list
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | List all endpoints |
| `GET /list` | List all memories |
| `GET /all` | Get all memories as JSON |
| `GET /get?key=xxx` | Get single memory |
| `GET /set?key=xxx&value=xxx` | Set memory |
| `GET /search?q=xxx` | Keyword search |
| `GET /vsearch?q=xxx` | Vector similarity search |
| `GET /frequent` | Get most accessed memories |
| `GET /reset-daily` | Reset daily access counts |

## Deployment

### Systemd Service

Create `/etc/systemd/system/sqlite-memory.service`:

```ini
[Unit]
Description=SQLite Memory Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/sqlite-memory
ExecStart=/usr/bin/node /root/.openclaw/workspace/sqlite-memory/memory.js
Restart=always
Environment=MEMORY_DIR=/root/.openclaw/workspace/memory
Environment=PORT=3456

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable sqlite-memory
sudo systemctl start sqlite-memory
```

### Cron Jobs

Add to crontab (`crontab -e`):

```crontab
# Health check every 8 hours
0 */8 * * * /root/.openclaw/workspace/sqlite-memory/scripts/health_check.sh >> /var/log/sqlite_memory_health.log 2>&1

# Daily reset at 7 AM
0 7 * * * /root/.openclaw/workspace/sqlite-memory/scripts/daily_reset.sh >> /root/.openclaw/workspace/memory/daily_reset.log 2>&1

# Real-time sync (optional, runs continuously)
# 0 * * * * /root/.openclaw/workspace/sqlite-memory/scripts/realtime_sync.sh &
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_DIR` | `/root/.openclaw/workspace/memory` | Memory directory |
| `PORT` | `3456` | HTTP server port |
| `MEMORY_DB` | `$MEMORY_DIR/memories.db` | SQLite database path |

### Directory Structure

```
/root/.openclaw/workspace/
├── memory/
│   ├── memories.db      # SQLite database
│   ├── all.json        # JSON backup
│   ├── MEMORY.md       # Main memory file
│   └── 2026-*.md       # Daily memory files
└── sqlite-memory/
    ├── memory.js       # HTTP server
    ├── migrate.py      # Migration script
    ├── package.json
    └── scripts/
        ├── health_check.sh
        ├── daily_reset.sh
        └── realtime_sync.sh
```

## Vector Search

The system uses hash-based embeddings for similarity search:

- 100-dimensional vectors
- MD5 n-gram hashing
- Cosine similarity
- Access count boosting

```bash
# Vector search example
curl "http://127.0.0.1:3456/vsearch?q=龙助理"
```

## License

MIT
