const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');

const dbPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');

function extractTokenFromDb() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
            if (err) return reject(err);
        });
        db.get("SELECT value FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.oauthToken'", [], (err, row) => {
            db.close();
            if (err || !row) return reject(new Error('No oauth token found'));

            const raw = row.value;
            console.log('Raw value length:', raw.length, 'chars');
            console.log('First 100 chars:', raw.substring(0, 100));

            // Method 1: Try to decode raw as base64
            try {
                const buf = Buffer.from(raw, 'base64');
                console.log('\nBase64 decoded:', buf.length, 'bytes');
                console.log('Hex prefix:', buf.slice(0, 20).toString('hex'));

                // Scan for ya29. in the binary blob
                const str = buf.toString('binary');
                const ya29idx = str.indexOf('ya29.');
                if (ya29idx >= 0) {
                    // Extract from ya29. onwards until non-printable byte
                    let token = '';
                    for (let i = ya29idx; i < buf.length; i++) {
                        const c = buf[i];
                        if (c >= 0x20 && c <= 0x7e && c !== 0x22) token += String.fromCharCode(c);
                        else break;
                    }
                    console.log('\nFound token (binary):', token.substring(0, 50) + '...');
                    return resolve(token);
                }

                // Method 2: The raw might be a base64-encoded protobuf wrapping another base64
                // Try to look for nested base64
                const printable = buf.toString('utf8');
                const nestedB64 = printable.match(/[A-Za-z0-9+/]{40,}={0,2}/g);
                if (nestedB64) {
                    for (const b64 of nestedB64.sort((a, b) => b.length - a.length).slice(0, 5)) {
                        try {
                            const inner = Buffer.from(b64, 'base64');
                            const innerStr = inner.toString('utf8');
                            if (innerStr.includes('ya29.')) {
                                const m = innerStr.match(/ya29\.[A-Za-z0-9\-_.~+/]*/);
                                if (m) {
                                    console.log('\nFound token (nested):', m[0].substring(0, 50) + '...');
                                    return resolve(m[0]);
                                }
                            }
                        } catch { }
                    }
                }
            } catch (e) { console.log('Base64 decode error:', e.message); }

            // Method 3: raw string itself might contain the token (protobuf text format)
            const m = raw.match(/ya29\.[A-Za-z0-9\-_.~+/]*/);
            if (m) { console.log('\nFound token (raw):', m[0].substring(0, 50) + '...'); return resolve(m[0]); }

            reject(new Error('Token not found with any method. Raw: ' + raw.substring(0, 200)));
        });
    });
}

async function grpcWebPost(token, grpcPath) {
    return new Promise((resolve) => {
        const frame = Buffer.alloc(5); // Empty request (just the gRPC-Web frame header)
        frame.writeUInt8(0, 0);
        frame.writeUInt32BE(0, 1);

        const options = {
            hostname: 'cloudcode-pa.googleapis.com',
            path: grpcPath,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/grpc-web+proto',
                'Accept': 'application/grpc-web+proto, application/grpc-web+json',
                'X-Grpc-Web': '1',
                'Content-Length': frame.length,
            },
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const body = Buffer.concat(chunks);
                const readable = body.toString('binary').replace(/[^\x20-\x7e]/g, '.').replace(/\.{4,}/g, '…');
                console.log(`[${res.statusCode}] ${grpcPath}`);
                if (res.headers['grpc-status'] !== undefined) console.log('  grpc-status:', res.headers['grpc-status'], res.headers['grpc-message']);
                console.log('  body:', readable.substring(0, 200));
                resolve({ status: res.statusCode, grpcStatus: res.headers['grpc-status'] });
            });
        });
        req.on('error', e => { console.log(`  [ERROR] ${grpcPath}: ${e.message}`); resolve(null); });
        req.write(frame);
        req.end();
    });
}

async function main() {
    const token = await extractTokenFromDb();
    console.log('\n=== Token extracted, testing gRPC endpoints ===\n');

    const paths = [
        '/google.internal.cloudcode.v1.CloudCodeService/GetModelConfig',
        '/google.cloud.code.v1.CloudCodeService/GetModelConfig',
        '/google.internal.cloud.codeium.v1.CascadeService/GetUserCredits',
        '/exa.google.internal.UsersService/GetUserCredits',
        '/google.internal.cloudcode.v1.CloudCodeService/GetUserCredits',
        '/cloudcode.api.CloudCodeService/GetModelConfig',
    ];

    for (const p of paths) {
        await grpcWebPost(token, p);
    }
}

main().catch(console.error);
