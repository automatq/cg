// api/content.js — Vercel serverless function
// Handles GET and PUT for /api/content
// Uses JSONBin.io for persistent storage (set JSONBIN_BIN_ID + JSONBIN_API_KEY env vars)

const path = require('path');
const fs = require('fs');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '111825';
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_URL = JSONBIN_BIN_ID
    ? `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`
    : null;

// Fallback: read bundled content.json (read-only on Vercel)
function getLocalContent() {
    try {
        const file = path.join(process.cwd(), 'content.json');
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return {};
    }
}

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // ── GET ──────────────────────────────────────────
    if (req.method === 'GET') {
        if (!JSONBIN_URL) {
            // No JSONBin configured — serve bundled content.json
            return res.status(200).json(getLocalContent());
        }
        try {
            const r = await fetch(`${JSONBIN_URL}/latest`, {
                headers: { 'X-Master-Key': JSONBIN_API_KEY }
            });
            if (!r.ok) throw new Error('JSONBin read failed');
            const data = await r.json();
            return res.status(200).json(data.record);
        } catch (err) {
            // Fallback to local if JSONBin fails
            return res.status(200).json(getLocalContent());
        }
    }

    // ── PUT ──────────────────────────────────────────
    if (req.method === 'PUT') {
        // Auth check
        if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!JSONBIN_URL) {
            return res.status(503).json({
                error: 'Storage not configured. Set JSONBIN_BIN_ID and JSONBIN_API_KEY environment variables in Vercel.'
            });
        }
        try {
            const r = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_API_KEY
                },
                body: JSON.stringify(req.body)
            });
            if (!r.ok) throw new Error('JSONBin write failed');
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to save content: ' + err.message });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
};
