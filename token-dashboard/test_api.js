const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');

const dbPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');

function extractOAuthToken() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
            if (err) return reject(err);
        });
        db.get("SELECT value FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.oauthToken'", [], (err, row) => {
            db.close();
            if (err || !row) return reject(new Error('No oauth token found'));

            // Decode base64 protobuf and extract token string
            try {
                const buf = Buffer.from(row.value, 'base64');
                // Look for ya29. token pattern (Google OAuth2 access token)
                const str = buf.toString('utf8');
                const match = str.match(/ya29\.[A-Za-z0-9\-_.~+/]+=*/);
                if (match) return resolve(match[0]);
                // Also look for long base64 strings that could be tokens
                const all = [];
                let curr = '';
                for (let i = 0; i < buf.length; i++) {
                    const c = buf[i];
                    if (c >= 0x20 && c < 0x7f) curr += String.fromCharCode(c);
                    else { if (curr.length > 30) all.push(curr); curr = ''; }
                }
                resolve(all.join(''));
            } catch (e) { reject(e); }
        });
    });
}

function tryFetch(url, token) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Antigravity/1.0'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n[${res.statusCode}] ${url}`);
                console.log(data.substring(0, 500));
                resolve({ status: res.statusCode, body: data });
            });
        });
        req.on('error', e => { console.log(`FETCH ERR ${url}: ${e.message}`); resolve(null); });
        req.end();
    });
}

async function main() {
    const token = await extractOAuthToken();
    console.log('Token snippet:', token.substring(0, 40) + '...');

    // Try known Antigravity/Google API endpoints for quota
    const endpoints = [
        'https://api.antigravity.google/api/v1/user/quota',
        'https://api.antigravity.google/api/v1/models',
        'https://api.antigravity.google/v1/quota',
        'https://api.antigravity.google/api/user',
        'https://cascade.antigravity.dev/api/v1/user/quota',
    ];

    for (const ep of endpoints) {
        await tryFetch(ep, token);
    }
}

main().catch(console.error);
