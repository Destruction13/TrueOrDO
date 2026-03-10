const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// Cache for the latest fetched quota data
let cachedQuotaData = null;
let lastFetchTime = 0;

// Helper to run powershell commands
function runPowerShell(cmd) {
    return new Promise((resolve) => {
        exec(`powershell -NoProfile -NonInteractive -Command "${cmd}"`, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
            if (error) {
                return resolve(null);
            }
            try {
                const trimmed = stdout.trim();
                if (!trimmed) return resolve(null);
                const data = JSON.parse(trimmed);
                resolve(data);
            } catch (e) {
                resolve(null);
            }
        });
    });
}

// 1. Find Antigravity Process
async function findAntigravityProcess() {
    // We use wmic directly to avoid PowerShell truncation
    const cmd = `wmic process where "name='language_server_windows_x64.exe'" get CommandLine /value`;
    let output = await new Promise((resolve) => {
        exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
            if (error) return resolve("");
            resolve(stdout || "");
        });
    });

    if (!output) return null;

    const csrfMatch = output.match(/--csrf_token=([^\s]+)/);
    const portMatch = output.match(/--extension_server_port=(\d+)/);

    if (csrfMatch && portMatch) {
        // Now we need the PID. Let's run a separate clean wmic for it.
        const pidCmd = `wmic process where "name='language_server_windows_x64.exe'" get ProcessId /value`;
        let pidOutput = await new Promise((resolve) => {
            exec(pidCmd, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
                if (error) return resolve("");
                resolve(stdout || "");
            });
        });

        const pidMatch = pidOutput.match(/ProcessId=(\d+)/);
        if (pidMatch) {
            return {
                pid: parseInt(pidMatch[1], 10),
                csrfToken: csrfMatch[1],
                extensionPort: parseInt(portMatch[1], 10)
            };
        }
    }
    return null;
}

// 2. Find internal active listening ports for that Process
async function findProcessPorts(pid) {
    const cmd = `Get-NetTCPConnection -OwningProcess ${pid} -State Listen | Select-Object LocalPort | ConvertTo-Json`;
    let ports = await runPowerShell(cmd);
    if (!ports) return [];
    if (!Array.isArray(ports)) ports = [ports];
    return ports.map(p => p.LocalPort);
}

// 3. Make HTTP POST to GetUserStatus
function fetchUserStatusFromPort(port, csrfToken) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            metadata: {
                ideName: 'antigravity',
                extensionName: 'antigravity',
                locale: 'en'
            }
        });

        const options = {
            hostname: '127.0.0.1',
            port: port,
            path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'Connect-Protocol-Version': '1',
                'X-Codeium-Csrf-Token': csrfToken
            },
            timeout: 2000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return resolve(null);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });

        req.write(payload);
        req.end();
    });
}

// Main logic to orchestrate updating the quota
async function fetchQuotaDirect() {
    const processInfo = await findAntigravityProcess();
    if (!processInfo) {
        throw new Error("Antigravity language server process not found. Is Antigravity running?");
    }

    const ports = await findProcessPorts(processInfo.pid);
    if (!ports.includes(processInfo.extensionPort)) {
        ports.unshift(processInfo.extensionPort); // Ensure extension port is checked first
    }

    for (const port of ports) {
        const data = await fetchUserStatusFromPort(port, processInfo.csrfToken);
        if (data) {
            return data;
        }
    }

    throw new Error("Could not fetch UserStatus from any ports of the Antigravity process.");
}

// Unified Endpoint
app.get('/api/tokens', async (req, res) => {
    // Rate limit to once every 5 seconds
    if (cachedQuotaData && (Date.now() - lastFetchTime < 5000)) {
        return res.json(cachedQuotaData);
    }

    try {
        const rawQuota = await fetchQuotaDirect();
        cachedQuotaData = rawQuota;
        lastFetchTime = Date.now();
        res.json(rawQuota);
    } catch (err) {
        console.error("Quota fetch error:", err.message);
        res.status(500).json({ error: err.message, cached: cachedQuotaData });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Token Dashboard running on http://localhost:${PORT}`);
});
