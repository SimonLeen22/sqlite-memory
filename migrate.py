#!/usr/bin/env python3
"""
Migration script: Sync MEMORY.md and daily memories to SQLite
"""
import json
import re
import sqlite3
import os
from datetime import datetime
from pathlib import Path

MEMORY_DIR = os.environ.get('MEMORY_DIR', '/root/.openclaw/workspace/memory')
DB_FILE = os.path.join(MEMORY_DIR, 'memories.db')
ALL_JSON = os.path.join(MEMORY_DIR, 'all.json')
MAIN_MEMORY = '/root/.openclaw/workspace/MEMORY.md'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            access_count INTEGER DEFAULT 0,
            last_accessed TEXT,
            embedding TEXT
        )
    """)
    conn.commit()
    conn.close()

def parse_markdown_content(content, source_name):
    memories = {}
    lines = content.split('\n')
    current_section = source_name
    current_data = {"来源": source_name}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('# '):
            if current_data and len(current_data) > 1:
                memories[current_section] = current_data
            current_section = line.replace('# ', '').strip()
            current_data = {"标题": current_section, "来源": source_name}
        elif line.startswith('## '):
            current_section = line.replace('## ', '').strip()
            current_data = {"标题": current_section, "来源": source_name}
        elif line.startswith('### '):
            current_section = line.replace('### ', '').strip()
            current_data = {"标题": current_section, "来源": source_name}
        elif line.startswith('- ') or line.startswith('* '):
            line = line[2:].strip()
            match = re.match(r'\*\*(.+?)\*\*:?\s*(.*)', line)
            if match:
                key, value = match.groups()
                if key.strip() and value.strip():
                    current_data[key.strip()] = value.strip()
            else:
                match2 = re.match(r'(.+?):\s*(.*)', line)
                if match2:
                    key, value = match2.groups()
                    if key.strip() and value.strip():
                        current_data[key.strip()] = value.strip()
    
    if current_data and len(current_data) > 1:
        memories[current_section] = current_data
    
    return memories

def migrate_file(filepath):
    if not os.path.exists(filepath):
        return {}
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    filename = os.path.basename(filepath)
    return parse_markdown_content(content, filename)

def migrate_main_memory():
    if not os.path.exists(MAIN_MEMORY):
        return {}
    with open(MAIN_MEMORY, 'r', encoding='utf-8') as f:
        content = f.read()
    return parse_markdown_content(content, "MEMORY.md")

def migrate_daily_memories():
    memories = {}
    daily_dir = Path(MEMORY_DIR)
    for filepath in sorted(daily_dir.glob("2026-*.md")):
        daily_memories = migrate_file(str(filepath))
        for key, value in daily_memories.items():
            new_key = f"[{filepath.stem}] {key}"
            memories[new_key] = value
    return memories

def save_to_db(all_memories):
    conn = get_db()
    conn.execute("DELETE FROM memories")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for key, value in all_memories.items():
        value_json = json.dumps(value, ensure_ascii=False)
        conn.execute(
            "INSERT INTO memories (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (key, value_json, now, now)
        )
    conn.commit()
    conn.close()
    print(f"Saved {len(all_memories)} memories to database")

def update_all_json(all_memories):
    with open(ALL_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_memories, f, ensure_ascii=False, indent=2)
    print(f"Updated all.json ({len(all_memories)} items)")

def main():
    print("="*50)
    print("SQLite Memory Migration")
    print("="*50)
    
    init_db()
    
    print("\n[1] Migrating MEMORY.md...")
    main_memories = migrate_main_memory()
    
    print("\n[2] Migrating daily memories...")
    daily_memories = migrate_daily_memories()
    
    all_memories = {**main_memories, **daily_memories}
    print(f"\nTotal: {len(all_memories)} memories")
    
    save_to_db(all_memories)
    update_all_json(all_memories)
    
    print("\n" + "="*50)
    print("Migration completed!")
    print("="*50)

if __name__ == "__main__":
    main()
