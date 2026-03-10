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
            try {
                const buf = Buffer.from(row.value, 'base64');
                const str = buf.toString('latin1'); // Use latin1 to avoid UTF-8 issues with binary proto
                // Look for ya29. token pattern (Google OAuth2 access token)
                const match = str.match(/ya29\.[A-Za-z0-9\-_.~+/]+=*/);
                if (match) return resolve(match[0]);
                // Scan for long base64-like strings that could be the token
                const parts = str.split(/[\x00-\x1f\x80-\xff]/g).filter(s => s.length > 30);
                resolve(parts.join(''));
            } catch (e) { reject(e); }
        });
    });
}

function httpsRequest(url, options, body = null) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const reqOpts = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };
        const req = https.request(reqOpts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', e => resolve({ status: 0, error: e.message }));
        if (body) req.write(body);
        req.end();
    });
}

async function main() {
    console.log('Extracting OAuth token...');
    const token = await extractOAuthToken();
    console.log('Token:', token.substring(0, 30) + '...');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/1.0 grpc-web-javascript/0.1',
        'X-Goog-Api-Client': 'gl-node/20 codeium/0.1',
    };

    // Try different API paths on cloudcode-pa.googleapis.com
    const endpoints = [
        // gRPC-Web transcoded REST endpoints
        'https://cloudcode-pa.googleapis.com/v1internal/user:getCredits',
        'https://cloudcode-pa.googleapis.com/v1/user/credits',
        'https://cloudcode-pa.googleapis.com/v1/models',
        'https://cloudcode-pa.googleapis.com/v1internal/user/quota',
        'https://cloudcode-pa.googleapis.com/v1internal/models:list',
        'https://cloudcode-pa.googleapis.com/v1/user',
        // Try with exa path
        'https://cloudcode-pa.googleapis.com/exa/google/internal/v1/user/credits',
        // Try model configs
        'https://cloudcode-pa.googleapis.com/v1/model_configs',
    ];

    for (const url of endpoints) {
        const res = await httpsRequest(url, { headers });
        console.log(`\n[${res.status}] ${url}`);
        if (res.body) {
            const preview = res.body.substring(0, 400);
            // Try to parse JSON
            try { const j = JSON.parse(res.body); console.log('JSON:', JSON.stringify(j, null, 2).substring(0, 500)); }
            catch { console.log('BODY:', preview); }
        }
    }
}

main().catch(console.error);
