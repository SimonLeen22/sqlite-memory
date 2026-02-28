#!/bin/bash
# Realtime Sync - Run continuously (every 30 seconds)
# Usage: ./realtime_sync.sh &

LOG_DIR="${MEMORY_DIR:-/root/.openclaw/workspace/memory}"

echo "$(date) - Realtime sync started"

while true; do
    python3 "$LOG_DIR/migrate.py" >> $LOG_DIR/realtime_sync.log 2>&1
    sleep 30
done
