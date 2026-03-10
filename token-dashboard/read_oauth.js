const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) { console.error('Open error:', err.message); process.exit(1); }
});

// Extract OAuth token from userStatus blob — look for Bearer or jwt-like strings
db.get("SELECT key, value FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.oauthToken'", [], (err, row) => {
    if (err || !row) { console.log('oauthToken NOT FOUND'); return; }

    const raw = row.value;
    console.log(`oauthToken key (${raw.length} chars)`);

    try {
        const buf = Buffer.from(raw, 'base64');
        // Extract all printable strings
        let strings = [];
        let curr = '';
        for (let i = 0; i < buf.length; i++) {
            const c = buf[i];
            if (c >= 0x20 && c < 0x7f) curr += String.fromCharCode(c);
            else { if (curr.length >= 8) strings.push(curr); curr = ''; }
        }
        if (curr.length >= 8) strings.push(curr);

        // Find things that look like tokens (long alphanumeric strings)
        const tokenLike = strings.filter(s => s.length > 20);
        console.log('Token-like strings:');
        tokenLike.forEach(s => console.log(' ', s.substring(0, 100)));

    } catch (e) { console.error(e); }
    db.close();
});
