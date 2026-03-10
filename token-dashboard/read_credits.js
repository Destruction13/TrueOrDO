const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) { console.error('Open error:', err.message); process.exit(1); }
});

const keysToRead = [
    'antigravityUnifiedStateSync.modelCredits',
    'antigravityUnifiedStateSync.userStatus',
    'antigravityUnifiedStateSync.modelPreferences',
];

keysToRead.forEach(key => {
    db.get("SELECT key, value FROM ItemTable WHERE key = ?", [key], (err, row) => {
        if (err || !row) { console.log(`[${key}]: NOT FOUND or error`); return; }
        const raw = row.value;
        console.log(`\n=== ${key} (${raw.length} chars) ===`);

        // Step 1: try as plain JSON
        try {
            const parsed = JSON.parse(raw);
            console.log('FORMAT: JSON\n', JSON.stringify(parsed, null, 2).substring(0, 2000));
            return;
        } catch { }

        // Step 2: try as base64-decoded protobuf — print all readable UTF-8 strings
        try {
            const buf = Buffer.from(raw, 'base64');
            console.log(`FORMAT: Base64 blob (${buf.length} raw bytes)`);
            // Extract all printable strings (at least 4 chars)
            const readable = [];
            let curr = '';
            for (let i = 0; i < buf.length; i++) {
                const c = buf[i];
                if (c >= 0x20 && c < 0x7f) {
                    curr += String.fromCharCode(c);
                } else {
                    if (curr.length >= 4) readable.push(curr);
                    curr = '';
                }
            }
            if (curr.length >= 4) readable.push(curr);
            console.log('STRINGS:', readable.join('\n          '));

            // Also print hex for manual protobuf analysis
            console.log('\nHEX (first 200 bytes):', buf.slice(0, 200).toString('hex'));
        } catch (e) {
            console.log('RAW:', raw.substring(0, 500));
        }
    });
});

setTimeout(() => db.close(), 3000);
