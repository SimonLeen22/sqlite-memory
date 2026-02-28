#!/bin/bash
# Daily Reset - Run at 7 AM daily
# Usage: ./daily_reset.sh

LOG_DIR="${MEMORY_DIR:-/root/.openclaw/workspace/memory}"
API="http://127.0.0.1:3456"

echo "$(date) - Daily reset started"

# Get top memories before reset
TOP=$(curl -s "$API/frequent" | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join([r['key'] for r in d[:5]]))" 2>/dev/null)
echo "Top memories: $TOP"

# Reset daily counts
RESULT=$(curl -s "$API/reset-daily")
echo "Reset: $RESULT"

# Sync memory
python3 "$LOG_DIR/migrate.py" >> $LOG_DIR/daily_reset.log 2>&1

echo "$(date) - Daily reset completed"
