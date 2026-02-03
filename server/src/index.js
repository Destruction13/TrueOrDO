require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const { customAlphabet } = require("nanoid");
const { getWheelData, pickWheel1, pickWheel2, pickWheel2ForChaos, pickTruthQuestion, pickChaosTruthQuestion, getRandomShameTitle } = require("./game/wheels");
const { PrismaSessionStore } = require("./auth/session-store");
const { createAuthRouter } = require("./auth/routes");
const { createOAuthRouter } = require("./auth/oauth");
const {
  getDefaultAliasSettings,
  normalizeAliasSettings,
  serializeSettings: serializeAliasSettings,
  generateAliasRoomCode,
  normalizeName: normalizeAliasName,
  makeUniqueName: makeUniqueAliasName,
  buildAliasRoomState,
  stopAliasTimer,
  isAliasPaused,
  buildDeck,
  getNextWord,
  getNextTeamAndExplainer,
  resetExplainerIndexes,
  addWordToHistory,
  getRoundHistory,
  getRoundTeamId,
  clearRoundHistory,
  updateWordInHistory,
  updateCyberLeaderboard,
  getCyberLeaderboard,
  clearCyberLeaderboard,
  aliasTimers,
  aliasPausedRooms,
  aliasPlayerSockets,
  aliasReviewTimers,
  shuffleAliasTeams
} = require("./game/alias");

const {
  isTeamFull,
  findNextFullTeam,
  checkTurnChange
} = require("./game/alias-turn-helpers");

const { checkAndUpdateAliasTurn, getNextFullTeamAndExplainer } = require("./game/alias-check-turn");

const {
  TEAMS: CODENAMES_TEAMS,
  TIMER_SETTINGS: CODENAMES_TIMER_SETTINGS,
  normalizeName: normalizeCodenamesName,
  createRoom: createCodenamesRoom,
  getRoom: getCodenamesRoom,
  joinRoom: joinCodenamesRoom,
  leaveRoom: leaveCodenamesRoom,
  joinTeam: joinCodenamesTeam,
  setRole: setCodenamesRole,
  renameTeam: renameCodenamesTeam,
  startGame: startCodenamesGame,
  giveHint: giveCodenamesHint,
  editHint: editCodenamesHint,
  voteForCard: voteCodenamesCard,
  cancelVote: cancelCodenamesVote,
  revealCard: revealCodenamesCard,
  endTurn: endCodenamesTurn,
  voteEndTurn: voteCodenamesEndTurn,
  cancelEndTurnVote: cancelCodenamesEndTurnVote,
  executeEndTurn: executeCodenamesEndTurn,
  forceEndTurn: forceCodenamesEndTurn,
  switchToOvertime: switchCodenamesOvertime,
  resetGame: resetCodenamesGame,
  toggleRoomOpen: toggleCodenamesRoomOpen,
  shuffleTeams: shuffleCodenamesTeams,
  skipTurn: skipCodenamesTurn,
  kickPlayer: kickCodenamesPlayer,
  updateSettings: updateCodenamesSettings,
  buildRoomState: buildCodenamesRoomState,
  // Pending card selection
  startPendingCard: startCodenamesPendingCard,
  cancelPendingCard: cancelCodenamesPendingCard,
  confirmPendingCard: confirmCodenamesPendingCard,
  setPendingTimer: setCodenamesPendingTimer,
  clearPendingTimer: clearCodenamesPendingTimer,
  // Pause functions
  pauseGame: pauseCodenamesGame,
  resumeGame: resumeCodenamesGame,
  isGamePaused: isCodenamesGamePaused,
  codenamePendingTimers,
  codenamesPlayerSockets,
  codenamesTimers,
  codenamesPausedRooms
} = require("./game/codenames");

const {
  normalizeName: normalizeEmotionalName,
  createRoom: createEmotionalRoom,
  joinRoom: joinEmotionalRoom,
  leaveRoom: leaveEmotionalRoom,
  updateSettings: updateEmotionalSettings,
  resetGame: resetEmotionalGame,
  kickPlayer: kickEmotionalPlayer,

  // Iteration 3
  startGame: startEmotionalGame,
  submitTurn: submitEmotionalTurn,
  skipTurn: skipEmotionalTurn,
  canAdvanceToVote: canAdvanceEmotionalToVote,
  advanceToVote: advanceEmotionalToVote,
  advanceRevealToVote: advanceEmotionalRevealToVote,
  castVote: castEmotionalVote,
  canFinalizeVote: canFinalizeEmotionalVote,
  finalizeRound: finalizeEmotionalRound,
  startNextRound: startEmotionalNextRound,

  buildRoomState: buildEmotionalRoomState
} = require("./game/emotional");

// Codenames timer management - обрабатывает hint -> overtime -> guess -> end
function startCodenamesTimer(roomCode, durationSeconds, io) {
  // Очищаем предыдущий таймер если есть
  stopCodenamesTimer(roomCode);
  
  const intervalId = setInterval(() => {
    const room = getCodenamesRoom(roomCode);
    if (!room || room.status !== "playing") {
      stopCodenamesTimer(roomCode);
      return;
    }
    
    const now = Date.now();
    
    // Проверяем фазу hint - если истекла и подсказки нет, переключаемся в overtime
    if (room.timerPhase === "hint" && room.hintTimerEndsAt && now >= room.hintTimerEndsAt && !room.currentHint) {
      const result = switchCodenamesOvertime(roomCode);
      if (result.room) {
        result.room.players.forEach(p => {
          const socketId = codenamesPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
          }
        });
      }
      return;
    }
    
    // Проверяем общий таймер (guessTimerEndsAt) - если истёк, завершаем ход
    if (room.guessTimerEndsAt && now >= room.guessTimerEndsAt) {
      stopCodenamesTimer(roomCode);
      
      const result = forceCodenamesEndTurn(roomCode);
      if (result.room) {
        result.room.players.forEach(p => {
          const socketId = codenamesPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
          }
        });
        io.to(`codenames:${roomCode}`).emit("codenames:turn:timeout");
        
        // Запускаем новый таймер для следующего хода
        if (result.startTimer && result.timerDuration) {
          startCodenamesTimer(roomCode, result.timerDuration, io);
        }
      }
    }
  }, 500); // Проверяем чаще для более точного переключения
  
  codenamesTimers.set(roomCode, { intervalId });
}

function stopCodenamesTimer(roomCode) {
  const entry = codenamesTimers.get(roomCode);
  if (entry?.intervalId) {
    clearInterval(entry.intervalId);
  }
  codenamesTimers.delete(roomCode);
}

// Emotional timer management - submit -> vote -> results
function startEmotionalTimer(roomCode) {
  stopEmotionalTimer(roomCode);

  const intervalId = setInterval(() => {
    const room = require("./game/emotional").getRoom(roomCode);
    if (!room || room.status !== "playing") {
      stopEmotionalTimer(roomCode);
      return;
    }

    const nowMs = Date.now();

    if (canAdvanceEmotionalToVote(room, nowMs)) {
      advanceEmotionalToVote(room, nowMs);
      room.players.forEach((p) => {
        const socketId = emotionalPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
        }
      });
      return;
    }

    // Reveal: 5 секунд лежат рубашкой вниз, затем раскрываем по одной слева направо каждые 0.5с.
    if (room.phase === "reveal") {
      const startedAt = room.revealStartedAt || nowMs;
      const waitMs = 5000;
      const stepMs = 500;

      const elapsed = nowMs - startedAt;
      const shouldRevealCount = elapsed < waitMs ? 0 : Math.floor((elapsed - waitMs) / stepMs) + 1;

      const table = Array.isArray(room.table) ? room.table : [];
      const targetCount = Math.max(0, Math.min(table.length, shouldRevealCount));

      // Отмечаем раскрытые слоты (сохраняем уже раскрытые)
      if (!room.revealedSlotIds) room.revealedSlotIds = {};
      let changed = false;
      for (let i = 0; i < targetCount; i++) {
        const slotId = table[i]?.slotId;
        if (!slotId) continue;
        if (!room.revealedSlotIds[slotId]) {
          room.revealedSlotIds[slotId] = true;
          changed = true;
        }
      }

      // Когда все раскрыты — переходим в vote
      const allRevealed = table.length > 0 && Object.keys(room.revealedSlotIds).length >= table.length;
      if (allRevealed) {
        // Ставим метку времени один раз, чтобы не прерывать анимацию последнего переворота появлением таймера.
        if (!room.allRevealedAt) {
          room.allRevealedAt = nowMs;
          changed = true;
        }

        // Переходим в vote только через 1 секунду после раскрытия всех карт.
        if (room.allRevealedAt && nowMs - room.allRevealedAt >= 1000) {
          advanceEmotionalRevealToVote(room, nowMs);
          changed = true;
        }
      }

      // Важно: state sync делаем только если что-то изменилось, чтобы не спамить 2 раза в секунду.
      if (changed) {
        room.players.forEach((p) => {
          const socketId = emotionalPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
          }
        });
      }
      return;
    }

    if (canFinalizeEmotionalVote(room, nowMs)) {
      finalizeEmotionalRound(room);
      room.players.forEach((p) => {
        const socketId = emotionalPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
        }
      });
      return;
    }
  }, 500);

  emotionalTimers.set(roomCode, intervalId);
}

function stopEmotionalTimer(roomCode) {
  const intervalId = emotionalTimers.get(roomCode);
  if (intervalId) clearInterval(intervalId);
  emotionalTimers.delete(roomCode);
}

const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS = 20;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const app = express();

// Trust proxy для корректной работы за reverse proxy (Cloudflare, nginx и т.д.)
app.set("trust proxy", 1);

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
app.use(cors({ 
  origin: CLIENT_ORIGIN, 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// Session store
const sessionStore = new PrismaSessionStore(prisma, {
  ttl: 7 * 24 * 60 * 60 * 1000 // 7 дней
});

// Session middleware
const sessionMiddleware = session({
  name: "sid",
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
  }
});

app.use(sessionMiddleware);

// Static files for avatars
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/wheels", (req, res) => {
  res.json(getWheelData());
});

// OAuth routes (Discord, Google)
app.use("/api", createOAuthRouter(prisma));

// Auth routes подключаются после создания io (см. ниже)

// ═══════════════════════════════════════════════════════════════════════════
// STATIC FILES (Client)
// ═══════════════════════════════════════════════════════════════════════════
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    // Не перехватываем API и uploads
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════════════════════════════════════════
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true
  },
  // Быстрое обнаружение disconnect (по умолчанию pingInterval=25000, pingTimeout=20000)
  pingInterval: 5000,  // Пинг каждые 5 секунд
  pingTimeout: 3000    // Таймаут ответа 3 секунды
});

// Auth routes (после создания io)
app.use("/api", createAuthRouter(prisma, sessionStore, io));

// Интеграция session с Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Добавляем userId в socket.data если авторизован
io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.userId) {
    socket.data.userId = session.userId;
  }
  next();
});

const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
const roomTimers = new Map();
const votingTimers = new Map(); // Отдельные таймеры для голосования
const taskAcceptTimers = new Map(); // Таймеры на принятие задания (pending)
const taskAcceptStartTimeouts = new Map(); // roomId -> timeoutId (отложенный старт таймера принятия)
const wheel2SpinMeta = new Map(); // roundId -> { startedAtMs, durationMs }
const wheel1SpinMeta = new Map(); // roundId -> { startedAtMs, durationMs }
const pausedRooms = new Map(); // Состояние паузы для комнат: { isPaused, remainingWhenPaused, roundId }
const playerSockets = new Map();

// Emotional (in-memory)
const emotionalPlayerSockets = new Map(); // playerId -> socketId
const emotionalTimers = new Map(); // roomCode -> intervalId

// Cleanup empty emotional rooms (grace period)
setInterval(() => {
  try {
    require("./game/emotional").cleanupRooms(Date.now());
  } catch (e) {
    console.error("Emotional cleanup error:", e);
  }
}, 60_000);

const VOTING_TIME_SECONDS = 30; // Время на голосование
const TASK_ACCEPT_TIME_SECONDS = 30; // Время на принятие задания

function getDefaultSettings() {
  return {
    timerSeconds: 120,
    disqualifiedCanPlay: false,
    turnIndex: 0
  };
}

function parseSettings(raw) {
  if (!raw) {
    return null;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw;
  }
  return null;
}

function normalizeSettings(raw) {
  const defaults = getDefaultSettings();
  const parsed = parseSettings(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return { ...defaults, ...parsed };
  }
  return defaults;
}

function serializeSettings(raw) {
  return JSON.stringify(normalizeSettings(raw));
}

function normalizeName(name) {
  return String(name || "").trim();
}

function makeUniqueName(baseName, takenNames) {
  if (!takenNames.includes(baseName.toLowerCase())) {
    return baseName;
  }
  let index = 2;
  let candidate = `${baseName} #${index}`;
  while (takenNames.includes(candidate.toLowerCase())) {
    index += 1;
    candidate = `${baseName} #${index}`;
  }
  return candidate;
}

async function generateRoomCode() {
  let code = makeRoomCode();
  let existing = await prisma.room.findUnique({ where: { code } });
  while (existing) {
    code = makeRoomCode();
    existing = await prisma.room.findUnique({ where: { code } });
  }
  return code;
}

function getWheelLookup() {
  const data = getWheelData();
  const byId = new Map();
  data.categories.forEach((category) => {
    byId.set(category.id, category);
  });
  return { data, byId };
}

function serializeRound(round, spin, voteCounts, wheel2Meta) {
  if (!round) {
    return null;
  }
  const { data, byId } = getWheelLookup();
  const wheel1Category = spin && spin.wheel1Result ? byId.get(spin.wheel1Result) : null;
  const wheel2Item = wheel1Category && spin && spin.wheel2Result
    ? wheel1Category.items.find((item) => item.id === spin.wheel2Result)
    : null;
  const wheel1Id = spin?.wheel1Result || null;
  const wheel2Id = spin?.wheel2Result || null;

  return {
    id: round.id,
    wheel2SpinStartedAtMs: wheel2Meta?.startedAtMs ?? null,
    wheel2SpinDurationMs: wheel2Meta?.durationMs ?? null,
    customMode: round.customMode || false,
    customAuthorPlayerId: round.customAuthorPlayerId || null,
    roomId: round.roomId,
    startedAt: round.startedAt,
    endedAt: round.endedAt,
    currentPlayerId: round.currentPlayerId,
    turnPlayerId: round.turnPlayerId,
    mode: round.mode,
    timerSeconds: round.timerSeconds,
    phase: round.phase,
    taskStatus: round.taskStatus,
    taskAcceptedAt: round.taskAcceptedAt,
    result: round.result,
    wheel1Result: wheel1Category ? wheel1Category.title : null,
    wheel1Id,
    wheel2Result: wheel2Item ? wheel2Item.shortTitle || wheel2Item.label : null,
    wheel2Id,
    finalText: spin ? spin.finalText : null,
    voteCounts
  };
}

async function buildRoomState(roomId) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return null;
  }
  const settings = normalizeSettings(room.settings);
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" }
  });
  const round = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { startedAt: "desc" },
    include: { votes: true }
  });

  const spin = round
    ? await prisma.spin.findUnique({ where: { roundId: round.id } })
    : null;
  const voteCounts = round
    ? round.votes.reduce(
        (acc, vote) => {
          acc.total += 1;
          if (vote.vote === "approve") {
            acc.approve += 1;
          }
          if (vote.vote === "report") {
            acc.report += 1;
          }
          return acc;
        },
        { approve: 0, report: 0, total: 0 }
      )
    : { approve: 0, report: 0, total: 0 };

  // Определяем игрока, чей сейчас ход (только активные, не left/disconnected)
  const turnIndex = settings.turnIndex || 0;
  const activePlayers = players.filter((p) => p.connectionStatus === "online");
  const currentTurnPlayerId = activePlayers.length > 0 
    ? activePlayers[turnIndex % activePlayers.length]?.id 
    : null;

  return {
    room: {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      settings,
      currentTurnPlayerId,
      turnIndex
    },
    players,
    round: serializeRound(round, spin, voteCounts, round ? wheel2SpinMeta.get(round.id) : null),
    content: getWheelData()
  };
}

function ensureHost(room, socket) {
  return socket.data.playerId && room.hostId === socket.data.playerId;
}

async function touchPlayer(socket) {
  if (!socket.data.playerId) {
    return;
  }
  try {
    await prisma.player.update({
      where: { id: socket.data.playerId },
      data: { lastSeen: new Date() }
    });
  } catch (error) {
    // Ignore missing player records (e.g., kicked/disconnected).
  }
}

async function emitRoomState(roomId) {
  const state = await buildRoomState(roomId);
  if (!state) {
    return;
  }
  io.to(roomId).emit("player:list", state.players);
  io.to(roomId).emit("room:state", state);
}

function selectNextPlayer(players, startIndex, allowDisqualified) {
  // Фильтруем только активных игроков (online, не left)
  const activePlayers = players.filter((p) => p.connectionStatus !== "left");
  if (!activePlayers.length) {
    return null;
  }
  const total = activePlayers.length;
  const safeIndex = startIndex % total;
  for (let offset = 0; offset < total; offset += 1) {
    const idx = (safeIndex + offset) % total;
    const candidate = activePlayers[idx];
    // Пропускаем disconnected игроков — ход переходит к следующему
    if (candidate.connectionStatus === "disconnected") {
      continue;
    }
    // Status can be "active", "shamed", or "chaos" - all playable
    return { player: candidate, nextIndex: (idx + 1) % total };
  }
  // Если все активные игроки disconnected — возвращаем первого
  return { player: activePlayers[safeIndex], nextIndex: (safeIndex + 1) % total };
}

function stopTimer(roomId) {
  const entry = roomTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    roomTimers.delete(roomId);
  }
  // Также очищаем состояние паузы при остановке таймера
  const wasPaused = pausedRooms.has(roomId);
  pausedRooms.delete(roomId);
  // Уведомляем клиентов о снятии паузы, если игра была на паузе
  if (wasPaused) {
    io.to(roomId).emit("game:paused", { isPaused: false });
  }
}

function pauseTimer(roomId) {
  const entry = roomTimers.get(roomId);
  if (!entry) {
    return false;
  }
  
  // Останавливаем интервал, но сохраняем оставшееся время
  clearInterval(entry.intervalId);
  pausedRooms.set(roomId, {
    isPaused: true,
    remainingWhenPaused: entry.remaining,
    roundId: entry.roundId
  });
  roomTimers.delete(roomId);
  
  // Уведомляем клиентов о паузе
  io.to(roomId).emit("game:paused", { isPaused: true });
  return true;
}

async function resumeTimer(roomId) {
  const pauseState = pausedRooms.get(roomId);
  if (!pauseState || !pauseState.isPaused) {
    return false;
  }
  
  const { remainingWhenPaused, roundId } = pauseState;
  pausedRooms.delete(roomId);
  
  // Уведомляем клиентов о снятии паузы
  io.to(roomId).emit("game:paused", { isPaused: false });
  
  // Запускаем таймер напрямую (без вызова stopTimer, чтобы не сбросить состояние)
  const timerState = { intervalId: null, roundId, remaining: remainingWhenPaused };
  
  io.to(roomId).emit("round:timer_tick", { roundId, remaining: timerState.remaining });
  
  timerState.intervalId = setInterval(async () => {
    timerState.remaining -= 1;
    io.to(roomId).emit("round:timer_tick", { roundId, remaining: timerState.remaining });
    if (timerState.remaining <= 0) {
      await endTimer(roomId, roundId, "timeout");
    }
  }, 1000);
  
  roomTimers.set(roomId, timerState);
  return true;
}

function isRoomPaused(roomId) {
  const pauseState = pausedRooms.get(roomId);
  return pauseState?.isPaused || false;
}

async function startTimer(roomId, roundId, seconds) {
  stopTimer(roomId);
  const timerState = { intervalId: null, roundId, remaining: seconds };
  
  io.to(roomId).emit("round:timer_tick", { roundId, remaining: timerState.remaining });
  
  timerState.intervalId = setInterval(async () => {
    timerState.remaining -= 1;
    io.to(roomId).emit("round:timer_tick", { roundId, remaining: timerState.remaining });
    if (timerState.remaining <= 0) {
      await endTimer(roomId, roundId, "timeout");
    }
  }, 1000);

  roomTimers.set(roomId, timerState);
}

async function endTimer(roomId, roundId, reason) {
  const timer = roomTimers.get(roomId);
  if (timer && timer.roundId !== roundId) {
    return;
  }
  stopTimer(roomId);
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "task") {
    return;
  }
  await prisma.round.update({
    where: { id: roundId },
    data: { phase: "voting" }
  });
  io.to(roomId).emit("round:timer_end", { roundId, reason });
  await emitRoomState(roomId);
  
  // Запускаем таймер голосования
  await startVotingTimer(roomId, roundId);
  
  await maybeFinalizeVote(roomId, roundId);
}

// ═════════════════════════════════════════════════════════════════════════════
// Таймер принятия задания (30 секунд) — чтобы игра не зависала на pending
// ═════════════════════════════════════════════════════════════════════════════

function stopTaskAcceptTimer(roomId) {
  const entry = taskAcceptTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    taskAcceptTimers.delete(roomId);
  }
}

async function startTaskAcceptTimer(roomId, roundId, seconds = TASK_ACCEPT_TIME_SECONDS) {
  // если был запланирован отложенный старт — очищаем
  const pendingStart = taskAcceptStartTimeouts.get(roomId);
  if (pendingStart) {
    clearTimeout(pendingStart);
    taskAcceptStartTimeouts.delete(roomId);
  }

  stopTaskAcceptTimer(roomId);

  const timerState = { intervalId: null, roundId, remaining: seconds };

  io.to(roomId).emit("round:task_accept_tick", {
    roundId,
    remaining: timerState.remaining
  });

  timerState.intervalId = setInterval(async () => {
    timerState.remaining -= 1;
    io.to(roomId).emit("round:task_accept_tick", {
      roundId,
      remaining: timerState.remaining
    });

    if (timerState.remaining <= 0) {
      await endTaskAcceptTimer(roomId, roundId, "timeout");
    }
  }, 1000);

  taskAcceptTimers.set(roomId, timerState);
}

function scheduleTaskAcceptTimer(roomId, roundId, delayMs, seconds = TASK_ACCEPT_TIME_SECONDS) {
  const existing = taskAcceptStartTimeouts.get(roomId);
  if (existing) {
    clearTimeout(existing);
    taskAcceptStartTimeouts.delete(roomId);
  }

  const timeoutId = setTimeout(async () => {
    try {
      await startTaskAcceptTimer(roomId, roundId, seconds);
      await emitRoomState(roomId);
    } catch (e) {
      console.error("[TaskAcceptTimer] Delayed start error:", e);
    }
  }, Math.max(0, delayMs));

  taskAcceptStartTimeouts.set(roomId, timeoutId);
}

async function endTaskAcceptTimer(roomId, roundId, reason) {
  const timer = taskAcceptTimers.get(roomId);
  if (timer && timer.roundId !== roundId) {
    return;
  }

  stopTaskAcceptTimer(roomId);

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "task" || round.taskStatus !== "pending") {
    return;
  }

  // По истечении времени автоматически считаем, что игрок отказался.
  // Это предотвращает зависание всей комнаты.
  if (round.currentPlayerId) {
    await applyStrike(round.currentPlayerId, roomId);
  }

  await prisma.round.update({
    where: { id: roundId },
    data: {
      phase: "complete",
      result: "report",
      endedAt: new Date(),
      taskStatus: "refused"
    }
  });

  // Advance turn to next player
  await advanceTurnIndex(roomId);

  io.to(roomId).emit("round:task_accept_end", { roundId, reason });
  await emitRoomState(roomId);
}

// ═══════════════════════════════════════════════════════════════════════════
// Таймер голосования (30 секунд)
// ═══════════════════════════════════════════════════════════════════════════

function stopVotingTimer(roomId) {
  const entry = votingTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    votingTimers.delete(roomId);
  }
}

async function startVotingTimer(roomId, roundId) {
  stopVotingTimer(roomId);
  let remaining = VOTING_TIME_SECONDS;
  io.to(roomId).emit("voting:timer_tick", { roundId, remaining });
  
  const intervalId = setInterval(async () => {
    remaining -= 1;
    io.to(roomId).emit("voting:timer_tick", { roundId, remaining });
    
    if (remaining <= 0) {
      await endVotingTimer(roomId, roundId);
    }
  }, 1000);

  votingTimers.set(roomId, { intervalId, roundId, remaining });
}

async function endVotingTimer(roomId, roundId) {
  const timer = votingTimers.get(roomId);
  if (timer && timer.roundId !== roundId) {
    return;
  }
  stopVotingTimer(roomId);
  
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "voting") {
    return;
  }
  
  console.log("[Voting Timer] Time expired for round:", roundId);
  
  // Принудительно завершаем голосование по текущим результатам
  await finalizeVoteByTimeout(roomId, roundId);
}

async function finalizeVoteByTimeout(roomId, roundId) {
  console.log("[Vote Timeout] Finalizing vote by timeout for round:", roundId);
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "voting") {
    console.log("[Vote Timeout] Round not in voting phase, skipping");
    return;
  }
  
  const playersCount = await prisma.player.count({ where: { roomId } });
  const eligibleCount = Math.max(playersCount - 1, 0);
  const votes = await prisma.vote.findMany({ where: { roundId } });
  const counts = votes.reduce(
    (acc, vote) => {
      acc.total += 1;
      if (vote.vote === "approve") {
        acc.approve += 1;
      }
      if (vote.vote === "report") {
        acc.report += 1;
      }
      return acc;
    },
    { approve: 0, report: 0, total: 0 }
  );

  console.log("[Vote Timeout] Vote counts:", counts, "Eligible:", eligibleCount);

  // Определяем результат по имеющимся голосам
  const threshold = getMajorityThreshold(eligibleCount);
  let result = "approved"; // По умолчанию засчитываем если нет большинства репортов
  
  if (counts.report >= threshold) {
    result = "report";
  } else if (counts.approve >= threshold) {
    result = "approved";
  } else if (counts.total > 0) {
    // Если есть голоса, но нет большинства — решаем по большинству имеющихся
    if (counts.report > counts.approve) {
      result = "report";
    } else {
      result = "approved"; // При равенстве или большинстве approve — засчитываем
    }
  }
  // Если никто не проголосовал — засчитываем (approved)

  console.log("[Vote Timeout] Finalizing with result:", result);

  await prisma.round.update({
    where: { id: roundId },
    data: { phase: "complete", result, endedAt: new Date() }
  });

  if (result === "report" && round.currentPlayerId) {
    await applyStrike(round.currentPlayerId, roomId);
  }
  
  // Update player progress
  if (round.currentPlayerId) {
    const wasReported = result === "report";
    await updatePlayerProgress(round.currentPlayerId, roomId, wasReported);
    if (result === "approved") {
      await updatePlayerStreak(round.currentPlayerId, roomId, round.mode);
    }
  }

  // Advance turn
  await advanceTurnIndex(roomId);

  io.to(roomId).emit("vote:result", {
    roundId,
    result,
    counts,
    threshold,
    timedOut: true
  });
  await emitRoomState(roomId);
}

function getMajorityThreshold(eligibleCount) {
  return Math.floor(eligibleCount / 2) + 1;
}

async function applyStrike(playerId, roomId) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return;
  }
  
  const newStrikes = player.strikes + 1;
  let newStatus = player.status;
  let shameTitle = player.shameTitle;
  let shameClearProgress = player.shameClearProgress;
  let chaosClearProgress = player.chaosClearProgress;
  
  // Determine new status based on strikes
  if (newStrikes >= 3 && player.status !== "chaos") {
    // 3+ strikes = chaos mode
    newStatus = "chaos";
    chaosClearProgress = 0;
  } else if (newStrikes >= 2 && player.status === "active") {
    // 2 strikes = shamed mode (only if coming from active)
    newStatus = "shamed";
    shameTitle = getRandomShameTitle();
    shameClearProgress = 0;
  }
  
  // Reset shamed progress on any strike while in shamed status
  if (player.status === "shamed") {
    shameClearProgress = 0;
  }
  
  const updated = await prisma.player.update({
    where: { id: playerId },
    data: {
      strikes: newStrikes,
      status: newStatus,
      shameTitle,
      shameClearProgress,
      chaosClearProgress
    }
  });
  
  io.to(roomId).emit("player:strike", { playerId, strikes: updated.strikes });
  io.to(roomId).emit("player:update_status", {
    playerId,
    status: updated.status,
    shameTitle: updated.shameTitle,
    shameClearProgress: updated.shameClearProgress,
    chaosClearProgress: updated.chaosClearProgress
  });
}

/**
 * Update player progress after successful round completion
 * Called when round ends with "approved" result
 */
async function updatePlayerProgress(playerId, roomId, wasReported) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    console.log("[Progress] Player not found:", playerId);
    return;
  }
  
  console.log("[Progress] Updating progress for player:", {
    playerId,
    status: player.status,
    wasReported,
    chaosClearProgress: player.chaosClearProgress,
    shameClearProgress: player.shameClearProgress
  });
  
  let newStatus = player.status;
  let shameTitle = player.shameTitle;
  let shameClearProgress = player.shameClearProgress;
  let chaosClearProgress = player.chaosClearProgress;
  let newStrikes = player.strikes;
  let statusChanged = false;
  
  if (player.status === "chaos") {
    // Chaos player completed a task - increment progress (even if reported, chaos needs to do tasks)
    // Only increment if NOT reported - reported rounds don't count as completed
    if (!wasReported) {
      chaosClearProgress += 1;
      console.log("[Progress] Chaos player progress incremented to:", chaosClearProgress);
      if (chaosClearProgress >= 2) {
        // Clear chaos status - reduce strikes by 1 (worked off one strike)
        chaosClearProgress = 0;
        newStrikes = Math.max(player.strikes - 1, 0);
        // Go to shamed if still has 2+ strikes, otherwise active
        if (newStrikes >= 2) {
          newStatus = "shamed";
          shameTitle = getRandomShameTitle();
          shameClearProgress = 0;
          console.log("[Progress] Chaos -> Shamed transition, strikes now:", newStrikes);
        } else {
          newStatus = "active";
          shameTitle = null;
          console.log("[Progress] Chaos -> Active transition, strikes now:", newStrikes);
        }
        statusChanged = true;
      }
    } else {
      console.log("[Progress] Chaos player was reported, no progress");
    }
  } else if (player.status === "shamed") {
    if (wasReported) {
      // Reset progress on report
      shameClearProgress = 0;
      console.log("[Progress] Shamed player reported, progress reset");
    } else {
      // Success - increment progress
      shameClearProgress += 1;
      console.log("[Progress] Shamed player progress incremented to:", shameClearProgress);
      if (shameClearProgress >= 2) {
        // Clear shamed status - fully reset strikes (player redeemed themselves)
        newStatus = "active";
        shameTitle = null;
        shameClearProgress = 0;
        newStrikes = 0;
        statusChanged = true;
        console.log("[Progress] Shamed -> Active transition, strikes reset to 0");
      }
    }
  } else {
    console.log("[Progress] Player status is", player.status, "- no progress tracking");
  }
  
  if (statusChanged || shameClearProgress !== player.shameClearProgress || chaosClearProgress !== player.chaosClearProgress || newStrikes !== player.strikes) {
    console.log("[Progress] Saving changes:", { newStatus, chaosClearProgress, shameClearProgress, newStrikes });
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        status: newStatus,
        shameTitle,
        shameClearProgress,
        chaosClearProgress,
        strikes: newStrikes
      }
    });
    
    io.to(roomId).emit("player:update_status", {
      playerId,
      status: updated.status,
      shameTitle: updated.shameTitle,
      shameClearProgress: updated.shameClearProgress,
      chaosClearProgress: updated.chaosClearProgress,
      strikes: updated.strikes
    });
  } else {
    console.log("[Progress] No changes to save");
  }
}

/**
 * Update player streak counters after round completion
 * truthStreak increments on truth, resets dareStreak
 * dareStreak increments on dare, resets truthStreak
 */
async function updatePlayerStreak(playerId, roomId, mode) {
  if (!playerId || !mode) return;
  
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return;
  
  let truthStreak = player.truthStreak;
  let dareStreak = player.dareStreak;
  
  if (mode === "truth") {
    truthStreak += 1;
    dareStreak = 0;
  } else if (mode === "dare") {
    dareStreak += 1;
    truthStreak = 0;
  }
  
  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { truthStreak, dareStreak }
  });
  
  io.to(roomId).emit("player:update_streak", {
    playerId,
    truthStreak: updated.truthStreak,
    dareStreak: updated.dareStreak
  });
}

async function advanceTurnIndex(roomId) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return;
  
  const settings = normalizeSettings(room.settings);
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" }
  });
  
  if (players.length === 0) return;
  
  const newTurnIndex = ((settings.turnIndex || 0) + 1) % players.length;
  await prisma.room.update({
    where: { id: roomId },
    data: { settings: serializeSettings({ ...settings, turnIndex: newTurnIndex }) }
  });
  
  console.log("[Turn] Advanced turnIndex to:", newTurnIndex, "Next player:", players[newTurnIndex]?.name);
}

async function maybeFinalizeVote(roomId, roundId) {
  console.log("[Vote] maybeFinalizeVote called for round:", roundId);
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "voting") {
    console.log("[Vote] Round not in voting phase, skipping. Phase:", round?.phase);
    return;
  }
  const playersCount = await prisma.player.count({ where: { roomId } });
  const eligibleCount = Math.max(playersCount - 1, 0);
  const votes = await prisma.vote.findMany({ where: { roundId } });
  const counts = votes.reduce(
    (acc, vote) => {
      acc.total += 1;
      if (vote.vote === "approve") {
        acc.approve += 1;
      }
      if (vote.vote === "report") {
        acc.report += 1;
      }
      return acc;
    },
    { approve: 0, report: 0, total: 0 }
  );

  console.log("[Vote] Vote counts:", counts, "Eligible:", eligibleCount);

  if (eligibleCount === 0) {
    console.log("[Vote] No eligible voters, auto-approving for solo play");
    // Solo play - auto-approve the task
    await prisma.round.update({
      where: { id: roundId },
      data: { phase: "complete", result: "approved", endedAt: new Date() }
    });
    
    // Update player progress for status clearing (solo play counts as success)
    if (round.currentPlayerId) {
      console.log("[Vote] Calling updatePlayerProgress for solo player:", round.currentPlayerId);
      await updatePlayerProgress(round.currentPlayerId, roomId, false);
      // Update streak counters
      await updatePlayerStreak(round.currentPlayerId, roomId, round.mode);
    }
    
    // Advance turn to next player
    await advanceTurnIndex(roomId);
    
    io.to(roomId).emit("vote:result", {
      roundId,
      result: "approved",
      counts,
      threshold: 0
    });
    await emitRoomState(roomId);
    return;
  }

  if (counts.total < eligibleCount) {
    console.log("[Vote] Not all votes in yet:", counts.total, "/", eligibleCount);
    return;
  }

  // Все проголосовали — останавливаем таймер голосования
  stopVotingTimer(roomId);

  const threshold = getMajorityThreshold(eligibleCount);
  let result = "not_approved";
  if (counts.approve >= threshold) {
    result = "approved";
  } else if (counts.report >= threshold) {
    result = "report";
  }

  console.log("[Vote] Finalizing with result:", result, "currentPlayerId:", round.currentPlayerId);

  await prisma.round.update({
    where: { id: roundId },
    data: { phase: "complete", result, endedAt: new Date() }
  });

  if (result === "report" && round.currentPlayerId) {
    await applyStrike(round.currentPlayerId, roomId);
  }
  
  // Update player progress for status clearing
  if (round.currentPlayerId) {
    console.log("[Vote] Calling updatePlayerProgress for:", round.currentPlayerId);
    const wasReported = result === "report";
    await updatePlayerProgress(round.currentPlayerId, roomId, wasReported);
    // Update streak counters (only on approved, not on report)
    if (result === "approved") {
      await updatePlayerStreak(round.currentPlayerId, roomId, round.mode);
    }
  }

  // Advance turn to next player
  await advanceTurnIndex(roomId);

  io.to(roomId).emit("vote:result", {
    roundId,
    result,
    counts,
    threshold
  });
  await emitRoomState(roomId);
}

// Таймеры автовыхода из комнат (5 часов)
const roomAutoLeaveTimers = new Map();
const ROOM_AUTO_LEAVE_MS = 5 * 60 * 60 * 1000; // 5 часов

// Вспомогательная функция для выхода из всех комнат перед присоединением к новой
async function leaveAllRooms(socket) {
  // Выход из Truth or Dare
  if (socket.data.roomId && socket.data.playerId) {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    try {
      await prisma.player.update({
        where: { id: playerId },
        data: { connectionStatus: "left", lastSeen: new Date() }
      });
      playerSockets.delete(playerId);
      socket.leave(roomId);
      
      const state = await buildRoomState(roomId);
      io.to(roomId).emit("player:list", state.players);
      io.to(roomId).emit("player:left", { playerId });
    } catch (e) {
      console.error("leaveAllRooms: Truth or Dare error:", e);
    }
    socket.data.roomId = null;
    socket.data.playerId = null;
  }

  // Выход из Alias
  if (socket.data.aliasRoomId && socket.data.aliasPlayerId) {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    try {
      const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
      const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
      const oldTeamId = player?.teamId;

      // Передача хоста
      if (room && room.hostId === playerId) {
        const remainingPlayers = await prisma.aliasPlayer.findMany({
          where: { roomId, id: { not: playerId } },
          orderBy: { joinedAt: "asc" }
        });
        const newHost = remainingPlayers[0];
        if (newHost) {
          await prisma.aliasRoom.update({
            where: { id: roomId },
            data: { hostId: newHost.id }
          });
          io.to(`alias:${roomId}`).emit("alias:host:changed", { newHostId: newHost.id, newHostName: newHost.name });
        }
      }

      await prisma.aliasPlayer.delete({ where: { id: playerId } }).catch(() => {});
      
      if (oldTeamId) {
        const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
        if (remaining === 0) {
          await prisma.aliasTeam.delete({ where: { id: oldTeamId } }).catch(() => {});
        }
      }

      socket.leave(`alias:${roomId}`);
      aliasPlayerSockets.delete(playerId);
      
      const state = await buildAliasRoomState(prisma, roomId);
      io.to(`alias:${roomId}`).emit("alias:state:sync", state);
    } catch (e) {
      console.error("leaveAllRooms: Alias error:", e);
    }
    socket.data.aliasRoomId = null;
    socket.data.aliasPlayerId = null;
  }

  // Выход из Emotional
  if (socket.data.emotionalRoomCode && socket.data.emotionalPlayerId) {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;
    try {
      const result = leaveEmotionalRoom(roomCode, playerId);
      socket.leave(`emotional:${roomCode}`);
      emotionalPlayerSockets.delete(playerId);

      if (!result.deleted && result.room) {
        result.room.players.forEach(p => {
          const socketId = emotionalPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
          }
        });
      }
    } catch (e) {
      console.error("leaveAllRooms: Emotional error:", e);
    }
    socket.data.emotionalRoomCode = null;
    socket.data.emotionalPlayerId = null;
  }

  // Выход из Codenames
  if (socket.data.codenamesRoomCode && socket.data.codenamesPlayerId) {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    try {
      const result = leaveCodenamesRoom(roomCode, playerId);
      socket.leave(`codenames:${roomCode}`);
      codenamesPlayerSockets.delete(playerId);
      
      if (!result.deleted && result.room) {
        result.room.players.forEach(p => {
          const socketId = codenamesPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
          }
        });
      }
    } catch (e) {
      console.error("leaveAllRooms: Codenames error:", e);
    }
    socket.data.codenamesRoomCode = null;
    socket.data.codenamesPlayerId = null;
  }

  // Очищаем таймер автовыхода
  const timerId = roomAutoLeaveTimers.get(socket.id);
  if (timerId) {
    clearTimeout(timerId);
    roomAutoLeaveTimers.delete(socket.id);
  }
}

// Устанавливает таймер автовыхода из комнаты через 5 часов
function setAutoLeaveTimer(socket) {
  // Очищаем предыдущий таймер, если есть
  const existingTimerId = roomAutoLeaveTimers.get(socket.id);
  if (existingTimerId) {
    clearTimeout(existingTimerId);
  }

  const timerId = setTimeout(async () => {
    console.log(`Auto-leaving rooms for socket ${socket.id} after 5 hours`);
    await leaveAllRooms(socket);
    socket.emit("auto:leave", { reason: "timeout", message: "Вы были автоматически отключены после 5 часов бездействия" });
    roomAutoLeaveTimers.delete(socket.id);
  }, ROOM_AUTO_LEAVE_MS);

  roomAutoLeaveTimers.set(socket.id, timerId);
}

io.on("connection", (socket) => {
  socket.on("room:create", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const visitorId = payload?.visitorId || null;
    if (!name) {
      if (ack) {
        ack({ ok: false, error: "Name required" });
      }
      return;
    }

    // Выходим из всех предыдущих комнат перед созданием новой
    await leaveAllRooms(socket);
    
    // Получаем avatarUrl из payload или из сессии пользователя
    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }
    
    const code = await generateRoomCode();
    const settings = getDefaultSettings();

    const room = await prisma.room.create({
      data: {
        code,
        hostId: "pending",
        settings: serializeSettings(settings)
      }
    });
    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        name,
        avatarUrl,
        visitorId
      }
    });
    await prisma.room.update({
      where: { id: room.id },
      data: { hostId: player.id }
    });

    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    playerSockets.set(player.id, socket.id);
    socket.join(room.id);
    setAutoLeaveTimer(socket);

    const state = await buildRoomState(room.id);
    io.to(room.id).emit("player:list", state.players);
    io.to(room.id).emit("room:state", state);

    if (ack) {
      ack({ ok: true, state, playerId: player.id });
    }
  });

  socket.on("room:join", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const code = normalizeName(payload?.code).toUpperCase();
    const visitorId = payload?.visitorId || null;
    if (!name || !code) {
      if (ack) {
        ack({ ok: false, error: "Name and code required" });
      }
      return;
    }

    // Выходим из всех предыдущих комнат перед присоединением
    await leaveAllRooms(socket);

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      if (ack) {
        ack({ ok: false, error: "Room not found" });
      }
      return;
    }

    // Проверяем бан-лист
    const settings = normalizeSettings(room.settings);
    const bannedVisitorIds = settings.bannedVisitorIds || [];
    if (visitorId && bannedVisitorIds.includes(visitorId)) {
      if (ack) {
        ack({ ok: false, error: "banned", message: "Вы были исключены из этой комнаты организатором" });
      }
      return;
    }

    const players = await prisma.player.findMany({
      where: { roomId: room.id }
    });
    
    // Проверяем, есть ли игрок с таким именем со статусом disconnected (реконнект)
    const disconnectedPlayer = players.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p.connectionStatus === "disconnected"
    );
    
    if (disconnectedPlayer) {
      // Реконнект — восстанавливаем игрока
      const player = await prisma.player.update({
        where: { id: disconnectedPlayer.id },
        data: { 
          connectionStatus: "online",
          lastSeen: new Date()
        }
      });
      
      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      playerSockets.set(player.id, socket.id);
      socket.join(room.id);
      setAutoLeaveTimer(socket);
      
      // Уведомляем всех о реконнекте
      io.to(room.id).emit("player:connection_status", {
        playerId: player.id,
        connectionStatus: "online",
        playerName: player.name
      });
      
      const state = await buildRoomState(room.id);
      io.to(room.id).emit("player:list", state.players);
      io.to(room.id).emit("room:state", state);

      // Форсируем актуальные значения таймеров только для переподключившегося клиента
      const activeRound = state?.round;
      if (activeRound?.id) {
        const timer = roomTimers.get(room.id);
        if (timer && timer.roundId === activeRound.id) {
          socket.emit("round:timer_tick", { roundId: timer.roundId, remaining: timer.remaining });
        }
        const votingTimer = votingTimers.get(room.id);
        if (votingTimer && votingTimer.roundId === activeRound.id) {
          socket.emit("voting:timer_tick", { roundId: votingTimer.roundId, remaining: votingTimer.remaining });
        }
        const acceptTimer = taskAcceptTimers.get(room.id);
        if (acceptTimer && acceptTimer.roundId === activeRound.id) {
          socket.emit("round:task_accept_tick", { roundId: acceptTimer.roundId, remaining: acceptTimer.remaining });
        }
      }
      
      if (ack) {
        ack({ ok: true, state, playerId: player.id, reconnected: true });
      }
      return;
    }
    
    // Считаем только активных игроков (не left) для проверки лимита
    const activePlayersCount = players.filter((p) => p.connectionStatus !== "left").length;
    if (activePlayersCount >= MAX_PLAYERS) {
      if (ack) {
        ack({ ok: false, error: "Room is full" });
      }
      return;
    }

    // Имена занятые только активными игроками (не left)
    const takenNames = players
      .filter((p) => p.connectionStatus !== "left")
      .map((player) => player.name.toLowerCase());
    const finalName = makeUniqueName(name, takenNames);

    // Получаем avatarUrl из payload или из сессии пользователя
    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }

    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        name: finalName,
        avatarUrl,
        visitorId,
        connectionStatus: "online"
      }
    });

    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    playerSockets.set(player.id, socket.id);
    socket.join(room.id);
    setAutoLeaveTimer(socket);

    const state = await buildRoomState(room.id);
    io.to(room.id).emit("player:list", state.players);
    io.to(room.id).emit("room:state", state);

    if (ack) {
      ack({ ok: true, state, playerId: player.id });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // room:rejoin — Восстановление сессии после F5/переподключения
  // ───────────────────────────────────────────────────────────────────────────
  socket.on("room:rejoin", async (payload, ack) => {
    const { playerId, roomCode } = payload || {};
    
    if (!playerId || !roomCode) {
      console.log("[Rejoin] Missing playerId or roomCode");
      if (ack) {
        ack({ ok: false, error: "Missing playerId or roomCode" });
      }
      return;
    }

    try {
      // Находим комнату по коду
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) {
        console.log("[Rejoin] Room not found:", roomCode);
        if (ack) {
          ack({ ok: false, error: "Room not found" });
        }
        return;
      }

      // Находим игрока
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player) {
        console.log("[Rejoin] Player not found:", playerId);
        if (ack) {
          ack({ ok: false, error: "Player not found" });
        }
        return;
      }

      // Проверяем, что игрок принадлежит этой комнате
      if (player.roomId !== room.id) {
        console.log("[Rejoin] Player does not belong to room:", playerId, room.id);
        if (ack) {
          ack({ ok: false, error: "Player not in this room" });
        }
        return;
      }

      // Проверяем, что игрок не покинул комнату (left)
      if (player.connectionStatus === "left") {
        console.log("[Rejoin] Player has left the room:", playerId);
        if (ack) {
          ack({ ok: false, error: "Player has left the room" });
        }
        return;
      }

      // Если у игрока уже есть активный сокет — отключаем старый (две вкладки)
      const existingSocketId = playerSockets.get(playerId);
      if (existingSocketId && existingSocketId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          console.log("[Rejoin] Disconnecting old socket for player:", playerId);
          existingSocket.data.roomId = null;
          existingSocket.data.playerId = null;
          existingSocket.emit("session:replaced", { message: "Session replaced by another tab" });
          existingSocket.disconnect(true);
        }
      }

      // Обновляем статус игрока на online
      await prisma.player.update({
        where: { id: playerId },
        data: { 
          connectionStatus: "online",
          lastSeen: new Date()
        }
      });

      // Привязываем сокет к комнате и игроку
      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      playerSockets.set(player.id, socket.id);
      socket.join(room.id);

      console.log("[Rejoin] Success:", player.name, "->", room.code);

      // Уведомляем всех о возвращении игрока
      io.to(room.id).emit("player:connection_status", {
        playerId: player.id,
        connectionStatus: "online",
        playerName: player.name
      });

      // Отправляем актуальное состояние комнаты
      const state = await buildRoomState(room.id);
      io.to(room.id).emit("player:list", state.players);
      io.to(room.id).emit("room:state", state);

      // Форсируем актуальные значения таймеров для этого переподключившегося клиента
      const activeRound = state?.round;
      if (activeRound?.id) {
        const timer = roomTimers.get(room.id);
        if (timer && timer.roundId === activeRound.id) {
          socket.emit("round:timer_tick", { roundId: timer.roundId, remaining: timer.remaining });
        }
        const votingTimer = votingTimers.get(room.id);
        if (votingTimer && votingTimer.roundId === activeRound.id) {
          socket.emit("voting:timer_tick", { roundId: votingTimer.roundId, remaining: votingTimer.remaining });
        }
        const acceptTimer = taskAcceptTimers.get(room.id);
        if (acceptTimer && acceptTimer.roundId === activeRound.id) {
          socket.emit("round:task_accept_tick", { roundId: acceptTimer.roundId, remaining: acceptTimer.remaining });
        }
      }

      if (ack) {
        ack({ ok: true, state, playerId: player.id, playerName: player.name });
      }
    } catch (error) {
      console.error("[Rejoin] Error:", error);
      if (ack) {
        ack({ ok: false, error: "Rejoin failed" });
      }
    }
  });

  socket.on("room:state", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const state = await buildRoomState(socket.data.roomId);
    if (ack) {
      ack({ ok: true, state });
    } else if (state) {
      socket.emit("room:state", state);
    }
  });

  socket.on("round:start", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }

    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    let settings = normalizeSettings(room.settings);
    
    // Определяем, чей сейчас ход (currentTurnPlayer)
    const players = await prisma.player.findMany({
      where: { roomId: room.id },
      orderBy: { joinedAt: "asc" }
    });
    if (!players.length) {
      if (ack) {
        ack({ ok: false, error: "No players" });
      }
      return;
    }

    const currentTurnIndex = settings.turnIndex || 0;
    const currentTurnPlayerId = players[currentTurnIndex % players.length]?.id;
    
    // Проверяем права: только хост или игрок, чей ход, может начать раунд
    const isHost = ensureHost(room, socket);
    const isCurrentTurnPlayer = socket.data.playerId === currentTurnPlayerId;
    
    if (!isHost && !isCurrentTurnPlayer) {
      if (ack) {
        ack({ ok: false, error: "Not your turn" });
      }
      return;
    }

    const activeRound = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (activeRound) {
      if (ack) {
        ack({ ok: false, error: "Round already active" });
      }
      return;
    }

    // targetPlayerId - это игрок, которому задается вопрос/действие
    // currentTurnPlayerId - это игрок, чей ход (он выбирает targetPlayer)
    let targetPlayerId = payload?.targetPlayerId || null;
    
    if (!targetPlayerId) {
      if (ack) {
        ack({ ok: false, error: "Target player required" });
      }
      return;
    }
    
    const targetPlayer = players.find((player) => player.id === targetPlayerId);
    if (!targetPlayer) {
      if (ack) {
        ack({ ok: false, error: "Target player not found" });
      }
      return;
    }

    const wantsCustom = Boolean(payload?.customMode);

    // В кастомном режиме нельзя выбирать игрока в ХАОС
    if (wantsCustom && targetPlayer.status === "chaos") {
      if (ack) {
        ack({ ok: false, error: "Нельзя выбрать ХАОС в режиме своего задания" });
      }
      return;
    }

    const round = await prisma.round.create({
      data: {
        roomId: room.id,
        currentPlayerId: targetPlayerId, // Тот, кто выполняет задание
        turnPlayerId: currentTurnPlayerId, // Тот, чей ход (выбирает)
        timerSeconds: settings.timerSeconds || 120,
        phase: "mode",
        taskStatus: "pending",
        taskAcceptedAt: null,
        customMode: wantsCustom,
        customAuthorPlayerId: wantsCustom ? currentTurnPlayerId : null
      }
    });

    io.to(room.id).emit("round:start", {
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      turnPlayerId: round.turnPlayerId,
      timerSeconds: round.timerSeconds
    });
    await emitRoomState(room.id);

    // На всякий случай сбрасываем старый таймер принятия (раунд только создан)
    stopTaskAcceptTimer(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:mode", async (payload, ack) => {
    await touchPlayer(socket);
    let mode = payload?.mode;
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const round = await prisma.round.findFirst({
      where: { roomId: socket.data.roomId, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round) {
      if (ack) {
        ack({ ok: false, error: "Round not found" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    
    // Check if current player is in chaos mode
    const currentPlayer = round.currentPlayerId 
      ? await prisma.player.findUnique({ where: { id: round.currentPlayerId } })
      : null;
    const isChaosModePlayer = currentPlayer?.status === "chaos";
    
    // For chaos players, server decides the mode (50/50)
    let forcedMode = null;
    if (isChaosModePlayer) {
      // Chaos mode: 50/50 random, but still respecting streak limits
      let availableModes = [];
      if (currentPlayer.truthStreak < 2) availableModes.push("truth");
      if (currentPlayer.dareStreak < 2) availableModes.push("dare");
      
      if (availableModes.length === 0) {
        // Edge case: both at max, reset and allow both
        availableModes = ["truth", "dare"];
      }
      
      forcedMode = availableModes[Math.floor(Math.random() * availableModes.length)];
      mode = forcedMode;
      // Emit forced mode notification
      io.to(room.id).emit("round:mode_forced", {
        roundId: round.id,
        mode: forcedMode,
        currentPlayerId: round.currentPlayerId
      });
    } else {
      // Normal player - validate permissions
      if (
        socket.data.playerId !== round.currentPlayerId &&
        (!room || !ensureHost(room, socket))
      ) {
        if (ack) {
          ack({ ok: false, error: "Not allowed" });
        }
        return;
      }
      if (mode !== "truth" && mode !== "dare") {
        if (ack) {
          ack({ ok: false, error: "Invalid mode" });
        }
        return;
      }
      
      // Validate streak limits for normal players
      if (currentPlayer) {
        if (mode === "truth" && currentPlayer.truthStreak >= 2) {
          if (ack) {
            ack({ ok: false, error: "Cannot choose truth 3 times in a row" });
          }
          return;
        }
        if (mode === "dare" && currentPlayer.dareStreak >= 2) {
          if (ack) {
            ack({ ok: false, error: "Cannot choose dare 3 times in a row" });
          }
          return;
        }
      }
    }
    
    // Кастомный режим: после выбора Правда/Действие не выдаём задание из базы, а ждём решения автора (взять из базы / задать самому)
    if (round.customMode) {
      await prisma.round.update({
        where: { id: round.id },
        data: {
          mode,
          phase: "custom_confirm",
          taskStatus: "pending",
          taskAcceptedAt: null
        }
      });

      await emitRoomState(room.id);
      if (ack) {
        ack({ ok: true, customConfirm: true });
      }
      return;
    }

    if (mode === "truth") {
      // For chaos players, use chaos truth questions
      const selection = isChaosModePlayer ? pickChaosTruthQuestion() : pickTruthQuestion();
      if (!selection) {
        if (ack) {
          ack({ ok: false, error: "Truth questions missing" });
        }
        return;
      }
      const finalText = selection.question;
      await prisma.spin.upsert({
        where: { roundId: round.id },
        create: {
          roundId: round.id,
          wheel1Result: "",
          wheel2Result: "",
          finalText
        },
        update: {
          wheel1Result: "",
          wheel2Result: "",
          finalText
        }
      });
      await prisma.round.update({
        where: { id: round.id },
        data: {
          mode,
          phase: "task",
          taskStatus: "pending",
          taskAcceptedAt: null
        }
      });

      // Запускаем таймер ожидания принятия задания
      await startTaskAcceptTimer(room.id, round.id);

      io.to(room.id).emit("spin:final", {
        roundId: round.id,
        finalText,
        mode,
        forcedMode: forcedMode || undefined
      });
      await emitRoomState(room.id);

      if (ack) {
        ack({ ok: true });
      }
      return;
    }

    await prisma.round.update({
      where: { id: round.id },
      data: { mode, phase: "wheel1" }
    });
    io.to(room.id).emit("round:start", {
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      mode,
      forcedMode: forcedMode || undefined
    });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("spin:wheel1_start", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "wheel1") {
      if (ack) {
        ack({ ok: false, error: "Wheel1 not ready" });
      }
      return;
    }

    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }

    const { category, index } = pickWheel1();
    const startedAtMs = Date.now();
    const durationMs = 4200;
    wheel1SpinMeta.set(round.id, { startedAtMs, durationMs });

    io.to(room.id).emit("spin:wheel1_start", {
      roundId: round.id,
      startedAtMs,
      durationMs,
      categoryId: category.id,
      index
    });

    await prisma.spin.upsert({
      where: { roundId: round.id },
      create: {
        roundId: round.id,
        wheel1Result: category.id,
        wheel2Result: "",
        finalText: ""
      },
      update: {
        wheel1Result: category.id
      }
    });

    await prisma.round.update({
      where: { id: round.id },
      data: { phase: "wheel2" }
    });

    io.to(room.id).emit("spin:wheel1_result", {
      roundId: round.id,
      categoryId: category.id,
      categoryTitle: category.title,
      index
    });

    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("spin:wheel2_start", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "wheel2") {
      if (ack) {
        ack({ ok: false, error: "Wheel2 not ready" });
      }
      return;
    }

    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }

    const spin = await prisma.spin.findUnique({ where: { roundId: round.id } });
    if (!spin || !spin.wheel1Result) {
      if (ack) {
        ack({ ok: false, error: "Wheel1 missing" });
      }
      return;
    }

    // Check if current player is in chaos mode
    const currentPlayer = round.currentPlayerId 
      ? await prisma.player.findUnique({ where: { id: round.currentPlayerId } })
      : null;
    const isChaosModePlayer = currentPlayer?.status === "chaos";

    // Use chaos wheel selection for chaos players

    let selection;
    let reelItems = null;
    
    if (isChaosModePlayer) {
      selection = pickWheel2ForChaos(spin.wheel1Result);
      if (selection) {
        reelItems = selection.reelItems;
      }
    } else {
      selection = pickWheel2(spin.wheel1Result);
    }
    
    if (!selection) {
      if (ack) {
        ack({ ok: false, error: "Wheel2 data missing" });
      }
      return;
    }

    const startedAtMs = Date.now();
    const durationMs = 5200;
    wheel2SpinMeta.set(round.id, { startedAtMs, durationMs });

    io.to(room.id).emit("spin:wheel2_start", {
      roundId: round.id,
      startedAtMs,
      durationMs,
      itemId: selection.item.id,
      index: selection.index,
      reelItems: reelItems || undefined
    });

    const finalText = `${selection.category.title}: ${selection.item.text}`;
    await prisma.spin.update({
      where: { roundId: round.id },
      data: {
        wheel2Result: selection.item.id,
        finalText
      }
    });

    await prisma.round.update({
      where: { id: round.id },
      data: {
        phase: "task",
        taskStatus: "pending",
        taskAcceptedAt: null
      }
    });

    // Запускаем таймер принятия задания НЕ сразу, а после остановки ленты сценариев,
    // чтобы у всех было ~30 секунд именно с момента появления окна принятия.
    const acceptDelayMs = durationMs + 1200;
    scheduleTaskAcceptTimer(room.id, round.id, acceptDelayMs);

    // Build wheel2_result with reelItems for chaos players
    const wheel2ResultPayload = {
      roundId: round.id,
      itemId: selection.item.id,
      itemLabel: selection.item.shortTitle || selection.item.label,
      itemText: selection.item.text,
      index: selection.index
    };
    
    // Include reelItems for chaos players so client can render the correct reel
    if (reelItems) {
      wheel2ResultPayload.reelItems = reelItems;
    }

    // (meta) дублируем параметры анимации, чтобы клиенты могли синхронизироваться даже при пропущенных событиях
    const meta = wheel2SpinMeta.get(round.id);
    if (meta) {
      wheel2ResultPayload.startedAtMs = meta.startedAtMs;
      wheel2ResultPayload.durationMs = meta.durationMs;
    }
    
    io.to(room.id).emit("spin:wheel2_result", wheel2ResultPayload);
    io.to(room.id).emit("spin:final", {
      roundId: round.id,
      finalText,
      categoryTitle: selection.category.title,
      itemText: selection.item.text
    });

    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:custom_decision", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room?.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });

    if (!room || !round || !round.customMode || round.phase !== "custom_confirm") {
      if (ack) ack({ ok: false, error: "Custom confirm not active" });
      return;
    }

    // Решение принимает только автор (turnPlayerId)
    if (!socket.data.playerId || socket.data.playerId !== round.turnPlayerId) {
      if (ack) ack({ ok: false, error: "Not allowed" });
      return;
    }

    const decision = payload?.decision; // "custom" | "base"
    if (decision !== "custom" && decision !== "base") {
      if (ack) ack({ ok: false, error: "Invalid decision" });
      return;
    }

    // на всякий случай останавливаем/отменяем таймер принятия
    stopTaskAcceptTimer(room.id);
    const pendingStart = taskAcceptStartTimeouts.get(room.id);
    if (pendingStart) {
      clearTimeout(pendingStart);
      taskAcceptStartTimeouts.delete(room.id);
    }

    if (decision === "base") {
      // Возврат к стандартному режиму (в базе)
      await prisma.round.update({
        where: { id: round.id },
        data: {
          customMode: false,
          customAuthorPlayerId: null,
          phase: round.mode === "dare" ? "wheel1" : "task",
          taskStatus: "pending",
          taskAcceptedAt: null
        }
      });

      if (round.mode === "truth") {
        const selection = pickTruthQuestion();
        if (!selection) {
          if (ack) ack({ ok: false, error: "Truth questions missing" });
          return;
        }
        const finalText = selection.question;
        await prisma.spin.upsert({
          where: { roundId: round.id },
          create: { roundId: round.id, wheel1Result: "", wheel2Result: "", finalText },
          update: { wheel1Result: "", wheel2Result: "", finalText }
        });
        await prisma.round.update({
          where: { id: round.id },
          data: { phase: "task", taskStatus: "pending", taskAcceptedAt: null }
        });
        await startTaskAcceptTimer(room.id, round.id);
        io.to(room.id).emit("spin:final", { roundId: round.id, finalText, mode: "truth" });
        await emitRoomState(room.id);
        if (ack) ack({ ok: true, switchedToBase: true });
        return;
      }

      // Dare: остаёмся в wheel1, дальше всё как обычно (крутит выполняющий)
      await emitRoomState(room.id);
      if (ack) ack({ ok: true, switchedToBase: true });
      return;
    }

    // decision === "custom": запускаем выполнение сразу (без принятия)
    const author = round.customAuthorPlayerId
      ? await prisma.player.findUnique({ where: { id: round.customAuthorPlayerId } })
      : null;
    const authorName = author?.name || "игрок";
    const finalText = `Задание от игрока ${authorName}.`;

    await prisma.spin.upsert({
      where: { roundId: round.id },
      create: {
        roundId: round.id,
        wheel1Result: "",
        wheel2Result: "",
        finalText
      },
      update: {
        wheel1Result: "",
        wheel2Result: "",
        finalText
      }
    });

    const acceptedAt = new Date();
    await prisma.round.update({
      where: { id: round.id },
      data: {
        phase: "task",
        taskStatus: "accepted",
        taskAcceptedAt: acceptedAt
      }
    });

    await startTimer(room.id, round.id, round.timerSeconds || 120);

    io.to(room.id).emit("spin:final", {
      roundId: round.id,
      finalText,
      mode: round.mode
    });

    io.to(room.id).emit("round:task_accepted", {
      roomId: room.id,
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      taskAcceptedAt: acceptedAt
    });

    await emitRoomState(room.id);
    if (ack) ack({ ok: true });
  });

  socket.on("round:task_accept", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });

    // если таймер принятия был запланирован на будущее (Dare + лента), а игрок успел принять раньше старта — отменяем план
    const pendingStart = taskAcceptStartTimeouts.get(room?.id);
    if (pendingStart) {
      clearTimeout(pendingStart);
      taskAcceptStartTimeouts.delete(room.id);
    }

    const round = await prisma.round.findFirst({
      where: { roomId: room?.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Round not in task" });
      }
      return;
    }
    if (!socket.data.playerId || socket.data.playerId !== round.currentPlayerId) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }
    if (round.taskStatus && round.taskStatus !== "pending") {
      if (ack) {
        ack({ ok: true, status: round.taskStatus });
      }
      return;
    }

    const acceptedAt = new Date();

    // Останавливаем таймер принятия (если был)
    stopTaskAcceptTimer(room.id);

    await prisma.round.update({
      where: { id: round.id },
      data: {
        taskStatus: "accepted",
        taskAcceptedAt: acceptedAt
      }
    });

    const timerSeconds = round.timerSeconds || 120;
    await startTimer(room.id, round.id, timerSeconds);

    io.to(room.id).emit("round:task_accepted", {
      roomId: room.id,
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      taskAcceptedAt: acceptedAt
    });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:done", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Round not in task" });
      }
      return;
    }
    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }
    await prisma.round.update({
      where: { id: round.id },
      data: { taskStatus: "done" }
    });
    await endTimer(room.id, round.id, "done");
    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:refuse", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Round not in task" });
      }
      return;
    }
    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }
    stopTimer(room.id);
    stopTaskAcceptTimer(room.id);
    if (round.currentPlayerId) {
      await applyStrike(round.currentPlayerId, room.id);
    }
    await prisma.round.update({
      where: { id: round.id },
      data: {
        phase: "complete",
        result: "report",
        endedAt: new Date(),
        taskStatus: "refused"
      }
    });
    
    // Advance turn to next player
    await advanceTurnIndex(room.id);
    
    io.to(room.id).emit("round:refuse", { roundId: round.id });
    await emitRoomState(room.id);
    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("vote:cast", async (payload, ack) => {
    await touchPlayer(socket);
    const vote = payload?.vote;
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const round = await prisma.round.findFirst({
      where: { roomId: socket.data.roomId, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "voting") {
      if (ack) {
        ack({ ok: false, error: "Voting not active" });
      }
      return;
    }
    if (!socket.data.playerId || socket.data.playerId === round.currentPlayerId) {
      if (ack) {
        ack({ ok: false, error: "Current player cannot vote" });
      }
      return;
    }
    if (vote !== "approve" && vote !== "report") {
      if (ack) {
        ack({ ok: false, error: "Invalid vote" });
      }
      return;
    }

    try {
      await prisma.vote.create({
        data: {
          roundId: round.id,
          voterPlayerId: socket.data.playerId,
          vote
        }
      });
    } catch (error) {
      if (ack) {
        ack({ ok: false, error: "Already voted" });
      }
      return;
    }

    const votes = await prisma.vote.findMany({ where: { roundId: round.id } });
    const counts = votes.reduce(
      (acc, entry) => {
        acc.total += 1;
        if (entry.vote === "approve") {
          acc.approve += 1;
        }
        if (entry.vote === "report") {
          acc.report += 1;
        }
        return acc;
      },
      { approve: 0, report: 0, total: 0 }
    );
    const playersCount = await prisma.player.count({ where: { roomId: socket.data.roomId } });
    const eligibleCount = Math.max(playersCount - 1, 0);

    io.to(socket.data.roomId).emit("vote:update", {
      roundId: round.id,
      counts,
      eligibleCount
    });

    await maybeFinalizeVote(socket.data.roomId, round.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // room:leave — Игрок добровольно покидает комнату
  // ───────────────────────────────────────────────────────────────────────────
  socket.on("room:leave", async (payload, ack) => {
    if (!socket.data.roomId || !socket.data.playerId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }

    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;

    try {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        if (ack) {
          ack({ ok: false, error: "Room not found" });
        }
        return;
      }

      // Если игрок сейчас выполняет задание — завершаем раунд
      const activeRound = await prisma.round.findFirst({
        where: { roomId, endedAt: null },
        orderBy: { startedAt: "desc" }
      });
      if (activeRound && activeRound.currentPlayerId === playerId) {
        stopTimer(roomId);
        await prisma.round.update({
          where: { id: activeRound.id },
          data: { phase: "complete", result: "skipped", endedAt: new Date() }
        });
        io.to(roomId).emit("admin:skip_round", { roundId: activeRound.id });
      }

      // Ставим статус "left" вместо удаления игрока
      const player = await prisma.player.update({
        where: { id: playerId },
        data: { 
          connectionStatus: "left",
          lastSeen: new Date()
        }
      });
      playerSockets.delete(playerId);

      // Покидаем socket.io комнату
      socket.leave(roomId);
      socket.data.roomId = null;
      socket.data.playerId = null;

      // Проверяем, был ли это хост
      const isHost = room.hostId === playerId;
      
      if (isHost) {
        // Передаём хоста следующему активному игроку (не left)
        const remainingPlayers = await prisma.player.findMany({
          where: { 
            roomId,
            connectionStatus: { not: "left" }
          },
          orderBy: { joinedAt: "asc" }
        });

        if (remainingPlayers.length > 0) {
          const newHost = remainingPlayers[0];
          await prisma.room.update({
            where: { id: roomId },
            data: { hostId: newHost.id }
          });
          io.to(roomId).emit("room:host_changed", { 
            newHostId: newHost.id, 
            newHostName: newHost.name 
          });
        } else {
          // Все игроки покинули комнату — удаляем её
          stopTimer(roomId);
          await prisma.vote.deleteMany({ where: { round: { roomId } } });
          await prisma.round.deleteMany({ where: { roomId } });
          await prisma.player.deleteMany({ where: { roomId } });
          await prisma.room.delete({ where: { id: roomId } });
        }
      }

      // Уведомляем оставшихся игроков об изменении статуса
      io.to(roomId).emit("player:connection_status", {
        playerId,
        connectionStatus: "left",
        playerName: player.name
      });
      await emitRoomState(roomId);

      if (ack) {
        ack({ ok: true });
      }
    } catch (error) {
      console.error("room:leave error:", error);
      if (ack) {
        ack({ ok: false, error: "Failed to leave room" });
      }
    }
  });

  // Обновление профиля игрока в комнате (никнейм, аватар)
  socket.on("player:update_profile", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId || !socket.data.playerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }
    
    const { nickname, avatarUrl } = payload || {};
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    
    try {
      // Получаем текущего игрока
      const player = await prisma.player.findUnique({
        where: { id: playerId }
      });
      
      if (!player || player.roomId !== roomId) {
        if (ack) ack({ ok: false, error: "Player not found" });
        return;
      }
      
      // Обновляем данные игрока
      const updateData = {};
      if (nickname && nickname.trim()) {
        updateData.name = nickname.trim().slice(0, 20);
      }
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: updateData
        });
        
        // Отправляем обновлённое состояние всем в комнате
        await emitRoomState(roomId);
      }
      
      if (ack) ack({ ok: true });
    } catch (error) {
      console.error("player:update_profile error:", error);
      if (ack) ack({ ok: false, error: "Failed to update profile" });
    }
  });

  socket.on("admin:kick", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    let room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }
    const targetId = payload?.playerId;
    if (!targetId) {
      if (ack) {
        ack({ ok: false, error: "Player required" });
      }
      return;
    }
    if (targetId === room.hostId) {
      if (ack) {
        ack({ ok: false, error: "Cannot kick host" });
      }
      return;
    }

    const activeRound = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (activeRound && activeRound.currentPlayerId === targetId) {
      stopTimer(room.id);
      await prisma.round.update({
        where: { id: activeRound.id },
        data: { phase: "complete", result: "skipped", endedAt: new Date() }
      });
      io.to(room.id).emit("admin:skip_round", { roundId: activeRound.id });
    }

    // Добавляем visitorId в бан-лист комнаты
    const targetPlayer = await prisma.player.findUnique({ where: { id: targetId } });
    if (targetPlayer?.visitorId) {
      const settings = normalizeSettings(room.settings);
      const bannedVisitorIds = settings.bannedVisitorIds || [];
      if (!bannedVisitorIds.includes(targetPlayer.visitorId)) {
        bannedVisitorIds.push(targetPlayer.visitorId);
        room = await prisma.room.update({
          where: { id: room.id },
          data: { settings: serializeSettings({ ...settings, bannedVisitorIds }) }
        });
      }
    }

    await prisma.player.delete({ where: { id: targetId } });

    const targetSocketId = playerSockets.get(targetId);
    if (targetSocketId) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        // Очищаем данные комнаты, но НЕ отключаем сокет
        // Это позволит кикнутому игроку сразу создать/присоединиться к другой комнате
        targetSocket.leave(socket.data.roomId);
        targetSocket.data.roomId = null;
        targetSocket.data.playerId = null;
      }
      io.to(targetSocketId).emit("admin:kick", { reason: "kicked" });
    }

    playerSockets.delete(targetId);
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:reset_room", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }

    stopTimer(room.id);
    stopVotingTimer(room.id);
    pausedRooms.delete(room.id);
    io.to(room.id).emit("game:paused", { isPaused: false });
    
    await prisma.vote.deleteMany({ where: { round: { roomId: room.id } } });
    await prisma.spin.deleteMany({ where: { round: { roomId: room.id } } });
    await prisma.round.deleteMany({ where: { roomId: room.id } });
    await prisma.player.updateMany({
      where: { roomId: room.id },
      data: { 
        strikes: 0, 
        status: "active",
        shameTitle: null,
        shameClearProgress: 0,
        chaosClearProgress: 0,
        truthStreak: 0,
        dareStreak: 0
      }
    });
    const settings = { ...normalizeSettings(room.settings), turnIndex: 0 };
    await prisma.room.update({
      where: { id: room.id },
      data: { settings: serializeSettings(settings) }
    });

    io.to(room.id).emit("admin:reset_room", { roomId: room.id });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:skip_round", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }

    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round) {
      if (ack) {
        ack({ ok: false, error: "No active round" });
      }
      return;
    }
    stopTimer(room.id);
    await prisma.round.update({
      where: { id: round.id },
      data: { phase: "complete", result: "skipped", endedAt: new Date() }
    });

    // Advance turn to next player
    await advanceTurnIndex(room.id);

    io.to(room.id).emit("admin:skip_round", { roundId: round.id });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:reset_timer", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Timer not active" });
      }
      return;
    }
    await startTimer(room.id, round.id, round.timerSeconds || 120);
    if (ack) {
      ack({ ok: true });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // admin:toggle_pause — Поставить/снять паузу (только хост)
  // ───────────────────────────────────────────────────────────────────────────
  socket.on("admin:toggle_pause", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }
    
    const isPaused = isRoomPaused(room.id);
    
    if (isPaused) {
      // Снимаем паузу
      await resumeTimer(room.id);
      if (ack) {
        ack({ ok: true, isPaused: false });
      }
    } else {
      // Ставим на паузу (только если таймер активен)
      const timer = roomTimers.get(room.id);
      if (!timer) {
        if (ack) {
          ack({ ok: false, error: "No active timer to pause" });
        }
        return;
      }
      pauseTimer(room.id);
      if (ack) {
        ack({ ok: true, isPaused: true });
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // room:end — Организатор завершает игру для всех
  // ───────────────────────────────────────────────────────────────────────────
  socket.on("room:end", async (payload, ack) => {
    if (!socket.data.roomId || !socket.data.playerId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }

    const roomId = socket.data.roomId;

    try {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        if (ack) {
          ack({ ok: false, error: "Room not found" });
        }
        return;
      }

      // Только хост может завершить игру
      if (room.hostId !== socket.data.playerId) {
        if (ack) {
          ack({ ok: false, error: "Host only" });
        }
        return;
      }

      console.log("[Room:End] Host ending game for room:", room.code);

      // Останавливаем таймеры и очищаем состояние паузы
      stopTimer(roomId);
      stopVotingTimer(roomId);
      pausedRooms.delete(roomId);
      io.to(roomId).emit("game:paused", { isPaused: false });

      // Уведомляем всех игроков о завершении игры
      io.to(roomId).emit("room:ended", { reason: "host_ended" });

      // Отключаем всех игроков от socket.io комнаты и очищаем их данные
      const players = await prisma.player.findMany({ where: { roomId } });
      for (const player of players) {
        const playerSocketId = playerSockets.get(player.id);
        if (playerSocketId) {
          const playerSocket = io.sockets.sockets.get(playerSocketId);
          if (playerSocket) {
            playerSocket.leave(roomId);
            playerSocket.data.roomId = null;
            playerSocket.data.playerId = null;
          }
          playerSockets.delete(player.id);
        }
      }

      // Удаляем все данные комнаты
      await prisma.vote.deleteMany({ where: { round: { roomId } } });
      await prisma.round.deleteMany({ where: { roomId } });
      await prisma.player.deleteMany({ where: { roomId } });
      await prisma.room.delete({ where: { id: roomId } });

      console.log("[Room:End] Room deleted:", room.code);

      if (ack) {
        ack({ ok: true });
      }
    } catch (error) {
      console.error("room:end error:", error);
      if (ack) {
        ack({ ok: false, error: "Failed to end room" });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALIAS GAME EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  socket.on("alias:room:create", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const visitorId = payload?.visitorId || null;
    if (!name) {
      if (ack) ack({ ok: false, error: "Name required" });
      return;
    }

    // Выходим из всех предыдущих комнат перед созданием новой
    await leaveAllRooms(socket);
    
    // Получаем avatarUrl из payload или из сессии пользователя
    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }
    
    const code = await generateAliasRoomCode(prisma);
    const settings = getDefaultAliasSettings();

    const room = await prisma.aliasRoom.create({
      data: {
        code,
        hostId: "pending",
        settings: JSON.stringify(settings)
      }
    });
    
    const player = await prisma.aliasPlayer.create({
      data: {
        roomId: room.id,
        name,
        avatarUrl,
        visitorId
      }
    });
    
    await prisma.aliasRoom.update({
      where: { id: room.id },
      data: { hostId: player.id }
    });

    socket.data.aliasRoomId = room.id;
    socket.data.aliasPlayerId = player.id;
    aliasPlayerSockets.set(player.id, socket.id);
    socket.join(`alias:${room.id}`);

    const state = await buildAliasRoomState(prisma, room.id);
    io.to(`alias:${room.id}`).emit("alias:state:sync", state);

    // Синхронизируем текущий лидерборд CyberRunner
    socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

    if (ack) ack({ ok: true, state, playerId: player.id });
  });

  socket.on("alias:room:join", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const code = normalizeName(payload?.code).toUpperCase();
    const visitorId = payload?.visitorId || null;
    if (!name || !code) {
      if (ack) ack({ ok: false, error: "Имя и код обязательны" });
      return;
    }

    // Выходим из всех предыдущих комнат перед присоединением
    await leaveAllRooms(socket);

    const room = await prisma.aliasRoom.findUnique({ where: { code } });
    if (!room) {
      if (ack) ack({ ok: false, error: "Комната не найдена" });
      return;
    }

    const players = await prisma.aliasPlayer.findMany({ where: { roomId: room.id } });
    
    // Проверяем, есть ли игрок с таким visitorId (реконнект)
    let player = null;
    if (visitorId) {
      player = players.find(p => p.visitorId === visitorId && p.connectionStatus !== "left");
    }

    if (player) {
      // Реконнект существующего игрока
      await prisma.aliasPlayer.update({
        where: { id: player.id },
        data: { connectionStatus: "online", lastSeen: new Date() }
      });
      
      socket.data.aliasRoomId = room.id;
      socket.data.aliasPlayerId = player.id;
      aliasPlayerSockets.set(player.id, socket.id);
      socket.join(`alias:${room.id}`);
      setAutoLeaveTimer(socket);
      
      io.to(`alias:${room.id}`).emit("alias:player:reconnected", { playerId: player.id, playerName: player.name });
      
      const state = await buildAliasRoomState(prisma, room.id);
      io.to(`alias:${room.id}`).emit("alias:state:sync", state);

      // Синхронизируем текущий лидерборд CyberRunner только для переподключившегося клиента
      socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

      // Форсируем актуальные значения таймеров только для переподключившегося клиента
      const timer = aliasTimers.get(room.id);
      if (timer) {
        socket.emit("alias:timer:tick", { remaining: timer.remaining });
      }
      const review = aliasReviewTimers.get(room.id);
      if (review?.endsAt) {
        const remaining = Math.max(0, Math.ceil((review.endsAt - Date.now()) / 1000));
        socket.emit("alias:review:tick", { remaining });
      }
      
      if (ack) ack({ ok: true, state, playerId: player.id, reconnected: true });
      return;
    }

    // Новый игрок
    const takenNames = players.filter(p => p.connectionStatus !== "left").map(p => p.name.toLowerCase());
    const finalName = makeUniqueName(name, takenNames);

    // Получаем avatarUrl из payload или из сессии пользователя
    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }

    // Если игра активна (playing или reviewing), новые игроки становятся наблюдателями
    const isGameActive = room.status === "playing" || room.status === "reviewing";
    
    player = await prisma.aliasPlayer.create({
      data: {
        roomId: room.id,
        name: finalName,
        avatarUrl,
        visitorId,
        isSpectator: isGameActive
      }
    });

    socket.data.aliasRoomId = room.id;
    socket.data.aliasPlayerId = player.id;
    aliasPlayerSockets.set(player.id, socket.id);
    socket.join(`alias:${room.id}`);
    setAutoLeaveTimer(socket);

    const state = await buildAliasRoomState(prisma, room.id);
    io.to(`alias:${room.id}`).emit("alias:state:sync", state);

    // Синхронизируем текущий лидерборд CyberRunner
    socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

    if (ack) ack({ ok: true, state, playerId: player.id });
  });

  socket.on("alias:room:rejoin", async (payload, ack) => {
    console.log("[Alias Rejoin] Received rejoin request:", payload);
    const { playerId, roomCode } = payload || {};
    if (!playerId || !roomCode) {
      if (ack) ack({ ok: false, error: "Missing data" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { code: roomCode.toUpperCase() } });
    if (!room) {
      if (ack) ack({ ok: false, error: "Room not found" });
      return;
    }

    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    if (!player || player.roomId !== room.id) {
      if (ack) ack({ ok: false, error: "Player not found" });
      return;
    }

    // Если у игрока уже есть активный сокет — отключаем старый (две вкладки или reconnect)
    const existingSocketId = aliasPlayerSockets.get(playerId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
        console.log("[Alias Rejoin] Disconnecting old socket for player:", playerId);
        existingSocket.data.aliasRoomId = null;
        existingSocket.data.aliasPlayerId = null;
        existingSocket.emit("alias:session:replaced", { message: "Session replaced by another tab" });
        existingSocket.disconnect(true);
      }
    }

    // Обновляем статус на online
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { connectionStatus: "online", lastSeen: new Date() }
    });

    socket.data.aliasRoomId = room.id;
    socket.data.aliasPlayerId = player.id;
    aliasPlayerSockets.set(player.id, socket.id);
    socket.join(`alias:${room.id}`);

    // Уведомляем о реконнекте
    io.to(`alias:${room.id}`).emit("alias:player:reconnected", { 
      playerId: player.id, 
      playerName: player.name 
    });

    const state = await buildAliasRoomState(prisma, room.id);
    io.to(`alias:${room.id}`).emit("alias:state:sync", state);

    // Синхронизируем текущий лидерборд CyberRunner только для переподключившегося клиента
    socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

    // Форсируем актуальные значения таймеров только для переподключившегося клиента
    const timer = aliasTimers.get(room.id);
    if (timer) {
      socket.emit("alias:timer:tick", { remaining: timer.remaining });
    }
    const review = aliasReviewTimers.get(room.id);
    if (review?.endsAt) {
      const remaining = Math.max(0, Math.ceil((review.endsAt - Date.now()) / 1000));
      socket.emit("alias:review:tick", { remaining });
    }

    if (ack) ack({ ok: true, state, playerId: player.id });
  });

  socket.on("alias:teams:create", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    // Проверяем, не идёт ли игра
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room && (room.status === "playing" || room.status === "reviewing")) {
      if (ack) ack({ ok: false, error: "Нельзя создавать команды во время игры" });
      return;
    }

    // Получаем текущего игрока и его старую команду
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    const teams = await prisma.aliasTeam.findMany({ where: { roomId } });
    const teamName = normalizeName(payload?.name) || `Команда ${teams.length + 1}`;
    
    const team = await prisma.aliasTeam.create({
      data: {
        roomId,
        name: teamName,
        turnOrder: teams.length,
        creatorId: playerId // Сохраняем создателя команды
      }
    });

    // Автоматически добавляем создателя в новую команду
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { teamId: team.id, explainOrder: 0, isSpectator: false, isReady: false }
    });

    // Удаляем старую команду, если в ней никого не осталось
    if (oldTeamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } });
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true, teamId: team.id });
  });

  socket.on("alias:teams:rename", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    const { teamId, name } = payload || {};
    
    if (!roomId || !teamId || !name?.trim()) {
      if (ack) ack({ ok: false, error: "Missing data" });
      return;
    }

    const team = await prisma.aliasTeam.findUnique({ where: { id: teamId } });
    if (!team || team.roomId !== roomId) {
      if (ack) ack({ ok: false, error: "Team not found" });
      return;
    }

    // Переименовывать может любой игрок, который состоит в этой команде.
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    if (!player || player.roomId !== roomId) {
      if (ack) ack({ ok: false, error: "Игрок не найден" });
      return;
    }

    if (player.teamId !== teamId) {
      if (ack) ack({ ok: false, error: "Переименовать может только участник этой команды" });
      return;
    }

    await prisma.aliasTeam.update({
      where: { id: teamId },
      data: { name: name.trim() }
    });

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:teams:join", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    const teamId = payload?.teamId;
    
    if (!roomId || !playerId || !teamId) {
      if (ack) ack({ ok: false, error: "Missing data" });
      return;
    }

    // Нельзя присоединяться во время игры
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room && (room.status === "playing" || room.status === "reviewing")) {
      if (ack) ack({ ok: false, error: "Нельзя вступать в команды во время игры" });
      return;
    }

    const team = await prisma.aliasTeam.findUnique({ where: { id: teamId } });
    if (!team || team.roomId !== roomId) {
      if (ack) ack({ ok: false, error: "Team not found" });
      return;
    }

    // Получаем старую команду игрока
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    const teamMembers = await prisma.aliasPlayer.findMany({ where: { teamId } });
    
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { teamId, explainOrder: teamMembers.length, isSpectator: false, isReady: false }
    });

    // Удаляем старую команду, если в ней никого не осталось
    if (oldTeamId && oldTeamId !== teamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } });
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    // Проверяем, нужно ли передать ход другой команде
    await checkAndUpdateAliasTurn(prisma, roomId, io);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:teams:leave", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId || !playerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    // Запрет выхода из команды во время игры
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room && room.status === "playing") {
      if (ack) ack({ ok: false, error: "Cannot leave team during game" });
      return;
    }

    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    // Переводим игрока в наблюдатели (без команды)
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { teamId: null, isReady: false, isSpectator: true }
    });

    // Удаляем команду только если в ней никого не осталось
    if (oldTeamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } });
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    // Проверяем, нужно ли передать ход другой команде
    await checkAndUpdateAliasTurn(prisma, roomId, io);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:teams:shuffle", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;

    if (!roomId || !playerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const result = await shuffleAliasTeams(prisma, roomId, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:settings:update", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== playerId) {
      if (ack) ack({ ok: false, error: "Host only" });
      return;
    }

    const currentSettings = normalizeAliasSettings(room.settings);
    const newSettings = {
      ...currentSettings,
      ...(payload?.difficulty && { difficulty: payload.difficulty }),
      ...(payload?.turnSeconds && { turnSeconds: Math.max(30, Math.min(300, payload.turnSeconds)) }),
      ...(payload?.targetScore && { targetScore: Math.max(10, Math.min(100, payload.targetScore)) }),
      ...(typeof payload?.skipPenalty === "number" && { skipPenalty: payload.skipPenalty === -1 ? -1 : 0 })
    };

    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: { settings: JSON.stringify(newSettings) }
    });

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:ready:set", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId || !playerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const isReady = payload?.isReady !== false;
    
    // Проверяем статус комнаты - нельзя готовиться во время просмотра отчёта
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room?.status === "reviewing") {
      if (ack) ack({ ok: false, error: "Дождитесь подтверждения отчёта" });
      return;
    }

    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { isReady }
    });

    // Проверяем, все ли готовы, и если да — определяем следующего объясняющего
    const players = await prisma.aliasPlayer.findMany({ where: { roomId } });
    const teams = await prisma.aliasTeam.findMany({ where: { roomId }, orderBy: { turnOrder: "asc" } });
    
    // Проверяем что есть команды с минимум 2 игроками
    const teamsWithEnoughPlayers = teams.filter(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });
    
    // Определяем следующую команду (с минимум 2 игроками)
    let nextTeamId = room.currentTeamId;
    if (!nextTeamId && teamsWithEnoughPlayers.length > 0) {
      nextTeamId = teamsWithEnoughPlayers[0].id;
    }
    
    // Проверяем готовность только игроков активной команды (не всей комнаты)
    const activeTeamPlayers = nextTeamId 
      ? players.filter(p => p.teamId === nextTeamId && p.connectionStatus === "online" && !p.isSpectator)
      : [];
    const allReady = activeTeamPlayers.length >= 2 && activeTeamPlayers.every(p => p.isReady);
    
    if (allReady && teamsWithEnoughPlayers.length > 0 && room.status === "lobby" && !room.currentExplainerId) {
      // Выбираем первую команду с достаточным количеством игроков и первого объясняющего
      const { teamId, explainerId } = getNextTeamAndExplainer(teamsWithEnoughPlayers, players, null, null);
      
      if (teamId && explainerId) {
        await prisma.aliasRoom.update({
          where: { id: roomId },
          data: { currentTeamId: teamId, currentExplainerId: explainerId }
        });
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:turn:start", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status === "playing") {
      if (ack) ack({ ok: false, error: "Cannot start now" });
      return;
    }

    // Нельзя начать новый раунд, пока не подтверждён отчёт предыдущего
    if (room.status === "reviewing") {
      if (ack) ack({ ok: false, error: "Сначала подтвердите отчёт предыдущего раунда" });
      return;
    }

    if (isAliasPaused(roomId)) {
      if (ack) ack({ ok: false, error: "Game is paused" });
      return;
    }

    const players = await prisma.aliasPlayer.findMany({ where: { roomId } });
    const teams = await prisma.aliasTeam.findMany({ where: { roomId }, orderBy: { turnOrder: "asc" } });

    if (teams.length < 1) {
      if (ack) ack({ ok: false, error: "Нужна минимум 1 команда" });
      return;
    }

    // Определяем активную команду (текущую или следующую по очереди)
    let activeTeamId = room.currentTeamId;
    if (!activeTeamId) {
      // Ищем первую команду с минимум 2 игроками
      const firstValidTeam = teams.find(t => {
        const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
        return teamPlayers.length >= 2;
      });
      activeTeamId = firstValidTeam?.id;
    }

    if (!activeTeamId) {
      if (ack) ack({ ok: false, error: "Нет команды с достаточным количеством игроков" });
      return;
    }

    // Проверяем, что в активной команде минимум 2 игрока (один объясняет, другой угадывает)
    const activeTeamPlayers = players.filter(p => p.teamId === activeTeamId && p.connectionStatus === "online" && !p.isSpectator);
    
    if (activeTeamPlayers.length < 2) {
      if (ack) ack({ ok: false, error: "В команде недостаточно игроков (нужно минимум 2)" });
      return;
    }

    // Проверяем готовность только игроков активной команды (не всей комнаты)
    const allReady = activeTeamPlayers.every(p => p.isReady);
    
    if (!allReady) {
      if (ack) ack({ ok: false, error: "Не все игроки команды готовы" });
      return;
    }
    
    // Список команд с достаточным количеством игроков (для выбора следующей)
    const teamsWithPlayers = teams.filter(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });

    // Только назначенный объясняющий может начать ход
    const startingPlayerId = socket.data.aliasPlayerId;
    if (room.currentExplainerId && room.currentExplainerId !== startingPlayerId) {
      if (ack) ack({ ok: false, error: "Только объясняющий может начать ход" });
      return;
    }

    const settings = normalizeAliasSettings(room.settings);

    // Build deck if needed
    let deck = JSON.parse(room.deck || "[]");
    if (deck.length === 0) {
      deck = await buildDeck(prisma, settings.difficulty);
      await prisma.aliasRoom.update({
        where: { id: roomId },
        data: { deck: JSON.stringify(deck) }
      });
    }

    // Используем уже назначенного объясняющего, если он есть
    // НЕ вызываем getNextTeamAndExplainer здесь, т.к. он уже был вызван в alias:ready:set
    let teamId = room.currentTeamId;
    let explainerId = room.currentExplainerId;

    // Если по какой-то причине объясняющий не назначен, назначаем (только из команд с минимум 2 игроками)
    if (!teamId || !explainerId) {
      const result = getNextTeamAndExplainer(teamsWithPlayers, players, null, null);
      teamId = result.teamId;
      explainerId = result.explainerId;
    }

    if (!explainerId) {
      if (ack) ack({ ok: false, error: "No explainer available" });
      return;
    }

    // Get first word
    const word = await getNextWord(prisma, roomId);
    if (!word) {
      if (ack) ack({ ok: false, error: "No words available" });
      return;
    }

    const turnEndsAt = new Date(Date.now() + settings.turnSeconds * 1000);

    // Очищаем историю предыдущего раунда перед началом нового хода
    clearRoundHistory(roomId);

    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: {
        status: "playing",
        currentTeamId: teamId,
        currentExplainerId: explainerId,
        turnStartedAt: new Date(),
        turnEndsAt
      }
    });

    // Reset ready status
    await prisma.aliasPlayer.updateMany({
      where: { roomId },
      data: { isReady: false }
    });

    // Start timer
    const timerCallback = async () => {
      await endAliasTurnInternal(roomId, "timeout");
    };
    
    const timerState = { intervalId: null, remaining: settings.turnSeconds, roomId };
    io.to(`alias:${roomId}`).emit("alias:timer:tick", { remaining: timerState.remaining });
    
    timerState.intervalId = setInterval(async () => {
      if (isAliasPaused(roomId)) return;
      timerState.remaining -= 1;
      io.to(`alias:${roomId}`).emit("alias:timer:tick", { remaining: timerState.remaining });
      if (timerState.remaining <= 0) {
        clearInterval(timerState.intervalId);
        aliasTimers.delete(roomId);
        await timerCallback();
      }
    }, 1000);
    aliasTimers.set(roomId, timerState);

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);
    io.to(`alias:${roomId}`).emit("alias:turn:started", { teamId, explainerId, turnEndsAt });
    // Отправляем пустую историю при старте нового хода
    io.to(`alias:${roomId}`).emit("alias:history:updated", { history: [] });

    // Send word only to explainer
    const explainerSocketId = aliasPlayerSockets.get(explainerId);
    if (explainerSocketId) {
      io.to(explainerSocketId).emit("alias:word:current", { word });
    }

    if (ack) ack({ ok: true });
  });

  async function endAliasTurnInternal(roomId, reason) {
    stopAliasTimer(roomId);
    
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room) return;

    // Добавляем последнее слово в историю (если было), чтобы можно было отметить его в отчёте
    // По умолчанию помечаем как не отгаданное, но игроки могут изменить это в отчёте
    if (room.currentWordId) {
      const currentWord = await prisma.aliasWord.findUnique({ where: { id: room.currentWordId } });
      if (currentWord) {
        addWordToHistory(roomId, currentWord.text, false, room.currentTeamId);
      }
    }

    // Переходим в статус reviewing (просмотр отчёта)
    // Проверка победителя будет после подтверждения отчёта
    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: {
        status: "reviewing",
        currentWordId: null,
        turnStartedAt: null,
        turnEndsAt: null
      }
    });

    // Отправляем финальную историю раунда
    const finalHistory = getRoundHistory(roomId);
    io.to(`alias:${roomId}`).emit("alias:turn:ended", { 
      reason, 
      roundHistory: finalHistory 
    });

    // Запускаем таймер автоподтверждения (60 секунд)
    const REVIEW_TIMEOUT_SECONDS = 60;
    const reviewEndsAt = Date.now() + REVIEW_TIMEOUT_SECONDS * 1000;
    
    // Останавливаем предыдущий таймер review если есть
    const existingReviewTimer = aliasReviewTimers.get(roomId);
    if (existingReviewTimer?.interval) {
      clearInterval(existingReviewTimer.interval);
    }

    // Отправляем тики таймера review каждую секунду
    const reviewInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((reviewEndsAt - Date.now()) / 1000));
      io.to(`alias:${roomId}`).emit("alias:review:tick", { remaining });
      
      if (remaining <= 0) {
        clearInterval(reviewInterval);
        aliasReviewTimers.delete(roomId);
        // Автоподтверждение
        confirmReportInternal(roomId);
      }
    }, 1000);

    aliasReviewTimers.set(roomId, { interval: reviewInterval, endsAt: reviewEndsAt });

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);
  }

  // Функция подтверждения отчёта (вызывается вручную или автоматически)
  async function confirmReportInternal(roomId) {
    // Останавливаем таймер review
    const reviewTimer = aliasReviewTimers.get(roomId);
    if (reviewTimer?.interval) {
      clearInterval(reviewTimer.interval);
      aliasReviewTimers.delete(roomId);
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== "reviewing") return;

    const teams = await prisma.aliasTeam.findMany({ where: { roomId }, orderBy: { turnOrder: "asc" } });
    const players = await prisma.aliasPlayer.findMany({ where: { roomId } });
    const settings = normalizeAliasSettings(room.settings);

    // Победитель определяется только после того, как все команды отыграют текущий круг.
    // Поэтому здесь мы либо:
    // 1) ставим "предварительного" победителя (pendingWinnerTeamId), если цель достигнута впервые,
    // 2) либо, если круг завершён, выбираем команду с максимальным счётом и завершаем игру.

    const teamsWithEnoughPlayers = teams.filter(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });

    const targetReachedTeams = teamsWithEnoughPlayers.filter(t => t.score >= settings.targetScore);
    const pendingWinnerTeamId = settings.pendingWinnerTeamId || null;

    // Если кто-то уже достиг цели, но pendingWinner ещё не установлен — фиксируем первого достигшего.
    if (!pendingWinnerTeamId && targetReachedTeams.length > 0) {
      // Выбираем "первого" детерминированно по turnOrder (стабильно).
      const firstReached = [...targetReachedTeams].sort((a, b) => a.turnOrder - b.turnOrder)[0];
      settings.pendingWinnerTeamId = firstReached.id;
      await prisma.aliasRoom.update({
        where: { id: roomId },
        data: { settings: serializeAliasSettings(settings) }
      });
    }

    // Если pendingWinner задан, то игра заканчивается только после того,
    // как отыграет команда с максимальным turnOrder в текущем списке активных команд.
    if (settings.pendingWinnerTeamId) {
      const lastTurnOrder = Math.max(...teamsWithEnoughPlayers.map(t => t.turnOrder));
      const currentTeam = teamsWithEnoughPlayers.find(t => t.id === room.currentTeamId);
      const isEndOfCycle = currentTeam && currentTeam.turnOrder === lastTurnOrder;

      if (isEndOfCycle) {
        const winner = [...teamsWithEnoughPlayers].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.turnOrder - b.turnOrder;
        })[0];

        await prisma.aliasRoom.update({
          where: { id: roomId },
          data: { status: "finished" }
        });

        io.to(`alias:${roomId}`).emit("alias:game:finished", {
          winnerId: winner.id,
          winnerName: winner.name,
          finalScores: teams.map(t => ({ id: t.id, name: t.name, score: t.score }))
        });

        const state = await buildAliasRoomState(prisma, roomId);
        io.to(`alias:${roomId}`).emit("alias:state:sync", state);

        // Очищаем историю раунда
        clearRoundHistory(roomId);
        return;
      }
    }

    // Определяем следующую команду и объясняющего (только из команд с минимум 2 игроками)
    let teamId = null;
    let explainerId = null;

    if (teamsWithEnoughPlayers.length > 0) {
      const result = await getNextFullTeamAndExplainer(prisma, roomId, room.currentTeamId, room.currentExplainerId);
      teamId = result.teamId;
      explainerId = result.explainerId;
    }

    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: {
        status: "lobby",
        currentTeamId: teamId,
        currentExplainerId: explainerId
      }
    });

    io.to(`alias:${roomId}`).emit("alias:report:confirmed", { 
      nextTeamId: teamId, 
      nextExplainerId: explainerId 
    });

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);
    
    // Очищаем историю раунда
    clearRoundHistory(roomId);
  }

  socket.on("alias:turn:next", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== "playing" || room.currentExplainerId !== playerId) {
      if (ack) ack({ ok: false, error: "Not allowed" });
      return;
    }

    if (isAliasPaused(roomId)) {
      if (ack) ack({ ok: false, error: "Game is paused" });
      return;
    }

    // Add point to team
    await prisma.aliasTeam.update({
      where: { id: room.currentTeamId },
      data: { score: { increment: 1 } }
    });

    // Получаем текущее слово для записи в историю
    const currentRoom = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (currentRoom?.currentWordId) {
      const currentWord = await prisma.aliasWord.findUnique({ where: { id: currentRoom.currentWordId } });
      if (currentWord) {
        addWordToHistory(roomId, currentWord.text, true, room.currentTeamId);
        // Отправляем обновлённую историю всем игрокам
        const updatedHistory = getRoundHistory(roomId);
        io.to(`alias:${roomId}`).emit("alias:history:updated", { history: updatedHistory });
      }
    }

    io.to(`alias:${roomId}`).emit("alias:word:result", { correct: true, word: null });

    // Get next word
    const word = await getNextWord(prisma, roomId);
    if (!word) {
      await endAliasTurnInternal(roomId, "no_words");
      if (ack) ack({ ok: true });
      return;
    }

    // Send word only to explainer
    const explainerSocketId = aliasPlayerSockets.get(playerId);
    if (explainerSocketId) {
      io.to(explainerSocketId).emit("alias:word:current", { word });
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:turn:skip", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== "playing" || room.currentExplainerId !== playerId) {
      if (ack) ack({ ok: false, error: "Not allowed" });
      return;
    }

    if (isAliasPaused(roomId)) {
      if (ack) ack({ ok: false, error: "Game is paused" });
      return;
    }

    const settings = normalizeAliasSettings(room.settings);
    
    // Получаем текущее слово для записи в историю
    if (room.currentWordId) {
      const currentWord = await prisma.aliasWord.findUnique({ where: { id: room.currentWordId } });
      if (currentWord) {
        addWordToHistory(roomId, currentWord.text, false, room.currentTeamId);
        // Отправляем обновлённую историю всем игрокам
        const updatedHistory = getRoundHistory(roomId);
        io.to(`alias:${roomId}`).emit("alias:history:updated", { history: updatedHistory });
      }
    }
    
    // Apply skip penalty
    // В режиме "Пропуск -1" очки могут уходить в минус (это часть правил).
    if (settings.skipPenalty === -1) {
      await prisma.aliasTeam.update({
        where: { id: room.currentTeamId },
        data: { score: { decrement: 1 } }
      });
    }

    io.to(`alias:${roomId}`).emit("alias:word:result", { correct: false, skipped: true });

    // Get next word
    const word = await getNextWord(prisma, roomId);
    if (!word) {
      await endAliasTurnInternal(roomId, "no_words");
      if (ack) ack({ ok: true });
      return;
    }

    // Send word only to explainer
    const explainerSocketId = aliasPlayerSockets.get(playerId);
    if (explainerSocketId) {
      io.to(explainerSocketId).emit("alias:word:current", { word });
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  socket.on("alias:turn:skipTurn", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== playerId) {
      if (ack) ack({ ok: false, error: "Host only" });
      return;
    }

    await endAliasTurnInternal(roomId, "skipped");
    if (ack) ack({ ok: true });
  });

  socket.on("alias:pause", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== playerId) {
      if (ack) ack({ ok: false, error: "Host only" });
      return;
    }

    const pauseState = aliasPausedRooms.get(roomId);
    const isPaused = pauseState?.isPaused || false;
    
    if (isPaused) {
      // Resume - восстанавливаем таймер
      const { remainingWhenPaused } = pauseState;
      aliasPausedRooms.delete(roomId);
      io.to(`alias:${roomId}`).emit("alias:paused", { isPaused: false });
      
      // Перезапускаем таймер с оставшимся временем
      if (remainingWhenPaused > 0 && room.status === "playing") {
        const settings = normalizeAliasSettings(room.settings);
        
        const timerState = { intervalId: null, remaining: remainingWhenPaused, roomId };
        io.to(`alias:${roomId}`).emit("alias:timer:tick", { remaining: timerState.remaining });
        
        timerState.intervalId = setInterval(async () => {
          if (isAliasPaused(roomId)) return;
          timerState.remaining -= 1;
          io.to(`alias:${roomId}`).emit("alias:timer:tick", { remaining: timerState.remaining });
          if (timerState.remaining <= 0) {
            clearInterval(timerState.intervalId);
            aliasTimers.delete(roomId);
            await endAliasTurnInternal(roomId, "timeout");
          }
        }, 1000);
        aliasTimers.set(roomId, timerState);
      }
    } else {
      // Pause - останавливаем таймер и сохраняем оставшееся время
      const timer = aliasTimers.get(roomId);
      if (timer) {
        clearInterval(timer.intervalId);
        aliasPausedRooms.set(roomId, { isPaused: true, remainingWhenPaused: timer.remaining });
        aliasTimers.delete(roomId);
      } else {
        aliasPausedRooms.set(roomId, { isPaused: true, remainingWhenPaused: 0 });
      }
      io.to(`alias:${roomId}`).emit("alias:paused", { isPaused: true });
    }

    if (ack) ack({ ok: true, isPaused: !isPaused });
  });

  socket.on("alias:reset", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== playerId) {
      if (ack) ack({ ok: false, error: "Host only" });
      return;
    }

    stopAliasTimer(roomId);
    aliasPausedRooms.delete(roomId);

    // Получаем ID команд для сброса индексов объясняющих
    const teams = await prisma.aliasTeam.findMany({ where: { roomId }, select: { id: true } });
    resetExplainerIndexes(teams.map(t => t.id));

    // Reset teams scores
    await prisma.aliasTeam.updateMany({
      where: { roomId },
      data: { score: 0 }
    });

    // Reset players
    await prisma.aliasPlayer.updateMany({
      where: { roomId },
      data: { isReady: false }
    });

    // Reset room
    const currentSettings = normalizeAliasSettings(room.settings);
    currentSettings.pendingWinnerTeamId = null;

    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: {
        status: "lobby",
        currentTeamId: null,
        currentExplainerId: null,
        currentWordId: null,
        turnStartedAt: null,
        turnEndsAt: null,
        deck: "[]",
        usedWordIds: "[]",
        settings: serializeAliasSettings(currentSettings)
      }
    });

    io.to(`alias:${roomId}`).emit("alias:paused", { isPaused: false });
    io.to(`alias:${roomId}`).emit("alias:reset", {});
    
    // Очищаем историю раунда
    clearRoundHistory(roomId);

    // Очищаем лидерборд CyberRunner для комнаты
    clearCyberLeaderboard(roomId);
    io.to(`alias:${roomId}`).emit("alias:cyber:leaderboard", { leaderboard: [] });
    
    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  // Получить историю слов текущего раунда
  socket.on("alias:history:get", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }
    
    const history = getRoundHistory(roomId);
    if (ack) ack({ ok: true, history });
  });

  // Изменить результат слова в истории (для корректировки очков)
  socket.on("alias:history:update", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const { index, correct } = payload || {};
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }
    
    if (typeof index !== "number" || typeof correct !== "boolean") {
      if (ack) ack({ ok: false, error: "Неверные параметры" });
      return;
    }
    
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      if (ack) ack({ ok: false, error: "Комната не найдена" });
      return;
    }
    
    const history = getRoundHistory(roomId);
    if (index < 0 || index >= history.length) {
      if (ack) ack({ ok: false, error: "Неверный индекс" });
      return;
    }
    
    const oldCorrect = history[index].correct;
    if (oldCorrect === correct) {
      if (ack) ack({ ok: true, history });
      return;
    }
    
    // Обновляем историю
    updateWordInHistory(roomId, index, correct);
    
    // Корректируем очки команды (используем сохранённый teamId раунда, а не текущий)
    const roundTeamId = getRoundTeamId(roomId) || room.currentTeamId;
    const team = await prisma.aliasTeam.findUnique({ where: { id: roundTeamId } });
    if (team) {
      const settings = normalizeAliasSettings(room.settings);

      // В зависимости от режима, "false" (пропуск) означает либо 0 очков, либо -1 очко.
      const pointsForWord = (isCorrect) => {
        if (isCorrect) return 1;
        return settings.skipPenalty === -1 ? -1 : 0;
      };

      const scoreDelta = pointsForWord(correct) - pointsForWord(oldCorrect);
      const nextScore = team.score + scoreDelta;

      // В обычном режиме отрицательные очки не допускаем.
      const newScore = settings.skipPenalty === -1 ? nextScore : Math.max(0, nextScore);

      await prisma.aliasTeam.update({
        where: { id: team.id },
        data: { score: newScore }
      });
    }
    
    const updatedHistory = getRoundHistory(roomId);
    io.to(`alias:${roomId}`).emit("alias:history:updated", { history: updatedHistory });
    
    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true, history: updatedHistory });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CYBERRUNNER LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  socket.on("alias:cyber:score", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    const { score } = payload || {};

    if (!roomId || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    // На всякий случай защищаемся от NaN и отрицательных значений
    if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) {
      if (ack) ack({ ok: false, error: "Неверный score" });
      return;
    }

    try {
      const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
      if (!player) {
        if (ack) ack({ ok: false, error: "Игрок не найден" });
        return;
      }

      const updatedLeaderboard = updateCyberLeaderboard(roomId, player.name, score);
      const leaderboard = updatedLeaderboard || getCyberLeaderboard(roomId);

      io.to(`alias:${roomId}`).emit("alias:cyber:leaderboard", { leaderboard });

      if (ack) ack({ ok: true, leaderboard });
    } catch (error) {
      console.error("alias:cyber:score error:", error);
      if (ack) ack({ ok: false, error: "Не удалось обновить лидерборд" });
    }
  });

  // Подтверждение отчёта (ручное)
  socket.on("alias:report:confirm", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    
    if (!roomId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }
    
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });

    // Делаем операцию идемпотентной: если отчёт уже не в reviewing,
    // значит он уже подтверждён (вручную или автотаймером).
    // Не возвращаем ошибку, чтобы избежать "ложных" ошибок при гонках/двойном клике.
    if (!room || room.status !== "reviewing") {
      if (ack) ack({ ok: true, alreadyConfirmed: true });
      return;
    }

    await confirmReportInternal(roomId);
    if (ack) ack({ ok: true, alreadyConfirmed: false });
  });

  socket.on("alias:room:leave", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    if (!roomId || !playerId) {
      if (ack) ack({ ok: true });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    // Передача хоста следующему игроку, если выходит хост
    if (room && room.hostId === playerId) {
      const remainingPlayers = await prisma.aliasPlayer.findMany({
        where: { roomId, id: { not: playerId } },
        orderBy: { joinedAt: "asc" }
      });
      
      const newHost = remainingPlayers[0];
      if (newHost) {
        await prisma.aliasRoom.update({
          where: { id: roomId },
          data: { hostId: newHost.id }
        });
        io.to(`alias:${roomId}`).emit("alias:host:changed", { newHostId: newHost.id, newHostName: newHost.name });
      }
    }

    // ПОЛНОСТЬЮ УДАЛЯЕМ игрока из базы при выходе
    await prisma.aliasPlayer.delete({ where: { id: playerId } });

    // Auto-delete empty teams
    if (oldTeamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } }).catch(() => {});
      }
    }

    socket.leave(`alias:${roomId}`);
    socket.data.aliasRoomId = null;
    socket.data.aliasPlayerId = null;
    aliasPlayerSockets.delete(playerId);

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  // Обновление профиля игрока Alias в комнате (никнейм, аватар)
  socket.on("alias:player:update_profile", async (payload, ack) => {
    if (!socket.data.aliasRoomId || !socket.data.aliasPlayerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }
    
    const { nickname, avatarUrl } = payload || {};
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    
    try {
      // Получаем текущего игрока
      const player = await prisma.aliasPlayer.findUnique({
        where: { id: playerId }
      });
      
      if (!player || player.roomId !== roomId) {
        if (ack) ack({ ok: false, error: "Player not found" });
        return;
      }
      
      // Обновляем данные игрока
      const updateData = {};
      if (nickname && nickname.trim()) {
        updateData.name = nickname.trim().slice(0, 20);
      }
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.aliasPlayer.update({
          where: { id: playerId },
          data: updateData
        });
        
        // Отправляем обновлённое состояние всем в комнате
        const state = await buildAliasRoomState(prisma, roomId);
        io.to(`alias:${roomId}`).emit("alias:state:sync", state);
      }
      
      if (ack) ack({ ok: true });
    } catch (error) {
      console.error("alias:player:update_profile error:", error);
      if (ack) ack({ ok: false, error: "Failed to update profile" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMOTIONAL GAME EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  socket.on("emotional:room:create", async (payload, ack) => {
    const name = normalizeEmotionalName(payload?.name);
    const visitorId = payload?.visitorId || null;

    if (!name) {
      if (ack) ack({ ok: false, error: "Имя обязательно" });
      return;
    }

    await leaveAllRooms(socket);

    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }

    const { room, playerId } = createEmotionalRoom(name, avatarUrl, visitorId);

    socket.data.emotionalRoomCode = room.code;
    socket.data.emotionalPlayerId = playerId;
    emotionalPlayerSockets.set(playerId, socket.id);
    socket.join(`emotional:${room.code}`);
    setAutoLeaveTimer(socket);

    // Отправляем состояние всем (на будущее — персонализированное)
    room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true, state: buildEmotionalRoomState(room, playerId), playerId });
  });

  socket.on("emotional:room:join", async (payload, ack) => {
    const name = normalizeEmotionalName(payload?.name);
    const code = normalizeEmotionalName(payload?.code).toUpperCase();
    const visitorId = payload?.visitorId || null;

    if (!name || !code) {
      if (ack) ack({ ok: false, error: "Имя и код обязательны" });
      return;
    }

    await leaveAllRooms(socket);

    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }

    const result = joinEmotionalRoom(code, name, avatarUrl, visitorId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    socket.data.emotionalRoomCode = result.room.code;
    socket.data.emotionalPlayerId = result.playerId;
    emotionalPlayerSockets.set(result.playerId, socket.id);
    socket.join(`emotional:${result.room.code}`);
    setAutoLeaveTimer(socket);

    // Отправляем состояние всем
    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) {
      ack({
        ok: true,
        state: buildEmotionalRoomState(result.room, result.playerId),
        playerId: result.playerId,
        reconnected: result.reconnected
      });
    }
  });

  socket.on("emotional:room:leave", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = leaveEmotionalRoom(roomCode, playerId);

    // если вышел последний или игра завершилась/комната пустеет — останавливаем таймер
    stopEmotionalTimer(roomCode);

    socket.leave(`emotional:${roomCode}`);
    emotionalPlayerSockets.delete(playerId);
    socket.data.emotionalRoomCode = null;
    socket.data.emotionalPlayerId = null;

    if (!result.deleted && result.room) {
      result.room.players.forEach(p => {
        const socketId = emotionalPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
        }
      });
    }

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:settings:update", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;
    const { settings } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = updateEmotionalSettings(roomCode, playerId, settings || {});
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:game:start", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = startEmotionalGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    startEmotionalTimer(roomCode);

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:turn:submit", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;
    const { emotion } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = submitEmotionalTurn(roomCode, playerId, emotion);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Если все сдали — сразу двигаем фазу
    if (canAdvanceEmotionalToVote(result.room, Date.now())) {
      advanceEmotionalToVote(result.room, Date.now());
    }

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:turn:skip", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = skipEmotionalTurn(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    if (canAdvanceEmotionalToVote(result.room, Date.now())) {
      advanceEmotionalToVote(result.room, Date.now());
    }

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:vote:cast", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;
    const { slotId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = castEmotionalVote(roomCode, playerId, slotId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    if (canFinalizeEmotionalVote(result.room, Date.now())) {
      finalizeEmotionalRound(result.room);
    }

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:round:next", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = startEmotionalNextRound(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    if (result.room.status === "playing") {
      startEmotionalTimer(roomCode);
    } else {
      stopEmotionalTimer(roomCode);
    }

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true, winners: result.winners || [] });
  });

  socket.on("emotional:game:new", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = resetEmotionalGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    stopEmotionalTimer(roomCode);

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("emotional:room:kick", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;
    const { targetPlayerId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = kickEmotionalPlayer(roomCode, playerId, targetPlayerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    const kickedSocketId = emotionalPlayerSockets.get(targetPlayerId);
    if (kickedSocketId) {
      io.to(kickedSocketId).emit("emotional:player:kicked", {
        message: "Вы были удалены из комнаты хостом",
      });

      // принудительно выкидываем из комнаты
      const kickedSocket = io.sockets.sockets.get(kickedSocketId);
      if (kickedSocket) {
        kickedSocket.leave(`emotional:${roomCode}`);
        kickedSocket.data.emotionalRoomCode = null;
        kickedSocket.data.emotionalPlayerId = null;
      }
      emotionalPlayerSockets.delete(targetPlayerId);
    }

    // sync всем оставшимся (кроме kicked)
    result.room.players.forEach(p => {
      if (p.connectionStatus === "kicked") return;
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true, kickedPlayerName: result.kickedPlayerName });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CODENAMES GAME EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  socket.on("codenames:room:create", async (payload, ack) => {
    const name = normalizeCodenamesName(payload?.name);
    const visitorId = payload?.visitorId || null;
    if (!name) {
      if (ack) ack({ ok: false, error: "Имя обязательно" });
      return;
    }

    // Выходим из всех предыдущих комнат перед созданием новой
    await leaveAllRooms(socket);

    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }

    const { room, playerId } = createCodenamesRoom(name, avatarUrl, visitorId);
    
    socket.data.codenamesRoomCode = room.code;
    socket.data.codenamesPlayerId = playerId;
    codenamesPlayerSockets.set(playerId, socket.id);
    socket.join(`codenames:${room.code}`);

    const state = buildCodenamesRoomState(room, playerId);
    if (ack) ack({ ok: true, state, playerId });
  });

  socket.on("codenames:room:join", async (payload, ack) => {
    const name = normalizeCodenamesName(payload?.name);
    const code = normalizeCodenamesName(payload?.code).toUpperCase();
    const visitorId = payload?.visitorId || null;
    
    if (!name || !code) {
      if (ack) ack({ ok: false, error: "Имя и код обязательны" });
      return;
    }

    // Выходим из всех предыдущих комнат перед присоединением
    await leaveAllRooms(socket);

    let avatarUrl = payload?.avatarUrl || null;
    if (!avatarUrl && socket.data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { avatarUrl: true }
      });
      avatarUrl = user?.avatarUrl || null;
    }

    const result = joinCodenamesRoom(code, name, avatarUrl, visitorId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    socket.data.codenamesRoomCode = result.room.code;
    socket.data.codenamesPlayerId = result.playerId;
    codenamesPlayerSockets.set(result.playerId, socket.id);
    socket.join(`codenames:${result.room.code}`);
    setAutoLeaveTimer(socket);

    // Отправляем состояние всем игрокам
    const room = result.room;
    room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true, state: buildCodenamesRoomState(room, result.playerId), playerId: result.playerId, reconnected: result.reconnected });
  });

  socket.on("codenames:room:rejoin", async (payload, ack) => {
    const { playerId, roomCode } = payload || {};
    if (!playerId || !roomCode) {
      if (ack) ack({ ok: false, error: "Отсутствуют данные" });
      return;
    }

    const room = getCodenamesRoom(roomCode);
    if (!room) {
      if (ack) ack({ ok: false, error: "Комната не найдена" });
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      if (ack) ack({ ok: false, error: "Игрок не найден" });
      return;
    }

    player.connectionStatus = "online";
    player.lastSeen = new Date();

    socket.data.codenamesRoomCode = room.code;
    socket.data.codenamesPlayerId = playerId;
    codenamesPlayerSockets.set(playerId, socket.id);
    socket.join(`codenames:${room.code}`);

    // Отправляем обновлённое состояние всем
    room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true, state: buildCodenamesRoomState(room, playerId), playerId });
  });

  socket.on("codenames:room:leave", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    
    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = leaveCodenamesRoom(roomCode, playerId);
    
    socket.leave(`codenames:${roomCode}`);
    codenamesPlayerSockets.delete(playerId);
    socket.data.codenamesRoomCode = null;
    socket.data.codenamesPlayerId = null;

    if (!result.deleted && result.room) {
      result.room.players.forEach(p => {
        const socketId = codenamesPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
        }
      });
    }

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:team:join", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { team } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = joinCodenamesTeam(roomCode, playerId, team);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Отправляем состояние всем
    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:role:set", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { role } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = setCodenamesRole(roomCode, playerId, role);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:team:rename", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { team, name } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    if (!team || !name) {
      if (ack) ack({ ok: false, error: "Укажите команду и название" });
      return;
    }

    const result = renameCodenamesTeam(roomCode, playerId, team, name);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:game:start", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = startCodenamesGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // Запускаем таймер
    if (result.startTimer && result.timerDuration) {
      startCodenamesTimer(roomCode, result.timerDuration, io);
    }

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:hint:give", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { word, count } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    if (!word || word.trim().length === 0) {
      if (ack) ack({ ok: false, error: "Введите слово-подсказку" });
      return;
    }

    const result = giveCodenamesHint(roomCode, playerId, word, count);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // Таймер НЕ перезапускается - общий таймер на весь ход продолжает идти

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:hint:edit", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { word, count } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = editCodenamesHint(roomCode, playerId, word, count);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // Голосование за карточку
  socket.on("codenames:card:vote", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = voteCodenamesCard(roomCode, playerId, cardId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Отправляем обновлённое состояние всем
    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // Если все проголосовали за одну карточку - запускаем pending с жёлтой полосой
    if (result.allVoted) {
      const pendingResult = startCodenamesPendingCard(roomCode, playerId, cardId);
      if (!pendingResult.error && pendingResult.pendingStarted) {
        // Синхронизируем состояние с pending для всех игроков
        pendingResult.room.players.forEach(p => {
          const socketId = codenamesPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(pendingResult.room, p.id));
          }
        });

        // Запускаем таймер на подтверждение (2 сек)
        const pendingTimeout = setTimeout(async () => {
          const confirmResult = confirmCodenamesPendingCard(roomCode);
          if (!confirmResult.error) {
            confirmResult.room.players.forEach(p => {
              const socketId = codenamesPlayerSockets.get(p.id);
              if (socketId) {
                io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(confirmResult.room, p.id));
              }
            });

            if (confirmResult.gameOver) {
              stopCodenamesTimer(roomCode);
              io.to(`codenames:${roomCode}`).emit("codenames:game:finished", {
                winner: confirmResult.room.winner,
                reason: confirmResult.room.log[confirmResult.room.log.length - 1]?.reason
              });
            } else if (confirmResult.startTimer && confirmResult.timerDuration) {
              startCodenamesTimer(roomCode, confirmResult.timerDuration, io);
            }
          }
        }, CODENAMES_TIMER_SETTINGS.PENDING_CONFIRM);

        setCodenamesPendingTimer(roomCode, pendingTimeout, cardId);
      }
    }

    if (ack) ack({ 
      ok: true, 
      allVoted: result.allVoted,
      votesNeeded: result.votesNeeded,
      currentVotes: result.currentVotes
    });
  });

  // Отмена голоса
  socket.on("codenames:card:cancelVote", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    // Отменяем pending если был (прерываем анимацию открытия)
    clearCodenamesPendingTimer(roomCode);
    const room = getCodenamesRoom(roomCode);
    if (room && room.pendingCard) {
      room.pendingCard = null;
    }

    const result = cancelCodenamesVote(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // Выбор карточки с подтверждением (2.5 сек)
  socket.on("codenames:card:select", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = startCodenamesPendingCard(roomCode, playerId, cardId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Если выбор был отменён (повторный клик на ту же карточку)
    if (result.pendingCancelled) {
      result.room.players.forEach(p => {
        const socketId = codenamesPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
        }
      });
      io.to(`codenames:${roomCode}`).emit("codenames:card:pending:cancel", { cardId: result.cardId });
      if (ack) ack({ ok: true, cancelled: true, cardId: result.cardId });
      return;
    }

    // Синхронизируем состояние с pending card
    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // Уведомляем о начале pending
    io.to(`codenames:${roomCode}`).emit("codenames:card:pending:start", {
      cardId,
      playerId,
      playerName: result.room.pendingCard.playerName,
      startedAt: result.room.pendingCard.startedAt,
      endsAt: result.room.pendingCard.endsAt
    });

    // Запускаем таймер подтверждения (2.5 сек)
    const timeoutId = setTimeout(() => {
      const confirmResult = confirmCodenamesPendingCard(roomCode);
      if (confirmResult.error) {
        return;
      }

      // Синхронизируем состояние после reveal
      confirmResult.room.players.forEach(p => {
        const socketId = codenamesPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(confirmResult.room, p.id));
        }
      });

      // Уведомляем о подтверждении
      io.to(`codenames:${roomCode}`).emit("codenames:card:pending:confirm", {
        cardId,
        cardType: confirmResult.cardType
      });

      // Если игра завершена, останавливаем таймер
      if (confirmResult.gameOver) {
        stopCodenamesTimer(roomCode);
        io.to(`codenames:${roomCode}`).emit("codenames:game:finished", {
          winner: confirmResult.room.winner,
          reason: confirmResult.room.log[confirmResult.room.log.length - 1]?.reason
        });
      } else if (confirmResult.startTimer && confirmResult.timerDuration) {
        // Запускаем новый таймер для следующего хода
        startCodenamesTimer(roomCode, confirmResult.timerDuration, io);
      }
    }, CODENAMES_TIMER_SETTINGS.PENDING_CONFIRM);

    setCodenamesPendingTimer(roomCode, timeoutId, cardId);

    if (ack) ack({ ok: true, pending: true, cardId });
  });

  // Отмена выбора карточки
  socket.on("codenames:card:cancel", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = cancelCodenamesPendingCard(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    io.to(`codenames:${roomCode}`).emit("codenames:card:pending:cancel", { cardId: result.cardId });

    if (ack) ack({ ok: true, cancelled: true });
  });

  // "Поклик" по карточке без игрового эффекта (только оперативы; либо до подсказки, либо в чужой ход)
  socket.on("codenames:card:poke", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const room = getCodenamesRoom(roomCode);
    if (!room) {
      if (ack) ack({ ok: false, error: "Комната не найдена" });
      return;
    }

    const player = room.players?.find(p => p.id === playerId);
    if (!player) {
      if (ack) ack({ ok: false, error: "Игрок не найден" });
      return;
    }

    // Запрещаем капитанам и наблюдателям (и игрокам без команды)
    const isCaptain = player.role === "captain";
    const isSpectator = player.role === "spectator" || !player.team;
    if (isCaptain || isSpectator) {
      if (ack) ack({ ok: false, error: "Недоступно" });
      return;
    }

    if (room.status !== "playing") {
      if (ack) ack({ ok: false, error: "Игра не активна" });
      return;
    }

    const card = room.board?.find(c => c.id === cardId);
    if (!card || card.revealed) {
      if (ack) ack({ ok: false, error: "Нельзя выбрать эту карточку" });
      return;
    }

    const isMyTurn = player.team === room.currentTeam;
    const canPoke = !room.currentHint || !isMyTurn;
    if (!canPoke) {
      if (ack) ack({ ok: false, error: "Недоступно" });
      return;
    }

    // Рассылаем всем событие для анимации (без изменений состояния игры)
    io.to(`codenames:${roomCode}`).emit("codenames:card:poked", {
      cardId,
      player: {
        id: player.id,
        name: player.name,
        avatarUrl: player.avatarUrl || null,
        team: player.team
      },
      ts: Date.now()
    });

    if (ack) ack({ ok: true });
  });

  // Прямое открытие карточки (для обратной совместимости или мгновенного reveal)
  socket.on("codenames:card:reveal", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    // Очищаем pending если есть
    clearCodenamesPendingTimer(roomCode);

    const result = revealCodenamesCard(roomCode, playerId, cardId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // Если игра завершена, останавливаем таймер
    if (result.gameOver) {
      stopCodenamesTimer(roomCode);
      io.to(`codenames:${roomCode}`).emit("codenames:game:finished", {
        winner: result.room.winner,
        reason: result.room.log[result.room.log.length - 1]?.reason
      });
    } else if (result.startTimer && result.timerDuration) {
      // Запускаем новый таймер для следующего хода
      startCodenamesTimer(roomCode, result.timerDuration, io);
    }

    if (ack) ack({ ok: true, cardType: result.cardType, endTurn: result.endTurn, gameOver: result.gameOver });
  });

  // Голосование за завершение хода (единогласное)
  socket.on("codenames:turn:voteEnd", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = voteCodenamesEndTurn(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Если все проголосовали - завершаем ход
    if (result.allVoted) {
      stopCodenamesTimer(roomCode);
      const endResult = executeCodenamesEndTurn(roomCode, "unanimous");
      if (!endResult.error) {
        endResult.room.players.forEach(p => {
          const socketId = codenamesPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(endResult.room, p.id));
          }
        });

        if (endResult.startTimer && endResult.timerDuration) {
          startCodenamesTimer(roomCode, endResult.timerDuration, io);
        }

        io.to(`codenames:${roomCode}`).emit("codenames:turn:ended", { reason: "unanimous" });
      }
    } else {
      // Просто синхронизируем состояние с голосами
      result.room.players.forEach(p => {
        const socketId = codenamesPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
        }
      });
    }

    if (ack) ack({ ok: true, allVoted: result.allVoted, cancelled: result.cancelled });
  });

  socket.on("codenames:turn:end", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = endCodenamesTurn(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // Запускаем новый таймер для следующего хода
    if (result.startTimer && result.timerDuration) {
      startCodenamesTimer(roomCode, result.timerDuration, io);
    }

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:game:reset", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    // Останавливаем таймер при сбросе игры
    stopCodenamesTimer(roomCode);

    const result = resetCodenamesGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    io.to(`codenames:${roomCode}`).emit("codenames:game:reset");

    if (ack) ack({ ok: true });
  });

  // Переключение режима открытой комнаты (тоггл смены команд)
  socket.on("codenames:room:toggle", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = toggleCodenamesRoomOpen(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      if (p.connectionStatus === "kicked" || p.connectionStatus === "left") return;
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    io.to(`codenames:${roomCode}`).emit("codenames:room:toggled", { isRoomOpen: result.isRoomOpen });

    if (ack) ack({ ok: true, isRoomOpen: result.isRoomOpen });
  });

  socket.on("codenames:room:shuffle", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = shuffleCodenamesTeams(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      if (p.connectionStatus === "kicked" || p.connectionStatus === "left") return;
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // Пропуск хода
  socket.on("codenames:turn:skip", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = skipCodenamesTurn(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    if (result.startTimer) {
      startCodenamesTimer(roomCode, result.timerDuration, io);
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    io.to(`codenames:${roomCode}`).emit("codenames:turn:skipped");

    if (ack) ack({ ok: true });
  });

  // Удаление игрока
  socket.on("codenames:player:kick", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { targetPlayerId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    if (!targetPlayerId) {
      if (ack) ack({ ok: false, error: "Не указан игрок" });
      return;
    }

    const result = kickCodenamesPlayer(roomCode, playerId, targetPlayerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Отправляем событие удалённому игроку
    const kickedSocketId = codenamesPlayerSockets.get(targetPlayerId);
    if (kickedSocketId) {
      io.to(kickedSocketId).emit("codenames:player:kicked", { 
        message: "Вы были удалены из комнаты хостом" 
      });
    }

    // Синхронизируем состояние для остальных
    result.room.players.forEach(p => {
      if (p.connectionStatus === "kicked") return;
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true, kickedPlayerName: result.kickedPlayerName });
  });

  socket.on("codenames:settings:update", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { settings } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = updateCodenamesSettings(roomCode, playerId, settings);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // Обновление профиля игрока (синхронизация никнейма/аватара из профиля)
  socket.on("codenames:player:update_profile", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const { nickname, avatarUrl } = payload || {};
    const room = getCodenamesRoom(roomCode);
    
    if (!room) {
      if (ack) ack({ ok: false, error: "Комната не найдена" });
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      if (ack) ack({ ok: false, error: "Игрок не найден" });
      return;
    }

    // Обновляем данные игрока
    if (nickname && nickname.trim()) {
      player.name = nickname.trim().slice(0, 20);
    }
    if (avatarUrl !== undefined) {
      player.avatarUrl = avatarUrl;
    }

    // Отправляем обновлённое состояние всем в комнате
    room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CODENAMES PAUSE/RESUME
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on("codenames:game:pause", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = pauseCodenamesGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Останавливаем серверный таймер
    stopCodenamesTimer(roomCode);

    // Уведомляем всех игроков
    io.to(`codenames:${roomCode}`).emit("codenames:game:paused", { isPaused: true });

    // Отправляем обновлённое состояние
    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:game:resume", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }

    const result = resumeCodenamesGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Запускаем серверный таймер с оставшимся временем
    const room = result.room;
    if (room.guessTimerEndsAt) {
      const remainingMs = room.guessTimerEndsAt - Date.now();
      if (remainingMs > 0) {
        startCodenamesTimer(roomCode, Math.ceil(remainingMs / 1000), io);
      }
    }

    // Уведомляем всех игроков
    io.to(`codenames:${roomCode}`).emit("codenames:game:paused", { isPaused: false });

    // Отправляем обновлённое состояние
    room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("disconnect", async () => {
    console.log("[Socket Disconnect] Socket ID:", socket.id, "aliasPlayerId:", socket.data.aliasPlayerId, "aliasRoomId:", socket.data.aliasRoomId);
    
    // Очищаем таймер автовыхода при отключении
    const autoLeaveTimerId = roomAutoLeaveTimers.get(socket.id);
    if (autoLeaveTimerId) {
      clearTimeout(autoLeaveTimerId);
      roomAutoLeaveTimers.delete(socket.id);
    }
    
    // Handle Codenames disconnect
    if (socket.data.codenamesPlayerId && socket.data.codenamesRoomCode) {
      const playerId = socket.data.codenamesPlayerId;
      const roomCode = socket.data.codenamesRoomCode;
      
      const currentSocketId = codenamesPlayerSockets.get(playerId);
      if (currentSocketId && currentSocketId !== socket.id) {
        // Игрок уже переподключился через другой сокет
      } else {
        const room = getCodenamesRoom(roomCode);
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.connectionStatus = "disconnected";
            player.lastSeen = new Date();
            
            // Уведомляем других игроков
            room.players.forEach(p => {
              const socketId = codenamesPlayerSockets.get(p.id);
              if (socketId && p.id !== playerId) {
                io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
              }
            });
          }
        }
        codenamesPlayerSockets.delete(playerId);
      }
    }

    // Handle Alias disconnect
    if (socket.data.aliasPlayerId && socket.data.aliasRoomId) {
      const aliasPlayerId = socket.data.aliasPlayerId;
      const aliasRoomId = socket.data.aliasRoomId;
      
      // Проверяем, что отключающийся сокет действительно является актуальным для этого игрока
      // Если игрок уже переподключился через другой сокет - не помечаем его как disconnected
      const currentSocketId = aliasPlayerSockets.get(aliasPlayerId);
      console.log("[Alias Disconnect] Player:", aliasPlayerId, "currentSocketId:", currentSocketId, "this socket.id:", socket.id);
      
      if (currentSocketId && currentSocketId !== socket.id) {
        console.log("[Alias Disconnect] Ignoring disconnect from stale socket for player:", aliasPlayerId);
        return; // Этот сокет устарел, игрок уже подключен через новый сокет
      }
      
      try {
        const player = await prisma.aliasPlayer.findUnique({ where: { id: aliasPlayerId } });
        if (player) {
          console.log("[Alias Disconnect] Marking player as disconnected:", aliasPlayerId, player.name);
          await prisma.aliasPlayer.update({
            where: { id: aliasPlayerId },
            data: { connectionStatus: "disconnected", lastSeen: new Date() }
          });
          
          // Сообщаем другим игрокам о дисконнекте
          io.to(`alias:${aliasRoomId}`).emit("alias:player:disconnected", { 
            playerId: aliasPlayerId, 
            playerName: player.name 
          });
          
          const state = await buildAliasRoomState(prisma, aliasRoomId);
          io.to(`alias:${aliasRoomId}`).emit("alias:state:sync", state);
        }
      } catch (e) {
        console.error("Alias disconnect error:", e);
      }
      aliasPlayerSockets.delete(aliasPlayerId);
    }

    // Handle Truth or Dare disconnect
    if (socket.data.playerId && socket.data.roomId) {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;
      
      try {
        // Обновляем статус на disconnected (временный разрыв связи)
        const player = await prisma.player.update({
          where: { id: playerId },
          data: { 
            lastSeen: new Date(),
            connectionStatus: "disconnected"
          }
        });
        
        // Уведомляем всех в комнате об изменении статуса
        io.to(roomId).emit("player:connection_status", {
          playerId,
          connectionStatus: "disconnected",
          playerName: player.name
        });
        
        // Обновляем состояние комнаты
        await emitRoomState(roomId);
        
      } catch (error) {
        // Ignore missing player records.
      }
      playerSockets.delete(playerId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
