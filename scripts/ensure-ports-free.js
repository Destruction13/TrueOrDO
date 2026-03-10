#!/usr/bin/env node
/* eslint-disable no-console */

const { execSync } = require("child_process");

const DEFAULT_PORTS = [3001, 5173, 5174, 5175];

function toPorts(argv) {
  const arg = argv.find((a) => a.startsWith("--ports="));
  if (!arg) return DEFAULT_PORTS;
  const raw = arg.slice("--ports=".length);
  const ports = raw
    .split(",")
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ports.length ? ports : DEFAULT_PORTS;
}

function execCapture(cmd) {
  try {
    const stdout = execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
    return { ok: true, stdout: stdout || "", stderr: "" };
  } catch (e) {
    // execSync throws an Error that may contain stdout/stderr buffers
    const stdout = (e && e.stdout && e.stdout.toString && e.stdout.toString("utf8")) || "";
    const stderr = (e && e.stderr && e.stderr.toString && e.stderr.toString("utf8")) || (e && e.message) || "";
    return { ok: false, stdout, stderr };
  }
}

function safeExec(cmd) {
  return execCapture(cmd).stdout;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function getListeningPidsWindows(port) {
  // Самый надёжный способ на Windows — Get-NetTCPConnection.
  // netstat иногда неудобно парсить из‑за локали/формата.
  const ps = safeExec(
    `powershell -NoProfile -Command "` +
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
      `Select-Object -ExpandProperty OwningProcess"`
  );

  const psPids = (ps || "")
    .split(/\r?\n/)
    .map((s) => parseInt(String(s).trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (psPids.length) return uniq(psPids);

  // Fallback: netstat
  // Example line:
  //   TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       12345
  const out = safeExec("netstat -ano -p tcp");
  const pids = [];
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTEN")) continue;
    if (!line.includes(`:${port}`)) continue;

    const parts = line.trim().split(/\s+/);
    const pidStr = parts[parts.length - 1];
    const pid = parseInt(pidStr, 10);
    if (Number.isFinite(pid) && pid > 0) pids.push(pid);
  }
  return uniq(pids);
}

function getProcessInfoWindows(pid) {
  // Возвращаем { commandLine, executablePath } если возможно.
  const ps =
    `powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\"; ` +
    `if($p){ $o = [PSCustomObject]@{ CommandLine=$p.CommandLine; ExecutablePath=$p.ExecutablePath }; ` +
    `$o | ConvertTo-Json -Compress } else { '' }"`;

  const out = (safeExec(ps) || "").trim();
  if (!out) return { commandLine: "", executablePath: "" };

  try {
    const obj = JSON.parse(out);
    return {
      commandLine: (obj && obj.CommandLine) || "",
      executablePath: (obj && obj.ExecutablePath) || "",
    };
  } catch {
    // Fallback: best-effort as plain string
    return { commandLine: out, executablePath: "" };
  }
}

function getCommandLineWindows(pid) {
  return (getProcessInfoWindows(pid).commandLine || "").trim();
}

function getProcessNameWindows(pid) {
  const out = safeExec(`tasklist /FI \"PID eq ${pid}\" /FO CSV /NH`);
  // "Image Name","PID",...
  const m = out.match(/^\"([^\"]+)\"/);
  return m ? m[1] : "";
}

function killPidWindows(pid) {
  // /T kills the process tree, which is what we want for nodemon/vite.
  // Возвращаем stdout/stderr и флаг успеха.
  const res = execCapture(`taskkill /PID ${pid} /T /F`);
  return res;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isPortListeningWindows(port) {
  return getListeningPidsWindows(port).length > 0;
}

function ensureFreedWindows(port) {
  // Ждём немного, чтобы ОС успела освободить сокет.
  const start = Date.now();
  while (Date.now() - start < 2500) {
    if (!isPortListeningWindows(port)) return true;
    sleep(100);
  }
  return !isPortListeningWindows(port);
}

function getListeningPidsUnix(port) {
  // Prefer lsof.
  const lsof = safeExec(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`)
    .split(/\r?\n/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (lsof.length) return uniq(lsof);

  // Fallback to ss.
  const ss = safeExec("ss -lptn");
  const pids = [];
  for (const line of ss.split(/\r?\n/)) {
    if (!line.includes(`:${port}`)) continue;
    // ... users:(("node",pid=12345,fd=...))
    const matches = [...line.matchAll(/pid=(\d+)/g)];
    for (const m of matches) {
      const pid = parseInt(m[1], 10);
      if (Number.isFinite(pid) && pid > 0) pids.push(pid);
    }
  }
  return uniq(pids);
}

function getCommUnix(pid) {
  return (safeExec(`ps -p ${pid} -o comm=`) || "").trim();
}

function getCmdlineUnix(pid) {
  return (safeExec(`ps -p ${pid} -o args=`) || "").trim();
}

function killPidUnix(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  // Best-effort: if still alive after short wait, SIGKILL.
  const start = Date.now();
  while (Date.now() - start < 500) {
    try {
      process.kill(pid, 0);
    } catch {
      return; // already dead
    }
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // ignore
  }
}

function shouldKill({ port, processName, cmdline }) {
  const name = (processName || "").toLowerCase();
  const cmd = (cmdline || "").toLowerCase();

  const isNodeProcess = name.includes("node") || cmd.includes("node");
  if (!isNodeProcess) return false;

  // Dev-порты проекта: освобождаем, чтобы `npm run dev` всегда поднимался на 3001/5173.
  // Если CommandLine доступна — дополнительно проверяем, что это похоже на наш dev-процесс.
  if ([3001, 5173, 5174, 5175].includes(port)) {
    if (!cmd) return true; // без CommandLine всё равно освобождаем (типичный зависший dev)

    const looksLikeProject =
      cmd.includes(process.cwd().toLowerCase()) || cmd.includes("trueordo") || cmd.includes("true-or-do");

    if (port === 3001) {
      return looksLikeProject || cmd.includes("nodemon") || cmd.includes("src/index.js") || cmd.includes("server");
    }

    // Vite
    return looksLikeProject || cmd.includes("vite") || cmd.includes("client");
  }

  return true;
}

function main() {
  const ports = toPorts(process.argv.slice(2));
  const platform = process.platform;

  let freed = 0;

  for (const port of ports) {
    let pids = [];

    if (platform === "win32") {
      pids = getListeningPidsWindows(port);
    } else {
      pids = getListeningPidsUnix(port);
    }

    if (!pids.length) continue;

    for (const pid of pids) {
      const processName = platform === "win32" ? getProcessNameWindows(pid) : getCommUnix(pid);
      const cmdline = platform === "win32" ? getCommandLineWindows(pid) : getCmdlineUnix(pid);

      if (!shouldKill({ port, processName, cmdline })) {
        // Для dev-портов не продолжаем молча: иначе дальше всё равно упадёт на EADDRINUSE.
        if ([3001, 5173, 5174, 5175].includes(port)) {
          console.error(
            `[predev] Порт ${port} занят процессом PID=${pid} (${processName}).\n` +
              `Авто-остановка невозможна (процесс не похож на node dev).\n` +
              `Командная строка: ${cmdline || "(не удалось получить)"}\n` +
              `Освободите порт и запустите снова: npm run dev`
          );
          process.exit(1);
        }

        continue;
      }

      console.log(`[predev] Освобождаю порт ${port}: останавливаю PID=${pid} (${processName})`);

      if (platform === "win32") {
        const res = killPidWindows(pid);
        const ok = ensureFreedWindows(port);
        if (!ok) {
          const details = [
            res && res.stdout ? `stdout: ${res.stdout.trim()}` : null,
            res && res.stderr ? `stderr: ${res.stderr.trim()}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          console.error(
            `[predev] Не удалось освободить порт ${port}.\n` +
              `Порт всё ещё занят после попытки taskkill.\n` +
              `Возможные причины: нет прав на завершение процесса или порт держит не dev-процесс.\n` +
              `Решение: запустите терминал от администратора или завершите процесс вручную.\n` +
              `Подсказка:\n` +
              `  netstat -ano | findstr :${port}\n` +
              `  taskkill /PID <PID> /T /F\n` +
              (details ? `\nВывод taskkill:\n${details}\n` : "")
          );
          process.exit(1);
        }

        if (res && res.ok === false) {
          // taskkill мог вернуть ошибку, но порт уже освободился (например, процесс умер сам)
          console.warn(
            `[predev] Предупреждение: taskkill вернул ошибку для PID=${pid}, но порт ${port} освободился.`
          );
        }
      } else { 
        killPidUnix(pid);
      }

      freed += 1;
    }
  }

  if (!freed) {
    console.log("[predev] Порты свободны (ничего останавливать не пришлось)");
  }
}

main();
