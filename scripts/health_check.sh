#!/bin/bash
# Health Check - Run every 8 hours
# Usage: ./health_check.sh

LOG_DIR="${MEMORY_DIR:-/root/.openclaw/workspace/memory}"
DB="$LOG_DIR/memories.db"
JSON="$LOG_DIR/all.json"
API="http://127.0.0.1:3456"

echo "=== $(date) Health Check ==="

# 1. Database
echo -n "1. DB: "
sqlite3 $DB "SELECT COUNT(*) FROM memories;" >> /dev/null 2>&1 && echo "OK" || echo "FAIL"

# 2. HTTP
curl -s $API/ >/dev/null 2>&1 && echo "2. HTTP: OK" || echo "2. HTTP: FAIL"

# 3. Sync
python3 "$LOG_DIR/migrate.py" >> /var/log/sqlite_memory_health.log 2>&1

# 4. Verify
COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM memories;")
echo "5. Total: $COUNT memories"

echo ""
