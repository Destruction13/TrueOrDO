const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) { console.error('Open error:', err.message); process.exit(1); }
});

// Dump ALL antigravity keys to understand the full schema
db.all("SELECT key, length(value) as valLen, value FROM ItemTable WHERE key LIKE '%antigravity%' ORDER BY key", [], (err, rows) => {
    if (err) { console.error(err.message); db.close(); return; }
    console.log(`Found ${rows.length} antigravity keys:\n`);
    rows.forEach(r => {
        console.log(`KEY: ${r.key} (${r.valLen} bytes)`);
        let val = r.value;
        // Try base64 decode if it looks like protobuf base64
        try {
            const buf = Buffer.from(val, 'base64');
            // Print as both raw and hex prefix
            const txt = buf.toString('utf8');
            // If printable, show text
            if (/^[\x20-\x7E\n\r\t]*$/.test(txt)) {
                console.log(`  TEXT: ${txt.substring(0, 500)}`);
            } else {
                // Try JSON
                try {
                    const parsed = JSON.parse(val);
                    console.log(`  JSON: ${JSON.stringify(parsed, null, 2).substring(0, 500)}`);
                } catch {
                    console.log(`  HEX: ${buf.toString('hex').substring(0, 100)}...`);
                    // Look for readable strings in the binary
                    const readable = buf.toString('utf8').replace(/[^\x20-\x7E]/g, '.');
                    console.log(`  STR: ${readable.substring(0, 200)}`);
                }
            }
        } catch {
            console.log(`  RAW: ${String(val).substring(0, 200)}`);
        }
        console.log('');
    });
    db.close();
});
