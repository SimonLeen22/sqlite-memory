#!/usr/bin/env node
/**
 * SQLite Memory Server with Vector Search + Frequency Tracking
 */

const Database = require('better-sqlite3');
const http = require('http');
const crypto = require('crypto');

const DB_PATH = process.env.MEMORY_DB || '/root/.openclaw/workspace/memory/memories.db';
const PORT = process.env.PORT || 3456;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure columns exist
try { db.exec("ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE memories ADD COLUMN last_accessed TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE memories ADD COLUMN embedding TEXT"); } catch (e) {}

// Hash-based embedding
function getEmbedding(text) {
    const features = [];
    for (let n = 1; n <= 3; n++) {
        for (let i = 0; i < text.length - n + 1; i++) {
            const ngram = text.slice(i, i + n);
            const hash = crypto.createHash('md5').update(ngram).digest('hex');
            features.push(parseInt(hash.slice(0, 8), 16) % 1000);
        }
    }
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words.slice(0, 10)) {
        const hash = crypto.createHash('md5').update(word).digest('hex');
        const h = parseInt(hash.slice(0, 8), 16) % 1000;
        if (!features.includes(h)) features.push(h);
    }
    while (features.length < 100) features.push(0);
    return features.slice(0, 100);
}

function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function trackAccess(key) {
    const now = new Date().toISOString();
    db.prepare("UPDATE memories SET access_count = access_count + 1, last_accessed = ? WHERE key = ?").run(now, key);
}

function ensureEmbeddings() {
    const rows = db.prepare("SELECT id, key, value FROM memories WHERE embedding IS NULL").all();
    for (const row of rows) {
        const text = `${row.key} ${row.value}`;
        const embedding = JSON.stringify(getEmbedding(text));
        db.prepare("UPDATE memories SET embedding = ? WHERE id = ?").run(embedding, row.id);
    }
    if (rows.length > 0) console.log(`Generated ${rows.length} embeddings`);
}

const endpoints = {
    '/': () => ({ endpoints: ['/get?key=xxx', '/set?key=xxx&value=xxx', '/search?q=xxx', '/vsearch?q=xxx', '/list', '/all', '/frequent', '/reset-daily'] }),
    
    '/list': () => {
        const rows = db.prepare("SELECT id, key, updated_at, access_count, last_accessed FROM memories ORDER BY updated_at DESC").all();
        return rows;
    },
    
    '/all': () => {
        const rows = db.prepare("SELECT key, value, access_count, last_accessed FROM memories").all();
        const result = {};
        for (const row of rows) {
            result[row.key] = { ...JSON.parse(row.value), access_count: row.access_count, last_accessed: row.last_accessed };
        }
        return result;
    },
    
    '/get': (query) => {
        if (!query.key) return { error: 'Missing key parameter' };
        const row = db.prepare("SELECT * FROM memories WHERE key = ?").get(query.key);
        if (row) trackAccess(query.key);
        return row || { error: 'Not found' };
    },
    
    '/set': (query) => {
        if (!query.key || !query.value) return { error: 'Missing key or value' };
        const now = new Date().toISOString();
        const embedding = JSON.stringify(getEmbedding(`${query.key} ${query.value}`));
        
        try {
            db.prepare(`
                INSERT INTO memories (key, value, created_at, updated_at, embedding, access_count)
                VALUES (?, ?, ?, ?, ?, 0)
                ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?, embedding = ?
            `).run(query.key, query.value, now, now, embedding, query.value, now, embedding);
            return { success: true };
        } catch (e) {
            return { error: e.message };
        }
    },
    
    '/search': (query) => {
        if (!query.q) return { error: 'Missing q parameter' };
        const rows = db.prepare(`
            SELECT key, value, access_count FROM memories 
            WHERE key LIKE ? OR value LIKE ?
            ORDER BY access_count DESC, updated_at DESC
            LIMIT 20
        `).all(`%${query.q}%`, `%${query.q}%`);
        
        // Track all accessed
        rows.forEach(r => trackAccess(r.key));
        return rows;
    },
    
    '/vsearch': (query) => {
        if (!query.q) return { error: 'Missing q parameter' };
        const queryEmbedding = getEmbedding(query.q);
        const rows = db.prepare("SELECT key, value, embedding, access_count FROM memories WHERE embedding IS NOT NULL").all();
        
        const results = [];
        for (const row of rows) {
            const memEmbedding = JSON.parse(row.embedding);
            const sim = cosineSimilarity(queryEmbedding, memEmbedding);
            // Boost by access count
            const boost = Math.log(row.access_count + 1) * 0.1;
            results.push({ key: row.key, value: row.value, similarity: sim + boost, access_count: row.access_count });
        }
        
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Track accessed
        results.slice(0, 5).forEach(r => trackAccess(r.key));
        
        return results.slice(0, 10);
    },
    
    '/frequent': () => {
        const rows = db.prepare("SELECT key, value, access_count, last_accessed FROM memories ORDER BY access_count DESC LIMIT 20").all();
        return rows;
    },
    
    '/reset-daily': () => {
        // Reset daily (called by cron) - keep top 10 frequent, reset others
        const result = db.prepare("UPDATE memories SET access_count = 0 WHERE access_count > 0").run();
        return { reset: result.changes };
    }
};

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const path = url.pathname;
        const query = Object.fromEntries(url.searchParams);
        
        ensureEmbeddings();
        
        const handler = endpoints[path];
        if (handler) {
            const result = handler(query);
            res.end(JSON.stringify(result));
        } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
    }
});

server.listen(PORT, () => {
    console.log(`Memory Server: http://localhost:${PORT}`);
    console.log(`Endpoints: /frequent, /reset-daily`);
});
