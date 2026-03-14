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

async function resolveUserId(prisma, targetId) {
  if (!targetId) return null;

  const byId = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (byId) return byId.id;

  const byVisitor = await prisma.user.findFirst({
    where: { visitorId: targetId },
    select: { id: true },
  });

  return byVisitor?.id ?? null;
}

const { customAlphabet } = require("nanoid");
const { getWheelData, pickWheel1, pickWheel2, pickWheel2ForChaos, pickTruthQuestion, pickChaosTruthQuestion, getRandomShameTitle } = require("./game/wheels");
const { PrismaSessionStore } = require("./auth/session-store");
const { createAuthRouter } = require("./auth/routes");
const { createOAuthRouter } = require("./auth/oauth");
const { createSubscriptionRouter, registerUserSocket, unregisterUserSocket } = require("./subscription/routes");
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
  recordTodRoundComplete,
  recordTodGameComplete,
  recordTodChaosEscape,
  recordTodRedemption,
  recordAliasTurnComplete,
  recordAliasGameComplete,
  recordEmotionalRoundComplete,
  recordEmotionalGameComplete,
  recordCodenamesRoundComplete,
  recordCodenamesGameComplete,
  unlockAchievementByEvent,
  updateUserStatsById,
  // ������������ ������� � ���� (����/�����)
  recordPlayerJoin,
  recordPlayerLeave
} = require("./game/stats");

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
  getRoom: getEmotionalRoom,
  joinRoom: joinEmotionalRoom,
  leaveRoom: leaveEmotionalRoom,
  disconnectPlayer: disconnectEmotionalPlayer,
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
  reshuffleDeck: reshuffleEmotionalDeck,

  // Pause functions
  pauseGame: pauseEmotionalGame,
  resumeGame: resumeEmotionalGame,
  isGamePaused: isEmotionalGamePaused,

  buildRoomState: buildEmotionalRoomState
} = require("./game/emotional");

// Social Module (Friends, Blocking)
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getPendingRequestsCount,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getFriendshipStatus,
  searchUsers,
  getPublicProfile,
} = require("./social/friends");

// Messages Module (Private Chats)
const {
  getOrCreateConversation,
  getConversations,
  deleteConversation,
  sendMessage,
  editMessage,
  getMessages,
  getMessagesByPartner,
  markAsRead,
  readUpTo,
  getUnreadCount,
  sendGameInvite,
} = require("./social/messages");

// Profile Module (Full Profile)
const {
  registerProfileHandlers,
  recordActivity,
} = require("./social/profile");

// Friends Handlers Module (Socket.IO handlers for friends)
const {
  registerFriendsHandlers,
} = require("./social/friendsHandlers");

// Activity Module (Discord-style activity tracking)
const {
  startSession: startActivitySession,
  endSession: endActivitySession,
  updateSessionPlayers,
  getCurrentActivity,
  getFullActivityData,
  registerActivityHandlers,
  activeSessions,
  GAMES_MAP: ACTIVITY_GAMES_MAP
} = require("./social/activity");

// Clans Module
const {
  createClan,
  deleteClan,
  updateClan,
  updateClanAvatar,
  getClan,
  getUserClan,
  searchClans,
  getPopularClans,
  joinClan,
  leaveClan,
  kickMember,
  getClanMembers,
  requestJoinClan,
  acceptClanRequest,
  rejectClanRequest,
  cancelClanRequest,
  getClanRequests,
  getMyClanRequests,
  promoteMember,
  demoteMember,
  transferLeadership,
  sendClanMessage,
  getClanMessages,
  deleteClanMessage,
  reportClan,
  getClanReports,
  resolveReport,
  REPORT_REASONS,
} = require("./social/clans");

// Codenames timer management - ������������ hint -> overtime -> guess -> end
function startCodenamesTimer(roomCode, durationSeconds, io) {
  // ������� ���������� ������ ���� ����
  stopCodenamesTimer(roomCode);

  const intervalId = setInterval(() => {
    const room = getCodenamesRoom(roomCode);
    if (!room || room.status !== "playing") {
      stopCodenamesTimer(roomCode);
      return;
    }

    const now = Date.now();

    // ��������� ���� hint - ���� ������� � ��������� ���, ������������� � overtime
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

    // ��������� ����� ������ (guessTimerEndsAt) - ���� ����, ��������� ���
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

        // ��������� ����� ������ ��� ���������� ����
        if (result.startTimer && result.timerDuration) {
          startCodenamesTimer(roomCode, result.timerDuration, io);
        }
      }
    }
  }, 500); // ��������� ���� ��� ����� ������� ������������

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

    // ���� ���� �� ����� � ���������� ��� �������
    if (isEmotionalGamePaused(roomCode)) {
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

    // Reveal: 2 ������� ����� �������� ����, ����� ���������� �� ����� ����� ������� ������ 0.5�.
    if (room.phase === "reveal") {
      const startedAt = room.revealStartedAt || nowMs;
      const waitMs = 2000;
      const stepMs = 500;

      const elapsed = nowMs - startedAt;
      const shouldRevealCount = elapsed < waitMs ? 0 : Math.floor((elapsed - waitMs) / stepMs) + 1;

      const table = Array.isArray(room.table) ? room.table : [];
      const targetCount = Math.max(0, Math.min(table.length, shouldRevealCount));

      // �������� ��������� ����� (��������� ��� ���������)
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

      // ����� ��� �������� � ��������� � vote
      const allRevealed = table.length > 0 && Object.keys(room.revealedSlotIds).length >= table.length;
      if (allRevealed) {
        // ������ ����� ������� ���� ���, ����� �� ��������� �������� ���������� ���������� ���������� �������.
        if (!room.allRevealedAt) {
          room.allRevealedAt = nowMs;
          changed = true;
        }

        // ��������� � vote ������ ����� 1 ������� ����� ��������� ���� ����.
        if (room.allRevealedAt && nowMs - room.allRevealedAt >= 1000) {
          advanceEmotionalRevealToVote(room, nowMs);
          changed = true;
        }
      }

      // �����: state sync ������ ������ ���� ���-�� ����������, ����� �� ������� 2 ���� � �������.
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

      // ���������� ���������� ��� ������� ������, ��� ��������� (������� �����������)
      const leaderId = room.leaderId;
      const leaderSlot = room.table?.find(s => s.playerId === leaderId);
      const leaderSlotId = leaderSlot?.slotId;

      (async () => {
        for (const player of room.players) {
          if (player.id === leaderId) continue;
          if (!player.visitorId) continue;

          const votedSlotId = room.votes?.[player.id];
          if (votedSlotId) {
            const guessedCorrectly = votedSlotId === leaderSlotId;
            try {
              await recordEmotionalRoundComplete(player.visitorId, guessedCorrectly, io);
            } catch (e) {
              console.error("[Stats] Emotional round error (timer):", e);
            }
          }
        }

        // ���������, ����������� �� ����
        if (room.status === "ended") {
          const targetScore = room.settings?.targetScore ?? 15;
          const winnerPlayerIds = Object.entries(room.scores || {})
            .filter(([, score]) => score >= targetScore)
            .map(([playerId]) => playerId);
          const winnerSet = new Set(winnerPlayerIds);

          // ��������� ����� ���� � ��������
          const gameStartedAt = room.gameStartedAt;
          const timePlayed = gameStartedAt ? Math.floor((Date.now() - gameStartedAt) / 1000) : 0;

          console.log("[Stats] Emotional game ended (timer) - gameStartedAt:", gameStartedAt, "timePlayed:", timePlayed);

          for (const player of room.players) {
            if (!player.visitorId) continue;
            const won = winnerSet.has(player.id);
            try {
              await recordEmotionalGameComplete(player.visitorId, won, io, timePlayed);
            } catch (e) {
              console.error("[Stats] Emotional game complete error (timer):", e);
            }
          }
        }
      })();

      room.players.forEach((p) => {
        const socketId = emotionalPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
        }
      });
      return;
    }

    // �������� 10: ������� ����� ����� 5 ������ ����� ������ �����������
    if (room.phase === "results" && room.resultsShownAt && !room.tableCleared) {
      const elapsedMs = nowMs - room.resultsShownAt;
      if (elapsedMs >= 5000) {
        room.table = [];
        room.tableCleared = true;
        room.updatedAt = new Date();

        room.players.forEach((p) => {
          const socketId = emotionalPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
          }
        });
      }
    }

    // ���������������: ������ ���������� ������ ����� 5 ������ ����� ������� �����
    // ������������� autoAdvanceAt ����� ��� ������� ����� (� ��� �� ����)
    if (room.phase === "results" && room.tableCleared && room.settings?.autoAdvance && !room.autoAdvanceAt) {
      room.autoAdvanceAt = nowMs + 5000; // 5 ������ ����� ������� �����
    }

    // ���������, ���� �� ��������� ��������� �����
    if (room.phase === "results" && room.autoAdvanceAt && nowMs >= room.autoAdvanceAt) {
      const result = startEmotionalNextRound(roomCode, room.hostId, nowMs);
      room.autoAdvanceAt = null;

      if (!result.error) {
        room.players.forEach((p) => {
          const socketId = emotionalPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
          }
        });
      }
    }

    // ��������������� ��� no_contest: ��������� ��������� ����� ����� 5 ������
    if (room.phase === "no_contest" && room.settings?.autoAdvance && !room.autoAdvanceAt) {
      room.autoAdvanceAt = nowMs + 5000;
    }

    if (room.phase === "no_contest" && room.autoAdvanceAt && nowMs >= room.autoAdvanceAt) {
      const result = startEmotionalNextRound(roomCode, room.hostId, nowMs);
      room.autoAdvanceAt = null;

      if (!result.error) {
        room.players.forEach((p) => {
          const socketId = emotionalPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(room, p.id));
          }
        });
      }
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

// Trust proxy ��� ���������� ������ �� reverse proxy (Cloudflare, nginx � �.�.)
app.set("trust proxy", 1);

// ===========================================================================
// MIDDLEWARE
// ===========================================================================
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Session store
const sessionStore = new PrismaSessionStore(prisma, {
  ttl: 7 * 24 * 60 * 60 * 1000 // 7 ����
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
    // SameSite=None требует Secure=true (HTTPS) в проде
    secure: IS_PRODUCTION,
    // Если фронт и бэкенд на разных доменах/сабдоменах, для WebSocket нужны cookies с SameSite=None
    sameSite: IS_PRODUCTION ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ����
  }
});

app.use(sessionMiddleware);

// Static files for avatars
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// ===========================================================================
// API ROUTES
// ===========================================================================
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/wheels", (req, res) => {
  res.json(getWheelData());
});

// OAuth routes (Discord, Google)
app.use("/api", createOAuthRouter(prisma));

// Auth routes ������������ ����� �������� io (��. ����)

// ===========================================================================
// STATIC FILES (Client)
// ===========================================================================
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    // �� ������������� API � uploads
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ===========================================================================
// SOCKET.IO
// ===========================================================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true
  },
  // Чтобы не было ложных disconnect (особенно на мобильных/при переключении вкладок)
  // Оставляем значения близкие к дефолтным Socket.IO.
  pingInterval: 25000,
  pingTimeout: 20000
});

// Auth routes (����� �������� io)
app.use("/api", createAuthRouter(prisma, sessionStore, io));

// Subscription routes (�������� � �������)
// ������� io ��� �������� real-time ����������� � ������� ��������
app.use("/api/subscription", createSubscriptionRouter(prisma, io));

// ���������� session � Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ��������� userId � socket.data ���� �����������
io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.userId) {
    socket.data.userId = session.userId;
    // ������������ ����� ��� ����������� � ��������
    registerUserSocket(session.userId, socket.id);
  }
  next();
});

// ��������� �������� visitorId � ������������ (��� ���������� � ����������)
io.on("connection", (socket) => {
  socket.on("user:bind:visitorId", async (visitorId, ack) => {
    if (!socket.data.userId || !visitorId) {
      return ack?.({ error: "Not authenticated or no visitorId" });
    }
    try {
      await prisma.user.update({
        where: { id: socket.data.userId },
        data: { visitorId }
      });
      console.log("[User] Bound visitorId", visitorId, "to user", socket.data.userId);
      ack?.({ ok: true });
    } catch (err) {
      console.error("[User] Failed to bind visitorId:", err);
      ack?.({ error: "Failed to bind visitorId" });
    }
  });
});

// Обработка отключения и удаления сокета на уровне подписки
io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    if (socket.data.userId) {
      unregisterUserSocket(socket.data.userId, socket.id);
      // End activity session when user disconnects
      endActivitySession(socket.data.userId).catch(e => console.error("[Activity] End session error:", e));
    }
  });
});

const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
const roomTimers = new Map();
const votingTimers = new Map(); // ��������� ������� ��� �����������
const taskAcceptTimers = new Map(); // ������� �� �������� ������� (pending)
const taskAcceptStartTimeouts = new Map(); // roomId -> timeoutId (���������� ����� ������� ��������)
const wheel2SpinMeta = new Map(); // roundId -> { startedAtMs, durationMs }
const wheel1SpinMeta = new Map(); // roundId -> { startedAtMs, durationMs }
const pausedRooms = new Map(); // ��������� ����� ��� ������: { isPaused, remainingWhenPaused, roundId }
const playerSockets = new Map();
const userSockets = new Map(); // Map<userId, Set<socketId>> for friends notifications
const userOfflineTimers = new Map(); // Map<userId, timeoutId> (grace to avoid offline flicker)

function normalizeSocketSet(value) {
  if (!value) return null;
  if (value instanceof Set) return value;
  if (typeof value === "string") return new Set([value]);
  if (Array.isArray(value)) return new Set(value);
  return null;
}

function getSocialUserSocketSet(userId) {
  if (!userId) return null;
  const current = userSockets.get(userId);
  const set = normalizeSocketSet(current);
  if (!set) return null;
  // self-heal in case older code saved a string
  if (set !== current) {
    userSockets.set(userId, set);
  }
  return set;
}

function addSocialUserSocket(userId, socketId) {
  if (!userId || !socketId) return;
  const set = getSocialUserSocketSet(userId) || new Set();
  set.add(socketId);
  userSockets.set(userId, set);
}

function removeSocialUserSocket(userId, socketId) {
  if (!userId || !socketId) return 0;
  const set = getSocialUserSocketSet(userId);
  if (!set) return 0;
  set.delete(socketId);
  if (set.size === 0) {
    userSockets.delete(userId);
    return 0;
  }
  return set.size;
}

function forEachSocialUserSocket(userId, fn) {
  const set = getSocialUserSocketSet(userId);
  if (!set || !set.size) return;
  for (const sid of set) {
    try {
      fn(sid);
    } catch (e) {
      // ignore
    }
  }
}

function emitToSocialUser(userId, event, data) {
  forEachSocialUserSocket(userId, (sid) => {
    io.to(sid).emit(event, data);
  });
}

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

const VOTING_TIME_SECONDS = 30; // ����� �� �����������
const TASK_ACCEPT_TIME_SECONDS = 30; // ����� �� �������� �������

// Helper function to track game activity session
async function trackGameSession(socket, gameType, roomCode) {
  let userId = socket.data.userId;
  const visitorId = socket.data.visitorId;

  console.log(`[Activity] trackGameSession called: gameType=${gameType}, roomCode=${roomCode}, userId=${userId}, visitorId=${visitorId}`);

  // Если userId не установлен, попробуем получить его через visitorId
  if (!userId && visitorId) {
    try {
      const user = await prisma.user.findFirst({
        where: { visitorId: visitorId },
        select: { id: true }
      });
      if (user) {
        userId = user.id;
        socket.data.userId = userId; // Сохраняем для будущих вызовов
        console.log(`[Activity] Found userId ${userId} by visitorId ${visitorId}`);
      } else {
        console.log(`[Activity] No user found for visitorId ${visitorId}`);
      }
    } catch (e) {
      console.error(`[Activity] Error finding user by visitorId:`, e);
    }
  }

  if (userId) {
    try {
      await startActivitySession(userId, gameType, roomCode);
      console.log(`[Activity] Started ${gameType} session for user ${userId} in room ${roomCode}`);
    } catch (e) {
      console.error(`[Activity] ${gameType} session start error:`, e);
    }
  } else {
    console.log(`[Activity] No userId available, skipping session tracking`);
  }
}

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

  // ���������� ������, ��� ������ ��� (������ ��������, �� left/disconnected)
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
    players: players.map(p => ({
      ...p,
      nicknameStyle: p.nicknameStyle ? JSON.parse(p.nicknameStyle) : null
    })),
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
  // ��������� ������ �������� ������� (online, �� left)
  const activePlayers = players.filter((p) => p.connectionStatus !== "left");
  if (!activePlayers.length) {
    return null;
  }
  const total = activePlayers.length;
  const safeIndex = startIndex % total;
  for (let offset = 0; offset < total; offset += 1) {
    const idx = (safeIndex + offset) % total;
    const candidate = activePlayers[idx];
    // ���������� disconnected ������� � ��� ��������� � ����������
    if (candidate.connectionStatus === "disconnected") {
      continue;
    }
    // Status can be "active", "shamed", or "chaos" - all playable
    return { player: candidate, nextIndex: (idx + 1) % total };
  }
  // ���� ��� �������� ������ disconnected � ���������� �������
  return { player: activePlayers[safeIndex], nextIndex: (safeIndex + 1) % total };
}

function stopTimer(roomId) {
  const entry = roomTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    roomTimers.delete(roomId);
  }
  // ����� ������� ��������� ����� ��� ��������� �������
  const wasPaused = pausedRooms.has(roomId);
  pausedRooms.delete(roomId);
  // ���������� �������� � ������ �����, ���� ���� ���� �� �����
  if (wasPaused) {
    io.to(roomId).emit("game:paused", { isPaused: false });
  }
}

function pauseTimer(roomId) {
  const entry = roomTimers.get(roomId);
  if (!entry) {
    return false;
  }

  // ������������� ��������, �� ��������� ���������� �����
  clearInterval(entry.intervalId);
  pausedRooms.set(roomId, {
    isPaused: true,
    remainingWhenPaused: entry.remaining,
    roundId: entry.roundId
  });
  roomTimers.delete(roomId);

  // ���������� �������� � �����
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

  // ���������� �������� � ������ �����
  io.to(roomId).emit("game:paused", { isPaused: false });

  // ��������� ������ �������� (��� ������ stopTimer, ����� �� �������� ���������)
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

  // ��������� ������ �����������
  await startVotingTimer(roomId, roundId);

  await maybeFinalizeVote(roomId, roundId);
}

// =============================================================================
// ������ �������� ������� (30 ������) � ����� ���� �� �������� �� pending
// =============================================================================

function stopTaskAcceptTimer(roomId) {
  const entry = taskAcceptTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    taskAcceptTimers.delete(roomId);
  }
}

async function startTaskAcceptTimer(roomId, roundId, seconds = TASK_ACCEPT_TIME_SECONDS) {
  // ���� ��� ������������ ���������� ����� � �������
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

  // �� ��������� ������� ������������� �������, ��� ����� ���������.
  // ��� ������������� ��������� ���� �������.
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

// ===========================================================================
// ������ ����������� (30 ������)
// ===========================================================================

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

  // ������������� ��������� ����������� �� ������� �����������
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

  // ���������� ��������� �� ��������� �������
  const threshold = getMajorityThreshold(eligibleCount);
  let result = "approved"; // �� ��������� ����������� ���� ��� ����������� ��������

  if (counts.report >= threshold) {
    result = "report";
  } else if (counts.approve >= threshold) {
    result = "approved";
  } else if (counts.total > 0) {
    // ���� ���� ������, �� ��� ����������� � ������ �� ����������� ���������
    if (counts.report > counts.approve) {
      result = "report";
    } else {
      result = "approved"; // ��� ��������� ��� ����������� approve � �����������
    }
  }
  // ���� ����� �� ������������ � ����������� (approved)

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

    // ���������� ���������� ��� ����������
    try {
      // ��������� ������������ ������ � ��������
      const roundDuration = round.startedAt ? Math.floor((Date.now() - new Date(round.startedAt).getTime()) / 1000) : 0;
      await recordTodRoundComplete(round.currentPlayerId, round.mode, result === "approved", io, roundDuration);
    } catch (err) {
      console.error("[Stats] Error recording ToD round (timeout):", err);
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

        // ���������� ���������� ������ �� ����� ��� ����������
        try {
          await recordTodChaosEscape(playerId, io);
          console.log("[Stats] Recorded chaos escape for player:", playerId);
        } catch (e) {
          console.error("[Stats] Error recording chaos escape:", e);
        }
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

        // ���������� ���������� ������ ������ ��� ����������
        try {
          await recordTodRedemption(playerId, io);
          console.log("[Stats] Recorded redemption for player:", playerId);
        } catch (e) {
          console.error("[Stats] Error recording redemption:", e);
        }
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

  // ��� ������������� � ������������� ������ �����������
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

    // ���������� ���������� ��� ����������
    try {
      // ��������� ������������ ������ � ��������
      const roundDuration = round.startedAt ? Math.floor((Date.now() - new Date(round.startedAt).getTime()) / 1000) : 0;
      await recordTodRoundComplete(round.currentPlayerId, round.mode, result === "approved", io, roundDuration);
    } catch (err) {
      console.error("[Stats] Error recording ToD round:", err);
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

// ������� ���������� �� ������ (5 �����)
const roomAutoLeaveTimers = new Map();
const ROOM_AUTO_LEAVE_MS = 5 * 60 * 60 * 1000; // 5 �����

// ��������������� ������� ��� ������ �� ���� ������ ����� �������������� � �����
async function leaveAllRooms(socket) {
  console.log("[leaveAllRooms] Called for socket:", socket.id,
    "tod:", socket.data.roomId, socket.data.playerId,
    "alias:", socket.data.aliasRoomId, socket.data.aliasPlayerId,
    "emotional:", socket.data.emotionalRoomCode, socket.data.emotionalPlayerId,
    "codenames:", socket.data.codenamesRoomCode, socket.data.codenamesPlayerId,
    "visitorId:", socket.data.visitorId);

  // ����� �� Truth or Dare
  if (socket.data.roomId && socket.data.playerId) {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    try {
      // �������� visitorId ����� ����������� ��� ������ �������
      const playerData = await prisma.player.findUnique({
        where: { id: playerId },
        select: { visitorId: true }
      });

      await prisma.player.update({
        where: { id: playerId },
        data: { connectionStatus: "left", lastSeen: new Date() }
      });
      playerSockets.delete(playerId);
      socket.leave(roomId);

      // ���������� ����� � ����
      if (playerData?.visitorId) {
        recordPlayerLeave(playerData.visitorId, "tod", io);
      }

      const state = await buildRoomState(roomId);
      io.to(roomId).emit("player:list", state.players);
      io.to(roomId).emit("player:left", { playerId });
    } catch (e) {
      console.error("leaveAllRooms: Truth or Dare error:", e);
    }
    socket.data.roomId = null;
    socket.data.playerId = null;
  }

  // ����� �� Alias
  if (socket.data.aliasRoomId && socket.data.aliasPlayerId) {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    try {
      const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
      const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
      const oldTeamId = player?.teamId;

      // ���������� ����� � ����
      if (player?.visitorId) {
        recordPlayerLeave(player.visitorId, "alias", io);
      }

      // �������� �����
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

      await prisma.aliasPlayer.delete({ where: { id: playerId } }).catch(() => { });

      if (oldTeamId) {
        const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
        if (remaining === 0) {
          await prisma.aliasTeam.delete({ where: { id: oldTeamId } }).catch(() => { });
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

  // ����� �� Emotional � ���������� disconnect ������ leave, ����� ��������� �����
  // Leave ����� ������ ������ ���� ����� emotional:room:leave
  if (socket.data.emotionalRoomCode && socket.data.emotionalPlayerId) {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;
    try {
      // �������� gameStartedAt �� ������� ��� fallback ��� ������ �������
      const emotionalRoomForTime = getEmotionalRoom(roomCode);
      const emotionalGameStartedAtForTime = emotionalRoomForTime?.gameStartedAt || null;

      // ���������� ����� � ���� (���������� visitorId �� socket.data ���� ����)
      const emotionalVisitorId = socket.data.visitorId;
      if (emotionalVisitorId) {
        recordPlayerLeave(emotionalVisitorId, "emotional", io, emotionalGameStartedAtForTime);
      }

      // ���������� disconnectPlayer ������ leaveRoom � ����� �������� � ������
      const result = disconnectEmotionalPlayer(roomCode, playerId);
      socket.leave(`emotional:${roomCode}`);
      emotionalPlayerSockets.delete(playerId);

      if (result.room) {
        result.room.players.forEach(p => {
          if (p.id === playerId) return;
          if (p.connectionStatus === "left" || p.connectionStatus === "kicked") return;
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

  // ����� �� Codenames
  if (socket.data.codenamesRoomCode && socket.data.codenamesPlayerId) {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    try {
      // �������� gameStartedAt �� ������� ��� fallback ��� ������ �������
      const codenamesRoomForTime = getCodenamesRoom(roomCode);
      const codenamesGameStartedAt = codenamesRoomForTime?.gameStartedAt || null;

      // ���������� ����� � ����
      const codenamesVisitorId = socket.data.visitorId;
      if (codenamesVisitorId) {
        recordPlayerLeave(codenamesVisitorId, "codenames", io, codenamesGameStartedAt);
      }

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

  // ������� ������ ����������
  const timerId = roomAutoLeaveTimers.get(socket.id);
  if (timerId) {
    clearTimeout(timerId);
    roomAutoLeaveTimers.delete(socket.id);
  }
}

// ������������� ������ ���������� �� ������� ����� 5 �����
function setAutoLeaveTimer(socket) {
  // ������� ���������� ������, ���� ����
  const existingTimerId = roomAutoLeaveTimers.get(socket.id);
  if (existingTimerId) {
    clearTimeout(existingTimerId);
  }

  const timerId = setTimeout(async () => {
    console.log(`Auto-leaving rooms for socket ${socket.id} after 5 hours`);
    await leaveAllRooms(socket);
    socket.emit("auto:leave", { reason: "timeout", message: "�� ���� ������������� ��������� ����� 5 ����� �����������" });
    roomAutoLeaveTimers.delete(socket.id);
  }, ROOM_AUTO_LEAVE_MS);

  roomAutoLeaveTimers.set(socket.id, timerId);
}

io.on("connection", (socket) => {
  socket.on("room:create", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const visitorId = payload?.visitorId || null;
    const frameSlug = payload?.frameSlug || null;
    if (!name) {
      if (ack) {
        ack({ ok: false, error: "Name required" });
      }
      return;
    }

    // ������� �� ���� ���������� ������ ����� ��������� �����
    await leaveAllRooms(socket);

    // �������� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
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
        visitorId,
        frameSlug,
        nicknameStyle: nicknameStyle ? JSON.stringify(nicknameStyle) : null
      }
    });
    await prisma.room.update({
      where: { id: room.id },
      data: { hostId: player.id }
    });

    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    playerSockets.set(player.id, socket.id);
    socket.join(room.id);
    setAutoLeaveTimer(socket);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "tod");
      trackGameSession(socket, "tod", room.code);
    }

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
    const frameSlug = payload?.frameSlug || null;
    if (!name || !code) {
      if (ack) {
        ack({ ok: false, error: "Name and code required" });
      }
      return;
    }

    // ������� �� ���� ���������� ������ ����� ��������������
    await leaveAllRooms(socket);

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      if (ack) {
        ack({ ok: false, error: "Room not found" });
      }
      return;
    }

    // ��������� ���-����
    const settings = normalizeSettings(room.settings);
    const bannedVisitorIds = settings.bannedVisitorIds || [];
    if (visitorId && bannedVisitorIds.includes(visitorId)) {
      if (ack) {
        ack({ ok: false, error: "banned", message: "�� ���� ��������� �� ���� ������� �������������" });
      }
      return;
    }

    const players = await prisma.player.findMany({
      where: { roomId: room.id }
    });

    // ���������, ���� �� ����� � ����� ������ �� �������� disconnected (���������)
    const disconnectedPlayer = players.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p.connectionStatus === "disconnected"
    );

    if (disconnectedPlayer) {
      // ��������� � ��������������� ������
      const player = await prisma.player.update({
        where: { id: disconnectedPlayer.id },
        data: {
          connectionStatus: "online",
          lastSeen: new Date()
        }
      });

      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      socket.data.visitorId = player.visitorId; // ��������� ��� ������ ������� ��� ������
      playerSockets.set(player.id, socket.id);
      socket.join(room.id);
      setAutoLeaveTimer(socket);

      // ���������� ���� � ����������
      io.to(room.id).emit("player:connection_status", {
        playerId: player.id,
        connectionStatus: "online",
        playerName: player.name
      });

      const state = await buildRoomState(room.id);
      io.to(room.id).emit("player:list", state.players);
      io.to(room.id).emit("room:state", state);

      // ��������� ���������� �������� �������� ������ ��� ������������������� �������
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

      // ���������� ����� ����� � ���� ��� ����������
      recordPlayerJoin(visitorId, "tod");
      trackGameSession(socket, "tod", room.code);

      if (ack) {
        ack({ ok: true, state, playerId: player.id, reconnected: true });
      }
      return;
    }

    // ������� ������ �������� ������� (�� left) ��� �������� ������
    const activePlayersCount = players.filter((p) => p.connectionStatus !== "left").length;
    if (activePlayersCount >= MAX_PLAYERS) {
      if (ack) {
        ack({ ok: false, error: "Room is full" });
      }
      return;
    }

    // ����� ������� ������ ��������� �������� (�� left)
    const takenNames = players
      .filter((p) => p.connectionStatus !== "left")
      .map((player) => player.name.toLowerCase());
    const finalName = makeUniqueName(name, takenNames);

    // �������� avatarUrl � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
    }

    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        name: finalName,
        avatarUrl,
        visitorId,
        frameSlug,
        nicknameStyle: nicknameStyle ? JSON.stringify(nicknameStyle) : null,
        connectionStatus: "online"
      }
    });

    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    playerSockets.set(player.id, socket.id);
    socket.join(room.id);
    setAutoLeaveTimer(socket);

    const state = await buildRoomState(room.id);
    io.to(room.id).emit("player:list", state.players);
    io.to(room.id).emit("room:state", state);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "tod");
      trackGameSession(socket, "tod", room.code);
    }

    if (ack) {
      ack({ ok: true, state, playerId: player.id });
    }
  });

  // ---------------------------------------------------------------------------
  // room:rejoin � �������������� ������ ����� F5/���������������
  // ---------------------------------------------------------------------------
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
      // ������� ������� �� ����
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) {
        console.log("[Rejoin] Room not found:", roomCode);
        if (ack) {
          ack({ ok: false, error: "Room not found" });
        }
        return;
      }

      // ������� ������
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player) {
        console.log("[Rejoin] Player not found:", playerId);
        if (ack) {
          ack({ ok: false, error: "Player not found" });
        }
        return;
      }

      // ���������, ��� ����� ����������� ���� �������
      if (player.roomId !== room.id) {
        console.log("[Rejoin] Player does not belong to room:", playerId, room.id);
        if (ack) {
          ack({ ok: false, error: "Player not in this room" });
        }
        return;
      }

      // ���������, ��� ����� �� ������� ������� (left)
      if (player.connectionStatus === "left") {
        console.log("[Rejoin] Player has left the room:", playerId);
        if (ack) {
          ack({ ok: false, error: "Player has left the room" });
        }
        return;
      }

      // ���� � ������ ��� ���� �������� ����� � ��������� ������ (��� �������)
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

      // ��������� ������ ������ �� online
      await prisma.player.update({
        where: { id: playerId },
        data: {
          connectionStatus: "online",
          lastSeen: new Date()
        }
      });

      // ����������� ����� � ������� � ������
      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      socket.data.visitorId = player.visitorId; // Сохраняем для activity tracking
      playerSockets.set(player.id, socket.id);
      socket.join(room.id);

      // Activity tracking: start session on rejoin
      if (player.visitorId) {
        trackGameSession(socket, "tod", room.code);
      }

      console.log("[Rejoin] Success:", player.name, "->", room.code);

      // ���������� ���� � ����������� ������
      io.to(room.id).emit("player:connection_status", {
        playerId: player.id,
        connectionStatus: "online",
        playerName: player.name
      });

      // ���������� ���������� ��������� �������
      const state = await buildRoomState(room.id);
      io.to(room.id).emit("player:list", state.players);
      io.to(room.id).emit("room:state", state);

      // ��������� ���������� �������� �������� ��� ����� ������������������� �������
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

    // ����������, ��� ������ ��� (currentTurnPlayer)
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

    // ��������� �����: ������ ���� ��� �����, ��� ���, ����� ������ �����
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

    // targetPlayerId - ��� �����, �������� �������� ������/��������
    // currentTurnPlayerId - ��� �����, ��� ��� (�� �������� targetPlayer)
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

    // � ��������� ������ ������ �������� ������ � ����
    if (wantsCustom && targetPlayer.status === "chaos") {
      if (ack) {
        ack({ ok: false, error: "������ ������� ���� � ������ ������ �������" });
      }
      return;
    }

    const round = await prisma.round.create({
      data: {
        roomId: room.id,
        currentPlayerId: targetPlayerId, // ���, ��� ��������� �������
        turnPlayerId: currentTurnPlayerId, // ���, ��� ��� (��������)
        timerSeconds: settings.timerSeconds || 120,
        phase: "mode",
        taskStatus: "pending",
        taskAcceptedAt: null,
        customMode: wantsCustom,
        customAuthorPlayerId: wantsCustom ? currentTurnPlayerId : null
      }
    });

    // ������������� gameStartedAt ��� ������ ������ (���� ��� �� �����������)
    if (!room.gameStartedAt) {
      await prisma.room.update({
        where: { id: room.id },
        data: { gameStartedAt: new Date() }
      });
    }

    io.to(room.id).emit("round:start", {
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      turnPlayerId: round.turnPlayerId,
      timerSeconds: round.timerSeconds
    });
    await emitRoomState(room.id);

    // �� ������ ������ ���������� ������ ������ �������� (����� ������ ������)
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

    // ��������� �����: ����� ������ ������/�������� �� ����� ������� �� ����, � ��� ������� ������ (����� �� ���� / ������ ������)
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

      // ��������� ������ �������� �������� �������
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

    // ��������� ������ �������� ������� �� �����, � ����� ��������� ����� ���������,
    // ����� � ���� ���� ~30 ������ ������ � ������� ��������� ���� ��������.
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

    // (meta) ��������� ��������� ��������, ����� ������� ����� ������������������ ���� ��� ����������� ��������
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

    // ������� ��������� ������ ����� (turnPlayerId)
    if (!socket.data.playerId || socket.data.playerId !== round.turnPlayerId) {
      if (ack) ack({ ok: false, error: "Not allowed" });
      return;
    }

    const decision = payload?.decision; // "custom" | "base"
    if (decision !== "custom" && decision !== "base") {
      if (ack) ack({ ok: false, error: "Invalid decision" });
      return;
    }

    // �� ������ ������ �������������/�������� ������ ��������
    stopTaskAcceptTimer(room.id);
    const pendingStart = taskAcceptStartTimeouts.get(room.id);
    if (pendingStart) {
      clearTimeout(pendingStart);
      taskAcceptStartTimeouts.delete(room.id);
    }

    if (decision === "base") {
      // ������� � ������������ ������ (� ����)
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

      // Dare: ������� � wheel1, ������ �� ��� ������ (������ �����������)
      await emitRoomState(room.id);
      if (ack) ack({ ok: true, switchedToBase: true });
      return;
    }

    // decision === "custom": ��������� ���������� ����� (��� ��������)
    const author = round.customAuthorPlayerId
      ? await prisma.player.findUnique({ where: { id: round.customAuthorPlayerId } })
      : null;
    const authorName = author?.name || "�����";
    const finalText = `������� �� ������ ${authorName}.`;

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

    // ���� ������ �������� ��� ������������ �� ������� (Dare + �����), � ����� ����� ������� ������ ������ � �������� ����
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

    // ������������� ������ �������� (���� ���)
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

  // ---------------------------------------------------------------------------
  // room:leave � ����� ����������� �������� �������
  // ---------------------------------------------------------------------------
  socket.on("room:leave", async (payload, ack) => {
    if (!socket.data.roomId || !socket.data.playerId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }

    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    const visitorId = socket.data.visitorId;

    // ���������� ����� � ���� ����� �������
    if (visitorId) {
      recordPlayerLeave(visitorId, "tod", io);
    }

    try {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        if (ack) {
          ack({ ok: false, error: "Room not found" });
        }
        return;
      }

      // ���� ����� ������ ��������� ������� � ��������� �����
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

      // ������ ������ "left" ������ �������� ������
      const player = await prisma.player.update({
        where: { id: playerId },
        data: {
          connectionStatus: "left",
          lastSeen: new Date()
        }
      });
      playerSockets.delete(playerId);

      // �������� socket.io �������
      socket.leave(roomId);
      socket.data.roomId = null;
      socket.data.playerId = null;
      socket.data.visitorId = null;

      // ���������, ��� �� ��� ����
      const isHost = room.hostId === playerId;

      if (true) {
        // ������� ����� ���������� ��������� ������ (�� left)
        const remainingPlayers = await prisma.player.findMany({
          where: {
            roomId,
            connectionStatus: { not: "left" }
          },
          orderBy: { joinedAt: "asc" }
        });

        if (remainingPlayers.length > 0 && isHost) {
          const newHost = remainingPlayers[0];
          await prisma.room.update({
            where: { id: roomId },
            data: { hostId: newHost.id }
          });
          io.to(roomId).emit("room:host_changed", {
            newHostId: newHost.id,
            newHostName: newHost.name
          });
        } else if (remainingPlayers.length === 0) {
          // ��� ������ �������� ������� � ������� �
          stopTimer(roomId);
          await prisma.vote.deleteMany({ where: { round: { roomId } } });
          await prisma.round.deleteMany({ where: { roomId } });
          await prisma.player.deleteMany({ where: { roomId } });
          await prisma.room.delete({ where: { id: roomId } });
        }
      }

      // ���������� ���������� ������� �� ��������� �������
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

  // ���������� ������� ������ � ������� (�������, ������)
  socket.on("player:update_profile", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId || !socket.data.playerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const { nickname, avatarUrl, nicknameStyle } = payload || {};
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;

    try {
      // �������� �������� ������
      const player = await prisma.player.findUnique({
        where: { id: playerId }
      });

      if (!player || player.roomId !== roomId) {
        if (ack) ack({ ok: false, error: "Player not found" });
        return;
      }

      // ��������� ������ ������
      const updateData = {};
      if (nickname && nickname.trim()) {
        updateData.name = nickname.trim().slice(0, 20);
      }
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }
      if (nicknameStyle !== undefined) {
        updateData.nicknameStyle = nicknameStyle ? JSON.stringify(nicknameStyle) : null;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: updateData
        });

        // ���������� ���������� ��������� ���� � �������
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

    // ��������� visitorId � ���-���� �������
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
        // ������� ������ �������, �� �� ��������� �����
        // ��� �������� ��������� ������ ����� �������/�������������� � ������ �������
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
      data: {
        settings: serializeSettings(settings),
        gameStartedAt: null // ����� ������� ������ ����
      }
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

  // ---------------------------------------------------------------------------
  // admin:toggle_pause � ���������/����� ����� (������ ����)
  // ---------------------------------------------------------------------------
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
      // ������� �����
      await resumeTimer(room.id);
      if (ack) {
        ack({ ok: true, isPaused: false });
      }
    } else {
      // ������ �� ����� (������ ���� ������ �������)
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

  // ---------------------------------------------------------------------------
  // room:end � ����������� ��������� ���� ��� ����
  // ---------------------------------------------------------------------------
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

      // ������ ���� ����� ��������� ����
      if (room.hostId !== socket.data.playerId) {
        if (ack) {
          ack({ ok: false, error: "Host only" });
        }
        return;
      }

      console.log("[Room:End] Host ending game for room:", room.code);

      // ������������� ������� � ������� ��������� �����
      stopTimer(roomId);
      stopVotingTimer(roomId);
      pausedRooms.delete(roomId);
      io.to(roomId).emit("game:paused", { isPaused: false });

      // ���������� ���� ������� � ���������� ����
      io.to(roomId).emit("room:ended", { reason: "host_ended" });

      // ��������� ���� ������� �� socket.io ������� � ������� �� ������
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

      // ������� ��� ������ �������
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

  // ===========================================================================
  // ALIAS GAME EVENTS
  // ===========================================================================

  socket.on("alias:room:create", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const visitorId = payload?.visitorId || null;
    if (!name) {
      if (ack) ack({ ok: false, error: "Name required" });
      return;
    }

    // ������� �� ���� ���������� ������ ����� ��������� �����
    await leaveAllRooms(socket);

    // ���� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let frameSlug = payload?.frameSlug || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      if (!frameSlug) frameSlug = userData?.customization?.frameAll || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
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
        frameSlug,
        nicknameStyle: nicknameStyle ? JSON.stringify(nicknameStyle) : null,
        visitorId
      }
    });

    await prisma.aliasRoom.update({
      where: { id: room.id },
      data: { hostId: player.id }
    });

    socket.data.aliasRoomId = room.id;
    socket.data.aliasPlayerId = player.id;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    aliasPlayerSockets.set(player.id, socket.id);
    socket.join(`alias:${room.id}`);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "alias");
      trackGameSession(socket, "alias", room.code);
    }

    const state = await buildAliasRoomState(prisma, room.id);
    io.to(`alias:${room.id}`).emit("alias:state:sync", state);

    // �������������� ������� ��������� CyberRunner
    socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

    if (ack) ack({ ok: true, state, playerId: player.id });
  });

  socket.on("alias:room:join", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const code = normalizeName(payload?.code).toUpperCase();
    const visitorId = payload?.visitorId || null;
    if (!name || !code) {
      if (ack) ack({ ok: false, error: "��� � ��� �����������" });
      return;
    }

    // ������� �� ���� ���������� ������ ����� ��������������
    await leaveAllRooms(socket);

    const room = await prisma.aliasRoom.findUnique({ where: { code } });
    if (!room) {
      if (ack) ack({ ok: false, error: "������� �� �������" });
      return;
    }

    const players = await prisma.aliasPlayer.findMany({ where: { roomId: room.id } });

    // ���������, ���� �� ����� � ����� visitorId (���������)
    let player = null;
    if (visitorId) {
      player = players.find(p => p.visitorId === visitorId && p.connectionStatus !== "left");
    }

    if (player) {
      // ��������� ������������� ������
      await prisma.aliasPlayer.update({
        where: { id: player.id },
        data: { connectionStatus: "online", lastSeen: new Date() }
      });

      socket.data.aliasRoomId = room.id;
      socket.data.aliasPlayerId = player.id;
      socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
      aliasPlayerSockets.set(player.id, socket.id);
      socket.join(`alias:${room.id}`);
      setAutoLeaveTimer(socket);

      io.to(`alias:${room.id}`).emit("alias:player:reconnected", { playerId: player.id, playerName: player.name });

      const state = await buildAliasRoomState(prisma, room.id);
      io.to(`alias:${room.id}`).emit("alias:state:sync", state);

      // �������������� ������� ��������� CyberRunner ������ ��� ������������������� �������
      socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

      // ��������� ���������� �������� �������� ������ ��� ������������������� �������
      const timer = aliasTimers.get(room.id);
      if (timer) {
        socket.emit("alias:timer:tick", { remaining: timer.remaining });
      }
      const review = aliasReviewTimers.get(room.id);
      if (review?.endsAt) {
        const remaining = Math.max(0, Math.ceil((review.endsAt - Date.now()) / 1000));
        socket.emit("alias:review:tick", { remaining });
      }

      // ���������� ����� ����� � ���� ��� ����������
      if (visitorId) {
        recordPlayerJoin(visitorId, "alias");
        trackGameSession(socket, "alias", room.code);
      }

      if (ack) ack({ ok: true, state, playerId: player.id, reconnected: true });
      return;
    }

    // ����� �����
    const takenNames = players.filter(p => p.connectionStatus !== "left").map(p => p.name.toLowerCase());
    const finalName = makeUniqueName(name, takenNames);

    // ���� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let frameSlug = payload?.frameSlug || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      if (!frameSlug) frameSlug = userData?.customization?.frameAll || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
    }

    // ���� ��� ������ (playing ��� reviewing), ����� ����� ���������� ������������
    const isGameActive = room.status === "playing" || room.status === "reviewing";

    player = await prisma.aliasPlayer.create({
      data: {
        roomId: room.id,
        name: finalName,
        avatarUrl,
        frameSlug,
        nicknameStyle: nicknameStyle ? JSON.stringify(nicknameStyle) : null,
        visitorId,
        isSpectator: isGameActive
      }
    });

    socket.data.aliasRoomId = room.id;
    socket.data.aliasPlayerId = player.id;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    aliasPlayerSockets.set(player.id, socket.id);
    socket.join(`alias:${room.id}`);
    setAutoLeaveTimer(socket);

    const state = await buildAliasRoomState(prisma, room.id);
    io.to(`alias:${room.id}`).emit("alias:state:sync", state);

    // �������������� ������� ��������� CyberRunner
    socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "alias");
      trackGameSession(socket, "alias", room.code);
    }

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

    // ���� � ������ ��� ���� �������� ����� � ��������� ������ (��� ������� ��� reconnect)
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

    // ��������� ������ �� online
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { connectionStatus: "online", lastSeen: new Date() }
    });

    socket.data.aliasRoomId = room.id;
    socket.data.aliasPlayerId = player.id;
    socket.data.visitorId = player.visitorId; // ��������� ��� ������ ������� ��� ������
    aliasPlayerSockets.set(player.id, socket.id);
    socket.join(`alias:${room.id}`);

    // Activity tracking: start session on rejoin
    if (player.visitorId) {
      trackGameSession(socket, "alias", room.code);
    }

    // ���������� � ����������
    io.to(`alias:${room.id}`).emit("alias:player:reconnected", {
      playerId: player.id,
      playerName: player.name
    });

    const state = await buildAliasRoomState(prisma, room.id);
    io.to(`alias:${room.id}`).emit("alias:state:sync", state);

    // �������������� ������� ��������� CyberRunner ������ ��� ������������������� �������
    socket.emit("alias:cyber:leaderboard", { leaderboard: getCyberLeaderboard(room.id) });

    // ��������� ���������� �������� �������� ������ ��� ������������������� �������
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

    // ���������, �� ��� �� ����
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room && (room.status === "playing" || room.status === "reviewing")) {
      if (ack) ack({ ok: false, error: "������ ��������� ������� �� ����� ����" });
      return;
    }

    // �������� �������� ������ � ��� ������ �������
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    const teams = await prisma.aliasTeam.findMany({ where: { roomId } });
    const teamName = normalizeName(payload?.name) || `������� ${teams.length + 1}`;

    const team = await prisma.aliasTeam.create({
      data: {
        roomId,
        name: teamName,
        turnOrder: teams.length,
        creatorId: playerId // ��������� ��������� �������
      }
    });

    // ������������� ��������� ��������� � ����� �������
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { teamId: team.id, explainOrder: 0, isSpectator: false, isReady: false }
    });

    // ������� ������ �������, ���� � ��� ������ �� ��������
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

    // ��������������� ����� ����� �����, ������� ������� � ���� �������.
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    if (!player || player.roomId !== roomId) {
      if (ack) ack({ ok: false, error: "����� �� ������" });
      return;
    }

    if (player.teamId !== teamId) {
      if (ack) ack({ ok: false, error: "������������� ����� ������ �������� ���� �������" });
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

    // ������ �������������� �� ����� ����
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room && (room.status === "playing" || room.status === "reviewing")) {
      if (ack) ack({ ok: false, error: "������ �������� � ������� �� ����� ����" });
      return;
    }

    const team = await prisma.aliasTeam.findUnique({ where: { id: teamId } });
    if (!team || team.roomId !== roomId) {
      if (ack) ack({ ok: false, error: "Team not found" });
      return;
    }

    // �������� ������ ������� ������
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    const teamMembers = await prisma.aliasPlayer.findMany({ where: { teamId } });

    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { teamId, explainOrder: teamMembers.length, isSpectator: false, isReady: false }
    });

    // ������� ������ �������, ���� � ��� ������ �� ��������
    if (oldTeamId && oldTeamId !== teamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } });
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    // ���������, ����� �� �������� ��� ������ �������
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

    // ������ ������ �� ������� �� ����� ����
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room && room.status === "playing") {
      if (ack) ack({ ok: false, error: "Cannot leave team during game" });
      return;
    }

    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    // ��������� ������ � ����������� (��� �������)
    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { teamId: null, isReady: false, isSpectator: true }
    });

    // ������� ������� ������ ���� � ��� ������ �� ��������
    if (oldTeamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } });
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    // ���������, ����� �� �������� ��� ������ �������
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

    // ��������� ������ ������� - ������ ���������� �� ����� ��������� ������
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (room?.status === "reviewing") {
      if (ack) ack({ ok: false, error: "��������� ������������� ������" });
      return;
    }

    await prisma.aliasPlayer.update({
      where: { id: playerId },
      data: { isReady }
    });

    // ���������, ��� �� ������, � ���� �� � ���������� ���������� ������������
    const players = await prisma.aliasPlayer.findMany({ where: { roomId } });
    const teams = await prisma.aliasTeam.findMany({ where: { roomId }, orderBy: { turnOrder: "asc" } });

    // ��������� ��� ���� ������� � ������� 2 ��������
    const teamsWithEnoughPlayers = teams.filter(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });

    // ���������� ��������� ������� (� ������� 2 ��������)
    let nextTeamId = room.currentTeamId;
    if (!nextTeamId && teamsWithEnoughPlayers.length > 0) {
      nextTeamId = teamsWithEnoughPlayers[0].id;
    }

    // ��������� ���������� ������ ������� �������� ������� (�� ���� �������)
    const activeTeamPlayers = nextTeamId
      ? players.filter(p => p.teamId === nextTeamId && p.connectionStatus === "online" && !p.isSpectator)
      : [];
    const allReady = activeTeamPlayers.length >= 2 && activeTeamPlayers.every(p => p.isReady);

    if (allReady && teamsWithEnoughPlayers.length > 0 && room.status === "lobby" && !room.currentExplainerId) {
      // �������� ������ ������� � ����������� ����������� ������� � ������� ������������
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

    // ������ ������ ����� �����, ���� �� ���������� ����� �����������
    if (room.status === "reviewing") {
      if (ack) ack({ ok: false, error: "������� ����������� ����� ����������� ������" });
      return;
    }

    if (isAliasPaused(roomId)) {
      if (ack) ack({ ok: false, error: "Game is paused" });
      return;
    }

    const players = await prisma.aliasPlayer.findMany({ where: { roomId } });
    const teams = await prisma.aliasTeam.findMany({ where: { roomId }, orderBy: { turnOrder: "asc" } });

    if (teams.length < 1) {
      if (ack) ack({ ok: false, error: "����� ������� 1 �������" });
      return;
    }

    // ���������� �������� ������� (������� ��� ��������� �� �������)
    let activeTeamId = room.currentTeamId;
    if (!activeTeamId) {
      // ���� ������ ������� � ������� 2 ��������
      const firstValidTeam = teams.find(t => {
        const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
        return teamPlayers.length >= 2;
      });
      activeTeamId = firstValidTeam?.id;
    }

    if (!activeTeamId) {
      if (ack) ack({ ok: false, error: "��� ������� � ����������� ����������� �������" });
      return;
    }

    // ���������, ��� � �������� ������� ������� 2 ������ (���� ���������, ������ ���������)
    const activeTeamPlayers = players.filter(p => p.teamId === activeTeamId && p.connectionStatus === "online" && !p.isSpectator);

    if (activeTeamPlayers.length < 2) {
      if (ack) ack({ ok: false, error: "� ������� ������������ ������� (����� ������� 2)" });
      return;
    }

    // ��������� ���������� ������ ������� �������� ������� (�� ���� �������)
    const allReady = activeTeamPlayers.every(p => p.isReady);

    if (!allReady) {
      if (ack) ack({ ok: false, error: "�� ��� ������ ������� ������" });
      return;
    }

    // ������ ������ � ����������� ����������� ������� (��� ������ ���������)
    const teamsWithPlayers = teams.filter(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });

    // ������ ����������� ����������� ����� ������ ���
    const startingPlayerId = socket.data.aliasPlayerId;
    if (room.currentExplainerId && room.currentExplainerId !== startingPlayerId) {
      if (ack) ack({ ok: false, error: "������ ����������� ����� ������ ���" });
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

    // ���������� ��� ������������ ������������, ���� �� ����
    // �� �������� getNextTeamAndExplainer �����, �.�. �� ��� ��� ������ � alias:ready:set
    let teamId = room.currentTeamId;
    let explainerId = room.currentExplainerId;

    // ���� �� �����-�� ������� ����������� �� ��������, ��������� (������ �� ������ � ������� 2 ��������)
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

    // ������� ������� ����������� ������ ����� ������� ������ ����
    clearRoundHistory(roomId);

    // ������������� gameStartedAt ��� ������ ���� (���� ��� �� �����������)
    const updateData = {
      status: "playing",
      currentTeamId: teamId,
      currentExplainerId: explainerId,
      turnStartedAt: new Date(),
      turnEndsAt
    };

    if (!room.gameStartedAt) {
      updateData.gameStartedAt = new Date();
    }

    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: updateData
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
    // ���������� ������ ������� ��� ������ ������ ����
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

    // ��������� ��������� ����� � ������� (���� ����), ����� ����� ���� �������� ��� � ������
    // �� ��������� �������� ��� �� ����������, �� ������ ����� �������� ��� � ������
    if (room.currentWordId) {
      const currentWord = await prisma.aliasWord.findUnique({ where: { id: room.currentWordId } });
      if (currentWord) {
        addWordToHistory(roomId, currentWord.text, false, room.currentTeamId);
      }
    }

    // ��������� � ������ reviewing (�������� ������)
    // �������� ���������� ����� ����� ������������� ������
    await prisma.aliasRoom.update({
      where: { id: roomId },
      data: {
        status: "reviewing",
        currentWordId: null,
        turnStartedAt: null,
        turnEndsAt: null
      }
    });

    // ���������� ��������� ������� ������
    const finalHistory = getRoundHistory(roomId);
    io.to(`alias:${roomId}`).emit("alias:turn:ended", {
      reason,
      roundHistory: finalHistory
    });

    // ��������� ������ ����������������� (60 ������)
    const REVIEW_TIMEOUT_SECONDS = 60;
    const reviewEndsAt = Date.now() + REVIEW_TIMEOUT_SECONDS * 1000;

    // ������������� ���������� ������ review ���� ����
    const existingReviewTimer = aliasReviewTimers.get(roomId);
    if (existingReviewTimer?.interval) {
      clearInterval(existingReviewTimer.interval);
    }

    // ���������� ���� ������� review ������ �������
    const reviewInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((reviewEndsAt - Date.now()) / 1000));
      io.to(`alias:${roomId}`).emit("alias:review:tick", { remaining });

      if (remaining <= 0) {
        clearInterval(reviewInterval);
        aliasReviewTimers.delete(roomId);
        // �����������������
        confirmReportInternal(roomId);
      }
    }, 1000);

    aliasReviewTimers.set(roomId, { interval: reviewInterval, endsAt: reviewEndsAt });

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);
  }

  // ������� ������������� ������ (���������� ������� ��� �������������)
  async function confirmReportInternal(roomId) {
    // ������������� ������ review
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

    // ���������� ������������ ������ ����� ����, ��� ��� ������� �������� ������� ����.
    // ������� ����� �� ����:
    // 1) ������ "����������������" ���������� (pendingWinnerTeamId), ���� ���� ���������� �������,
    // 2) ����, ���� ���� ��������, �������� ������� � ������������ ������ � ��������� ����.

    const teamsWithEnoughPlayers = teams.filter(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });

    const targetReachedTeams = teamsWithEnoughPlayers.filter(t => t.score >= settings.targetScore);
    const pendingWinnerTeamId = settings.pendingWinnerTeamId || null;

    // ���� ���-�� ��� ������ ����, �� pendingWinner ��� �� ���������� � ��������� ������� ����������.
    if (!pendingWinnerTeamId && targetReachedTeams.length > 0) {
      // �������� "�������" ���������������� �� turnOrder (���������).
      const firstReached = [...targetReachedTeams].sort((a, b) => a.turnOrder - b.turnOrder)[0];
      settings.pendingWinnerTeamId = firstReached.id;
      await prisma.aliasRoom.update({
        where: { id: roomId },
        data: { settings: serializeAliasSettings(settings) }
      });
    }

    // ���� pendingWinner �����, �� ���� ������������� ������ ����� ����,
    // ��� �������� ������� � ������������ turnOrder � ������� ������ �������� ������.
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

        // ������� ���������� ���������� ���� ��� explainer'� (�� ������� �������!)
        if (room.currentExplainerId) {
          try {
            const history = getRoundHistory(roomId) || [];
            const wordsGuessed = history.filter(w => w.correct === true).length;
            const wordsSkipped = history.filter(w => w.correct === false).length;

            const explainerSocketId = aliasPlayerSockets.get(room.currentExplainerId);
            let explainerUserId = null;
            if (explainerSocketId) {
              const explainerSocket = io.sockets.sockets.get(explainerSocketId);
              explainerUserId = explainerSocket?.data?.userId;
            }

            if (explainerUserId) {
              await updateUserStatsById(explainerUserId, "alias", {
                customStats: {
                  wordsGuessed,
                  wordsSkipped,
                  turnsPlayed: 1
                },
                currentTurn: {
                  wordsGuessed,
                  wordsSkipped
                }
              }, io);
              console.log("[Stats] Alias final turn recorded for userId:", explainerUserId, { wordsGuessed, wordsSkipped });
            } else {
              await recordAliasTurnComplete(room.currentExplainerId, wordsGuessed, wordsSkipped, io);
              console.log("[Stats] Alias final turn recorded via playerId:", { explainerId: room.currentExplainerId, wordsGuessed, wordsSkipped });
            }
          } catch (err) {
            console.error("[Stats] Error recording Alias final turn:", err);
          }
        }

        // ��������� ����� ���� � ��������
        const aliasGameStartedAt = room.gameStartedAt;
        const aliasTimePlayed = aliasGameStartedAt ? Math.floor((Date.now() - new Date(aliasGameStartedAt).getTime()) / 1000) : 0;

        // ���������� ���������� ��� ���� �������
        try {
          for (const player of players) {
            const isWinner = player.teamId === winner.id;

            // ���� ����� ������ ��� ��������� userId
            const playerSocketId = aliasPlayerSockets.get(player.id);
            let playerUserId = null;
            if (playerSocketId) {
              const playerSocket = io.sockets.sockets.get(playerSocketId);
              playerUserId = playerSocket?.data?.userId;
            }

            if (playerUserId) {
              // ���������� �������� �� userId
              await updateUserStatsById(playerUserId, "alias", {
                gamesPlayed: 1,
                gamesWon: isWinner ? 1 : 0,
                timePlayed: aliasTimePlayed
              }, io);
              console.log("[Stats] Alias game recorded for userId:", playerUserId, { isWinner, timePlayed: aliasTimePlayed });
            } else {
              // Fallback �� ������ �����
              await recordAliasGameComplete(player.id, isWinner, io, aliasTimePlayed);
            }
          }
        } catch (err) {
          console.error("[Stats] Error recording Alias game complete:", err);
        }

        const state = await buildAliasRoomState(prisma, roomId);
        io.to(`alias:${roomId}`).emit("alias:state:sync", state);

        // ������� ������ ������
        clearRoundHistory(roomId);
        return;
      }
    }

    // ���������� ��������� ������� � ������������ (������ �� ������ � ������� 2 ��������)
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

    // ���������� ���������� ���� ��� explainer'�
    if (room.currentExplainerId) {
      try {
        const history = getRoundHistory(roomId) || [];
        const wordsGuessed = history.filter(w => w.correct === true).length;
        const wordsSkipped = history.filter(w => w.correct === false).length;

        // ���� ����� explainer'� ��� ��������� userId
        const explainerSocketId = aliasPlayerSockets.get(room.currentExplainerId);
        console.log("[Stats Debug] explainerId:", room.currentExplainerId, "socketId:", explainerSocketId);

        let explainerUserId = null;
        if (explainerSocketId) {
          const explainerSocket = io.sockets.sockets.get(explainerSocketId);
          explainerUserId = explainerSocket?.data?.userId;
          console.log("[Stats Debug] explainerSocket exists:", !!explainerSocket, "userId:", explainerUserId);
        }

        if (explainerUserId) {
          // ���������� �������� �� userId
          await updateUserStatsById(explainerUserId, "alias", {
            customStats: {
              wordsGuessed,
              wordsSkipped,
              turnsPlayed: 1
            },
            currentTurn: {
              wordsGuessed,
              wordsSkipped
            }
          }, io);
          console.log("[Stats] Alias turn recorded for userId:", explainerUserId, { wordsGuessed, wordsSkipped });
        } else {
          // Fallback �� ������ ����� ����� playerId
          console.log("[Stats] No userId found, using fallback via playerId");
          await recordAliasTurnComplete(room.currentExplainerId, wordsGuessed, wordsSkipped, io);
          console.log("[Stats] Alias turn recorded via playerId:", { explainerId: room.currentExplainerId, wordsGuessed, wordsSkipped });
        }
      } catch (err) {
        console.error("[Stats] Error recording Alias turn:", err);
      }
    }

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    // ������� ������� ������
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

    // �������� ������� ����� ��� ������ � �������
    const currentRoom = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (currentRoom?.currentWordId) {
      const currentWord = await prisma.aliasWord.findUnique({ where: { id: currentRoom.currentWordId } });
      if (currentWord) {
        addWordToHistory(roomId, currentWord.text, true, room.currentTeamId);
        // ���������� ���������� ������� ���� �������
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

    // �������� ������� ����� ��� ������ � �������
    if (room.currentWordId) {
      const currentWord = await prisma.aliasWord.findUnique({ where: { id: room.currentWordId } });
      if (currentWord) {
        addWordToHistory(roomId, currentWord.text, false, room.currentTeamId);
        // ���������� ���������� ������� ���� �������
        const updatedHistory = getRoundHistory(roomId);
        io.to(`alias:${roomId}`).emit("alias:history:updated", { history: updatedHistory });
      }
    }

    // Apply skip penalty
    // � ������ "������� -1" ���� ����� ������� � ����� (��� ����� ������).
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
      // Resume - ��������������� ������
      const { remainingWhenPaused } = pauseState;
      aliasPausedRooms.delete(roomId);
      io.to(`alias:${roomId}`).emit("alias:paused", { isPaused: false });

      // ������������� ������ � ���������� ��������
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
      // Pause - ������������� ������ � ��������� ���������� �����
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

    // �������� ID ������ ��� ������ �������� �����������
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
        gameStartedAt: null, // ����� ������� ������ ����
        deck: "[]",
        usedWordIds: "[]",
        settings: serializeAliasSettings(currentSettings)
      }
    });

    io.to(`alias:${roomId}`).emit("alias:paused", { isPaused: false });
    io.to(`alias:${roomId}`).emit("alias:reset", {});

    // ������� ������� ������
    clearRoundHistory(roomId);

    // ������� ��������� CyberRunner ��� �������
    clearCyberLeaderboard(roomId);
    io.to(`alias:${roomId}`).emit("alias:cyber:leaderboard", { leaderboard: [] });

    const state = await buildAliasRoomState(prisma, roomId);
    io.to(`alias:${roomId}`).emit("alias:state:sync", state);

    if (ack) ack({ ok: true });
  });

  // �������� ������� ���� �������� ������
  socket.on("alias:history:get", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    if (!roomId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const history = getRoundHistory(roomId);
    if (ack) ack({ ok: true, history });
  });

  // �������� ��������� ����� � ������� (��� ������������� �����)
  socket.on("alias:history:update", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const { index, correct } = payload || {};

    if (!roomId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    if (typeof index !== "number" || typeof correct !== "boolean") {
      if (ack) ack({ ok: false, error: "�������� ���������" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      if (ack) ack({ ok: false, error: "������� �� �������" });
      return;
    }

    const history = getRoundHistory(roomId);
    if (index < 0 || index >= history.length) {
      if (ack) ack({ ok: false, error: "�������� ������" });
      return;
    }

    const oldCorrect = history[index].correct;
    if (oldCorrect === correct) {
      if (ack) ack({ ok: true, history });
      return;
    }

    // ��������� �������
    updateWordInHistory(roomId, index, correct);

    // ������������ ���� ������� (���������� ���������� teamId ������, � �� �������)
    const roundTeamId = getRoundTeamId(roomId) || room.currentTeamId;
    const team = await prisma.aliasTeam.findUnique({ where: { id: roundTeamId } });
    if (team) {
      const settings = normalizeAliasSettings(room.settings);

      // � ����������� �� ������, "false" (�������) �������� ���� 0 �����, ���� -1 ����.
      const pointsForWord = (isCorrect) => {
        if (isCorrect) return 1;
        return settings.skipPenalty === -1 ? -1 : 0;
      };

      const scoreDelta = pointsForWord(correct) - pointsForWord(oldCorrect);
      const nextScore = team.score + scoreDelta;

      // � ������� ������ ������������� ���� �� ���������.
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

  // ===========================================================================
  // CYBERRUNNER LEADERBOARD
  // ===========================================================================

  socket.on("alias:cyber:score", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    const { score } = payload || {};

    if (!roomId || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    // �� ������ ������ ���������� �� NaN � ������������� ��������
    if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) {
      if (ack) ack({ ok: false, error: "�������� score" });
      return;
    }

    try {
      const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
      if (!player) {
        if (ack) ack({ ok: false, error: "����� �� ������" });
        return;
      }

      const updatedLeaderboard = updateCyberLeaderboard(roomId, player.name, score);
      const leaderboard = updatedLeaderboard || getCyberLeaderboard(roomId);

      io.to(`alias:${roomId}`).emit("alias:cyber:leaderboard", { leaderboard });

      if (ack) ack({ ok: true, leaderboard });
    } catch (error) {
      console.error("alias:cyber:score error:", error);
      if (ack) ack({ ok: false, error: "�� ������� �������� ���������" });
    }
  });

  // ������������� ������ (������)
  socket.on("alias:report:confirm", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;

    if (!roomId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });

    // ������ �������� �������������: ���� ����� ��� �� � reviewing,
    // ������ �� ��� ���������� (������� ��� ������������).
    // �� ���������� ������, ����� �������� "������" ������ ��� ������/������� �����.
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
    const visitorId = socket.data.visitorId;

    if (!roomId || !playerId) {
      if (ack) ack({ ok: true });
      return;
    }

    // ���������� ����� � ���� ����� �������
    if (visitorId) {
      recordPlayerLeave(visitorId, "alias", io);
    }

    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    const oldTeamId = player?.teamId;

    // �������� ����� ���������� ������, ���� ������� ����
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

    // ��������� ������� ������ �� ���� ��� ������
    await prisma.aliasPlayer.delete({ where: { id: playerId } });

    // Auto-delete empty teams
    if (oldTeamId) {
      const remaining = await prisma.aliasPlayer.count({ where: { teamId: oldTeamId } });
      if (remaining === 0) {
        await prisma.aliasTeam.delete({ where: { id: oldTeamId } }).catch(() => { });
      }
    }

    socket.leave(`alias:${roomId}`);
    socket.data.aliasRoomId = null;
    socket.data.aliasPlayerId = null;
    socket.data.visitorId = null;
    aliasPlayerSockets.delete(playerId);

    const activePlayersCount = await prisma.aliasPlayer.count({
      where: { roomId, connectionStatus: { not: "left" } }
    });

    if (activePlayersCount === 0) {
      await prisma.aliasRoom.delete({ where: { id: roomId } }).catch(() => { });
    } else {
      const state = await buildAliasRoomState(prisma, roomId);
      io.to(`alias:${roomId}`).emit("alias:state:sync", state);
    }

    if (ack) ack({ ok: true });
  });

  // ���������� ������� ������ Alias � ������� (�������, ������, nicknameStyle)
  socket.on("alias:player:update_profile", async (payload, ack) => {
    if (!socket.data.aliasRoomId || !socket.data.aliasPlayerId) {
      if (ack) ack({ ok: false, error: "Not in room" });
      return;
    }

    const { nickname, avatarUrl, nicknameStyle } = payload || {};
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;

    try {
      // �������� �������� ������
      const player = await prisma.aliasPlayer.findUnique({
        where: { id: playerId }
      });

      if (!player || player.roomId !== roomId) {
        if (ack) ack({ ok: false, error: "Player not found" });
        return;
      }

      // ��������� ������ ������
      const updateData = {};
      if (nickname && nickname.trim()) {
        updateData.name = nickname.trim().slice(0, 20);
      }
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }
      if (nicknameStyle !== undefined) {
        updateData.nicknameStyle = nicknameStyle ? JSON.stringify(nicknameStyle) : null;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.aliasPlayer.update({
          where: { id: playerId },
          data: updateData
        });

        // ���������� ���������� ��������� ���� � �������
        const state = await buildAliasRoomState(prisma, roomId);
        io.to(`alias:${roomId}`).emit("alias:state:sync", state);
      }

      if (ack) ack({ ok: true });
    } catch (error) {
      console.error("alias:player:update_profile error:", error);
      if (ack) ack({ ok: false, error: "Failed to update profile" });
    }
  });

  // ===========================================================================
  // ===========================================================================
  // FRIENDS & SOCIAL EVENTS
  // ===========================================================================

  // Register user socket for friends notifications
  socket.on("friends:register", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    // register socketId for this user (multi-tab safe)
    addSocialUserSocket(userId, socket.id);

    // cancel pending offline timer (reconnect)
    const t = userOfflineTimers.get(userId);
    if (t) {
      clearTimeout(t);
      userOfflineTimers.delete(userId);
    }

    // Update online status
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onlineStatus: "online",
          lastSeenAt: new Date()
        }
      });

      // Notify friends about online status
      const friendships = await prisma.friendship.findMany({
        where: { friendId: userId },
        select: { userId: true }
      });
      for (const f of friendships) {
        emitToSocialUser(f.userId, "friends:status:update", {
          userId,
          onlineStatus: "online",
        });
      }

      // Get pending requests count
      const pendingCount = await getPendingRequestsCount(prisma, userId);

      if (ack) ack({ ok: true, pendingCount });
    } catch (e) {
      console.error("[friends:register] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Get friends list
  socket.on("friends:list", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { filter, search } = payload || {};
    const result = await getFriends(prisma, userId, { filter, search });

    if (ack) ack(result);
  });

  // Send friend request
  socket.on("friends:request:send", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId, receiverId } = payload || {};
    const rawTargetId = targetUserId || receiverId;
    if (!rawTargetId) {
      if (ack) ack({ ok: false, error: "Target user required" });
      return;
    }

    const resolvedTargetUserId = await resolveUserId(prisma, rawTargetId);
    if (!resolvedTargetUserId) {
      if (ack) ack({ ok: false, error: "Пользователь не найден" });
      return;
    }

    const result = await sendFriendRequest(prisma, userId, resolvedTargetUserId);

    if (result.success && result.request) {
      // Notify target user about new request
      emitToSocialUser(resolvedTargetUserId, "friends:request:received", {
        request: {
          id: result.request.id,
          sender: result.request.sender,
          createdAt: result.request.createdAt,
        },
      });
    }

    if (ack) ack(result);
  });

  // Accept friend request
  socket.on("friends:request:accept", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { requestId } = payload || {};
    if (!requestId) {
      if (ack) ack({ ok: false, error: "Request ID required" });
      return;
    }

    const result = await acceptFriendRequest(prisma, userId, requestId);

    if (result.success && result.friend) {
      // Notify the sender that their request was accepted
      // Get current user info to send to friend
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } },
            },
          },
          onlineStatus: true,
          level: true,
        },
      });

      emitToSocialUser(result.friend.id, "friends:request:accepted", {
        friend: require("./social/userPublic").toPublicUser(currentUser),
      });
    }

    if (ack) ack(result);
  });

  // Reject friend request
  socket.on("friends:request:reject", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { requestId } = payload || {};
    if (!requestId) {
      if (ack) ack({ ok: false, error: "Request ID required" });
      return;
    }

    const result = await rejectFriendRequest(prisma, userId, requestId);
    if (ack) ack(result);
  });

  // Cancel sent friend request
  socket.on("friends:request:cancel", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { requestId } = payload || {};
    if (!requestId) {
      if (ack) ack({ ok: false, error: "Request ID required" });
      return;
    }

    const result = await cancelFriendRequest(prisma, userId, requestId);
    if (ack) ack(result);
  });

  // Remove friend
  socket.on("friends:remove", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { friendId, odlerId } = payload || {};
    const rawTargetId = friendId || odlerId;
    if (!rawTargetId) {
      if (ack) ack({ ok: false, error: "Friend ID required" });
      return;
    }

    const resolvedFriendId = await resolveUserId(prisma, rawTargetId);
    if (!resolvedFriendId) {
      if (ack) ack({ ok: false, error: "Пользователь не найден" });
      return;
    }

    const result = await removeFriend(prisma, userId, resolvedFriendId);

    if (result.success) {
      // Notify the removed friend
      emitToSocialUser(resolvedFriendId, "friends:removed", { byUserId: userId });
    }

    if (ack) ack(result);
  });

  // Get pending requests (incoming)
  socket.on("friends:requests:pending", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const result = await getPendingRequests(prisma, userId);
    if (ack) ack(result);
  });

  // Get sent requests (outgoing)
  socket.on("friends:requests:sent", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const result = await getSentRequests(prisma, userId);
    if (ack) ack(result);
  });

  // Block user
  socket.on("friends:block", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId: targetId } = payload || {};
    if (!targetId) {
      if (ack) ack({ ok: false, error: "Target user required" });
      return;
    }

    try {
      // Resolve targetId to actual userId (might be visitorId)
      let resolvedTargetId = targetId;
      let targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true }
      });
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { visitorId: targetId },
          select: { id: true }
        });
        if (targetUser) {
          resolvedTargetId = targetUser.id;
        } else {
          if (ack) ack({ ok: false, error: "User not found" });
          return;
        }
      }

      const result = await blockUser(prisma, userId, resolvedTargetId);
      if (ack) ack(result);
    } catch (e) {
      console.error("[friends:block] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Unblock user
  socket.on("friends:unblock", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId: targetId } = payload || {};
    if (!targetId) {
      if (ack) ack({ ok: false, error: "Target user required" });
      return;
    }

    try {
      // Resolve targetId to actual userId (might be visitorId)
      let resolvedTargetId = targetId;
      let targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true }
      });
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { visitorId: targetId },
          select: { id: true }
        });
        if (targetUser) {
          resolvedTargetId = targetUser.id;
        } else {
          if (ack) ack({ ok: false, error: "User not found" });
          return;
        }
      }

      const result = await unblockUser(prisma, userId, resolvedTargetId);
      if (ack) ack(result);
    } catch (e) {
      console.error("[friends:unblock] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Get blocked users list
  socket.on("friends:blocked:list", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const result = await getBlockedUsers(prisma, userId);
    if (ack) ack(result);
  });

  // Get friendship status with another user
  socket.on("friends:status", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId } = payload || {};
    if (!targetUserId) {
      if (ack) ack({ ok: false, error: "Target user required" });
      return;
    }

    const resolvedTargetId = await resolveUserId(prisma, targetUserId);
    if (!resolvedTargetId) {
      if (ack) ack({ ok: false, error: "Пользователь не найден" });
      return;
    }

    const status = await getFriendshipStatus(prisma, userId, resolvedTargetId);
    if (ack) ack({ ok: true, ...status });
  });

  // Search users
  socket.on("friends:search", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { query, limit } = payload || {};
    const result = await searchUsers(prisma, userId, query, limit);
    if (ack) ack(result);
  });

  // Get public profile of another user
  socket.on("social:profile:get", async (payload, ack) => {
    const viewerId = socket.data.userId; // может быть null для гостей
    const { targetUserId } = payload || {};

    if (!targetUserId) {
      if (ack) ack({ ok: false, error: "Target user ID required" });
      return;
    }

    const resolvedTargetId = await resolveUserId(prisma, targetUserId);
    if (!resolvedTargetId) {
      if (ack) ack({ ok: false, error: "Пользователь не найден" });
      return;
    }

    const result = await getPublicProfile(prisma, viewerId, resolvedTargetId);
    if (ack) ack(result);
  });

  // Update bio (status) for current user
  socket.on("social:bio:set", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ success: false, error: "Not authenticated" });
      return;
    }

    const { bio } = payload || {};

    // Validate bio length (max 80 characters)
    const sanitizedBio = (bio || "").trim().slice(0, 80);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { bio: sanitizedBio },
      });

      if (ack) ack({ success: true });
    } catch (e) {
      console.error("[social:bio:set] error:", e);
      if (ack) ack({ success: false, error: "Failed to update bio" });
    }
  });

  // Set user biography (long text for profile section)
  socket.on("social:biography:set", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ success: false, error: "Not authenticated" });
      return;
    }

    const { biography } = payload || {};

    // Validate biography length (max 500 characters)
    const sanitizedBiography = (biography || "").trim().slice(0, 500);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { biography: sanitizedBiography },
      });

      if (ack) ack({ success: true });
    } catch (e) {
      console.error("[social:biography:set] error:", e);
      if (ack) ack({ success: false, error: "Failed to update biography" });
    }
  });

  // Set Discord ID manually (for users who registered via Google/email)
  socket.on("social:discord:set", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ success: false, error: "Not authenticated" });
      return;
    }

    const { discordId } = payload || {};

    // Validate Discord ID format (17-19 digit number)
    const sanitizedDiscordId = (discordId || "").trim();

    if (sanitizedDiscordId && !/^\d{17,19}$/.test(sanitizedDiscordId)) {
      if (ack) ack({ success: false, error: "Неверный формат Discord ID. Должен содержать 17-19 цифр." });
      return;
    }

    try {
      // Check if this Discord ID is already used by another user
      if (sanitizedDiscordId) {
        const existingUser = await prisma.user.findFirst({
          where: {
            discordId: sanitizedDiscordId,
            id: { not: userId }
          }
        });

        if (existingUser) {
          if (ack) ack({ success: false, error: "Этот Discord ID уже привязан к другому аккаунту" });
          return;
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { discordId: sanitizedDiscordId || null },
      });

      if (ack) ack({ success: true, discordId: sanitizedDiscordId || null });
    } catch (e) {
      console.error("[social:discord:set] error:", e);
      if (ack) ack({ success: false, error: "Не удалось сохранить Discord ID" });
    }
  });

  // Set Discord Username manually
  socket.on("social:discord:set-username", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ success: false, error: "Not authenticated" });
      return;
    }

    const { discordUsername } = payload || {};

    // Sanitize username - remove @ if present, trim whitespace
    const sanitizedUsername = (discordUsername || "").trim().replace(/^@/, "");

    // Validate Discord username format (2-32 characters, lowercase letters, numbers, dots, underscores)
    if (sanitizedUsername && !/^[a-z0-9_.]{2,32}$/i.test(sanitizedUsername)) {
      if (ack) ack({ success: false, error: "Неверный формат Discord логина" });
      return;
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { discordUsername: sanitizedUsername || null },
      });

      if (ack) ack({ success: true, discordUsername: sanitizedUsername || null });
    } catch (e) {
      console.error("[social:discord:set-username] error:", e);
      if (ack) ack({ success: false, error: "Не удалось сохранить Discord логин" });
    }
  });

  // ===========================================================================
  // FULL PROFILE EVENTS (games, widgets, activity, notes)
  // ===========================================================================

  // Register profile handlers from profile.js module
  registerProfileHandlers(socket, io);
  registerActivityHandlers(socket, io);
  
  // Register friends handlers (social:friends:* events)
  registerFriendsHandlers(socket, io, prisma);

  // ===========================================================================
  // IGNORE EVENTS
  // ===========================================================================

  // Add user to ignore list
  socket.on("social:ignore:add", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId: targetId } = payload || {};
    if (!targetId) {
      if (ack) ack({ ok: false, error: "Target user ID required" });
      return;
    }

    try {
      // Resolve targetId to actual userId (might be visitorId)
      let resolvedTargetId = targetId;
      let targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true }
      });
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { visitorId: targetId },
          select: { id: true }
        });
        if (targetUser) {
          resolvedTargetId = targetUser.id;
        } else {
          if (ack) ack({ ok: false, error: "User not found" });
          return;
        }
      }

      if (userId === resolvedTargetId) {
        if (ack) ack({ ok: false, error: "Cannot ignore yourself" });
        return;
      }

      const existing = await prisma.ignoredUser.findUnique({
        where: { userId_ignoredId: { userId, ignoredId: resolvedTargetId } }
      });

      if (existing) {
        if (ack) ack({ ok: false, error: "User already ignored" });
        return;
      }

      await prisma.ignoredUser.create({
        data: { userId, ignoredId: resolvedTargetId }
      });

      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("[social:ignore:add] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Remove user from ignore list
  socket.on("social:ignore:remove", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId } = payload || {};
    if (!targetUserId) {
      if (ack) ack({ ok: false, error: "Target user ID required" });
      return;
    }

    try {
      await prisma.ignoredUser.deleteMany({
        where: { userId, ignoredId: targetUserId }
      });
      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("[social:ignore:remove] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Get ignored users list
  socket.on("social:ignore:list", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    try {
      const ignoredUsers = await prisma.ignoredUser.findMany({
        where: { userId },
        include: {
          ignored: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              customization: {
                select: {
                  frameAll: true,
                  nicknameColorType: true,
                  nicknameCustomColor: true,
                  nicknameGradient: { select: { cssValue: true } },
                  nicknameGlow: { select: { cssValue: true } },
                },
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      if (ack) ack({
        ok: true,
        users: ignoredUsers.map(i => ({
          ...require("./social/userPublic").toPublicUser(i.ignored),
          ignoredAt: i.createdAt
        }))
      });
    } catch (e) {
      console.error("[social:ignore:list] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Check if user is ignored
  socket.on("social:ignore:check", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId } = payload || {};
    if (!targetUserId) {
      if (ack) ack({ ok: false, error: "Target user ID required" });
      return;
    }

    try {
      const ignored = await prisma.ignoredUser.findUnique({
        where: { userId_ignoredId: { userId, ignoredId: targetUserId } }
      });
      if (ack) ack({ ok: true, isIgnored: !!ignored });
    } catch (e) {
      console.error("[social:ignore:check] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // ===========================================================================
  // PROFILE REPORT EVENTS
  // ===========================================================================

  // Report user profile
  socket.on("social:profile:report", async (payload, ack) => {
    const reporterId = socket.data.userId;
    if (!reporterId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { targetUserId: targetId, reason, comment } = payload || {};
    if (!targetId || !reason) {
      if (ack) ack({ ok: false, error: "Target user ID and reason required" });
      return;
    }

    const validReasons = ["offensive_avatar", "offensive_nickname", "offensive_bio", "spam", "other"];
    if (!validReasons.includes(reason)) {
      if (ack) ack({ ok: false, error: "Invalid reason" });
      return;
    }

    try {
      // Resolve targetId to actual userId (might be visitorId)
      let resolvedTargetId = targetId;
      let targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true }
      });
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { visitorId: targetId },
          select: { id: true }
        });
        if (targetUser) {
          resolvedTargetId = targetUser.id;
        } else {
          if (ack) ack({ ok: false, error: "User not found" });
          return;
        }
      }

      if (reporterId === resolvedTargetId) {
        if (ack) ack({ ok: false, error: "Cannot report yourself" });
        return;
      }

      // Check for existing pending report
      const existingReport = await prisma.profileReport.findFirst({
        where: { reporterId, targetId: resolvedTargetId, status: "pending" }
      });

      if (existingReport) {
        if (ack) ack({ ok: false, error: "You already reported this profile" });
        return;
      }

      // Create report
      await prisma.profileReport.create({
        data: { reporterId, targetId: resolvedTargetId, reason, comment: comment || null }
      });

      // Count pending reports
      const pendingReportsCount = await prisma.profileReport.count({
        where: { targetId: resolvedTargetId, status: "pending" }
      });

      console.log(`[ProfileReport] User ${resolvedTargetId} has ${pendingReportsCount} pending reports`);

      // If 5+ reports - block profile
      if (pendingReportsCount >= 5) {
        const blockedUser = await prisma.user.update({
          where: { id: resolvedTargetId },
          data: {
            profileWarnings: { increment: 1 },
            profileBlockedAt: new Date()
          },
          select: { email: true, nickname: true, profileWarnings: true }
        });

        // Mark all pending reports as actioned
        await prisma.profileReport.updateMany({
          where: { targetId: resolvedTargetId, status: "pending" },
          data: { status: "actioned", reviewedAt: new Date() }
        });

        console.log(`[ProfileReport] User ${resolvedTargetId} profile BLOCKED (${pendingReportsCount} reports)`);

        // Send in-app notification
        emitToSocialUser(resolvedTargetId, "notifications:new", {
          type: "profile_warning",
          title: "Attention!",
          message: "Your profile received multiple reports. Please edit your profile to continue playing.",
          action: { type: "link", url: "/profile" },
          createdAt: new Date().toISOString(),
        });

        emitToSocialUser(resolvedTargetId, "profile:blocked", {
          reason: "reports",
          message: "Your profile is blocked due to reports. Edit your profile to continue.",
        });

        // Send email notification
        try {
          const { sendEmail } = require("./auth/email");
          const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
          await sendEmail({
            to: targetUser.email,
            subject: "Profile Edit Required - True or Do",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1>Profile Edit Required</h1>
                <p>Hello, ${targetUser.nickname || "player"}!</p>
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Your profile in True or Do has received multiple reports from other users.</strong></p>
                  <p>Please review and edit your profile (avatar, nickname, bio) according to community guidelines.</p>
                </div>
                <p><strong>Game access is restricted until you edit your profile.</strong></p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/profile" style="display: inline-block; padding: 12px 24px; background: linear-gradient(120deg, #2ee6ff, #7cff6b); color: #041018; text-decoration: none; border-radius: 25px; font-weight: bold;">Edit Profile</a>
                </p>
                <p style="font-size: 12px; color: #666;">True or Do Team</p>
              </div>
            `,
            text: `Profile Edit Required\n\nYour profile has received multiple reports. Please edit your profile at ${baseUrl}/profile\n\nTrue or Do Team`
          });
          console.log(`[ProfileReport] Email sent to ${targetUser.email}`);
        } catch (emailError) {
          console.error("[ProfileReport] Failed to send email:", emailError);
        }
      }

      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("[social:profile:report] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // ===========================================================================
  // MESSAGES EVENTS (Private Chats)
  // ===========================================================================

  // Get list of conversations
  socket.on("messages:conversations", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { limit, offset } = payload || {};
    const result = await getConversations(prisma, userId, { limit, offset });
    if (ack) ack(result);
  });

  // Get messages from a conversation
  socket.on("messages:history", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { conversationId, partnerId, odlerId, limit, before, after } = payload || {};

    let result;
    if (conversationId) {
      result = await getMessages(prisma, userId, conversationId, { limit, before, after });
    } else {
      const rawPartnerId = partnerId || odlerId;
      if (!rawPartnerId) {
        result = { success: false, error: "conversationId or partnerId required" };
      } else {
        const resolvedPartnerId = await resolveUserId(prisma, rawPartnerId);
        if (!resolvedPartnerId) {
          result = { success: false, error: "Пользователь не найден" };
        } else {
          result = await getMessagesByPartner(prisma, userId, resolvedPartnerId, { limit, before, after });
        }
      }
    }

    if (ack) ack(result);
  });

  // Send a message
  socket.on("messages:send", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { receiverId, odlerId, content, type = "text", metadata } = payload || {};

    const rawReceiverId = receiverId || odlerId;
    if (!rawReceiverId || !content) {
      if (ack) ack({ success: false, error: "receiverId and content required" });
      return;
    }

    const resolvedReceiverId = await resolveUserId(prisma, rawReceiverId);
    if (!resolvedReceiverId) {
      if (ack) ack({ success: false, error: "Пользователь не найден" });
      return;
    }

    const result = await sendMessage(prisma, userId, resolvedReceiverId, content, type, metadata);

    if (result.success) {
      // Проверяем, игнорирует ли получатель отправителя
      const isIgnored = await prisma.ignoredUser.findUnique({
        where: { 
          userId_ignoredId: { 
            userId: resolvedReceiverId, 
            ignoredId: userId 
          } 
        }
      });

      // Notify receiver in real-time
      emitToSocialUser(resolvedReceiverId, "messages:received", {
        message: {
          ...result.message,
          isIgnored: !!isIgnored, // Добавляем флаг игнорирования
        },
        conversationId: result.conversationId,
        senderId: userId,
      });
    }

    if (ack) ack(result);
  });

  // Mark messages as read
  socket.on("messages:read", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { conversationId } = payload || {};

    if (!conversationId) {
      if (ack) ack({ success: false, error: "conversationId required" });
      return;
    }

    const result = await markAsRead(prisma, userId, conversationId);

    if (result.success && result.count > 0) {
      // Get conversation to find partner
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { participant1Id: true, participant2Id: true },
      });

      if (conv) {
        const partnerId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        // Notify sender that messages were read
        forEachSocialUserSocket(partnerId, (sid) => {
          io.to(sid).emit("messages:read:confirmed", {
            conversationId,
            readBy: userId,
            count: result.count,
          });
        });
      }

      // Sync unread count to all of the reader's sessions
      const totalUnread = await getUnreadCount(prisma, userId);
      forEachSocialUserSocket(userId, (sid) => {
        io.to(sid).emit("messages:unread:sync", {
          conversationId,
          totalUnread
        });
      });
    }

    if (ack) ack(result);
  });

  // Partial read (Read up to sequence number)
  socket.on("messages:readUpTo", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { conversationId, seq } = payload || {};

    if (!conversationId || typeof seq !== "number") {
      if (ack) ack({ success: false, error: "conversationId and seq required" });
      return;
    }

    const result = await readUpTo(prisma, userId, conversationId, seq);

    if (result.success && result.count > 0) {
      // Notify partner
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { participant1Id: true, participant2Id: true },
      });

      if (conv) {
        const partnerId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        forEachSocialUserSocket(partnerId, (sid) => {
          io.to(sid).emit("messages:read:confirmed", {
            conversationId,
            readBy: userId,
            seq: result.cursorApplied,
            count: result.count
          });
        });
      }

      // Sync unread count to all of the reader's sessions
      const totalUnread = await getUnreadCount(prisma, userId);
      forEachSocialUserSocket(userId, (sid) => {
        io.to(sid).emit("messages:unread:sync", {
          conversationId,
          unreadCount: result.unreadCount || 0,
          totalUnread,
          seq: result.cursorApplied
        });
      });
    }

    if (ack) ack(result);
  });

  // Get unread messages count
  socket.on("messages:unread:count", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const count = await getUnreadCount(prisma, userId);
    if (ack) ack({ success: true, count });
  });

  // Delete conversation
  socket.on("messages:conversation:delete", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { conversationId } = payload || {};

    if (!conversationId) {
      if (ack) ack({ success: false, error: "conversationId required" });
      return;
    }

    const result = await deleteConversation(prisma, userId, conversationId);
    if (ack) ack(result);
  });

  // Send game invite via message
  socket.on("messages:game:invite", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { receiverId, odlerId, gameType, roomCode } = payload || {};

    const rawReceiverId = receiverId || odlerId;
    if (!rawReceiverId || !gameType || !roomCode) {
      if (ack) ack({ success: false, error: "receiverId, gameType, and roomCode required" });
      return;
    }

    const resolvedReceiverId = await resolveUserId(prisma, rawReceiverId);
    if (!resolvedReceiverId) {
      if (ack) ack({ success: false, error: "Пользователь не найден" });
      return;
    }

    const result = await sendGameInvite(prisma, userId, resolvedReceiverId, gameType, roomCode);

    if (result.success) {
      // Проверяем, игнорирует ли получатель отправителя
      const isIgnored = await prisma.ignoredUser.findUnique({
        where: { 
          userId_ignoredId: { 
            userId: resolvedReceiverId, 
            ignoredId: userId 
          } 
        }
      });

      // Notify receiver
      emitToSocialUser(resolvedReceiverId, "messages:received", {
        message: {
          ...result.message,
          isIgnored: !!isIgnored, // Добавляем флаг игнорирования
        },
        conversationId: result.conversationId,
        senderId: userId,
      });

      emitToSocialUser(resolvedReceiverId, "game:invite:received", {
        from: userId,
        gameType,
        roomCode,
        message: result.message,
      });
    }

    if (ack) ack(result);
  });

  // Validate game room code
  socket.on("game:room:validate", async (payload, ack) => {
    try {
      if (!payload) return ack({ isValid: false });
      const { gameType, roomCode } = payload;
      let isValid = false;

      if (gameType === "tod" || gameType === "Правда или Действие") {
        const room = await prisma.room.findUnique({ where: { id: roomCode } });
        isValid = !!room;
      } else if (gameType === "alias" || gameType === "Alias") {
        const room = await prisma.aliasRoom.findUnique({ where: { id: roomCode } });
        isValid = !!room;
      } else if (gameType === "codenames" || gameType === "Codenames") {
        // Use imported getter
        isValid = !!getCodenamesRoom(roomCode);
      } else if (gameType === "emotional" || gameType === "Крокодил Эмоций") {
        // Use imported getter
        isValid = !!getEmotionalRoom(roomCode);
      }

      if (ack) ack({ isValid });
    } catch (err) {
      console.error("Room validation error:", err);
      if (ack) ack({ isValid: false });
    }
  });

  // ===========================================================================
  // CLANS EVENTS
  // ===========================================================================

  // Create a clan (VIP/PRO only)
  socket.on("clans:create", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { name, tag, description, type } = payload || {};

    if (!name) {
      if (ack) ack({ success: false, error: "name required" });
      return;
    }

    const result = await createClan(prisma, userId, { name, tag, description, type });
    if (ack) ack(result);
  });

  // Delete a clan (leader only)
  socket.on("clans:delete", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await deleteClan(prisma, userId, clanId);
    if (ack) ack(result);
  });

  // Update clan info
  socket.on("clans:update", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, name, tag, description, type } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await updateClan(prisma, userId, clanId, { name, tag, description, type });
    if (ack) ack(result);
  });

  // Update clan avatar
  socket.on("clans:avatar:update", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, avatarUrl } = payload || {};

    if (!clanId || !avatarUrl) {
      if (ack) ack({ success: false, error: "clanId and avatarUrl required" });
      return;
    }

    const result = await updateClanAvatar(prisma, userId, clanId, avatarUrl);
    if (ack) ack(result);
  });

  // Get clan info
  socket.on("clans:get", async (payload, ack) => {
    const userId = socket.data.userId;
    const { clanId } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await getClan(prisma, clanId, userId);
    if (ack) ack(result);
  });

  // Get user's clan
  socket.on("clans:my", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const result = await getUserClan(prisma, userId);
    if (ack) ack(result);
  });

  // Search clans
  socket.on("clans:search", async (payload, ack) => {
    const { query, limit, offset } = payload || {};
    const result = await searchClans(prisma, query, { limit, offset });
    if (ack) ack(result);
  });

  // Get popular clans
  socket.on("clans:popular", async (payload, ack) => {
    const { limit } = payload || {};
    const result = await getPopularClans(prisma, limit);
    if (ack) ack(result);
  });

  // Join an open clan
  socket.on("clans:join", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await joinClan(prisma, userId, clanId);

    if (result.success) {
      // Join Socket.IO room for clan chat
      socket.join(`clan:${clanId}`);
      // Notify clan members about new member
      socket.to(`clan:${clanId}`).emit("clans:member:joined", {
        clanId,
        member: result.membership,
      });
    }

    if (ack) ack(result);
  });

  // Leave clan
  socket.on("clans:leave", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const result = await leaveClan(prisma, userId);

    if (result.success) {
      // Leave Socket.IO room
      socket.leave(`clan:${result.clanId}`);
      // Notify clan members
      socket.to(`clan:${result.clanId}`).emit("clans:member:left", {
        clanId: result.clanId,
        userId,
      });
    }

    if (ack) ack(result);
  });

  // Kick member from clan
  socket.on("clans:member:kick", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, targetUserId } = payload || {};

    if (!clanId || !targetUserId) {
      if (ack) ack({ success: false, error: "clanId and targetUserId required" });
      return;
    }

    const result = await kickMember(prisma, userId, targetUserId, clanId);

    if (result.success) {
      // Notify the kicked user
      const resolvedTargetId = await resolveUserId(prisma, targetUserId);
      const kickedUserId = resolvedTargetId || targetUserId;
      forEachSocialUserSocket(kickedUserId, (sid) => {
        io.to(sid).emit("clans:kicked", { clanId });
        io.sockets.sockets.get(sid)?.leave(`clan:${clanId}`);
      });
      // Notify clan members
      io.to(`clan:${clanId}`).emit("clans:member:kicked", {
        clanId,
        kickedUserId: targetUserId,
        kickedBy: userId,
      });
    }

    if (ack) ack(result);
  });

  // Get clan members
  socket.on("clans:members", async (payload, ack) => {
    const { clanId, limit, offset } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await getClanMembers(prisma, clanId, { limit, offset });
    if (ack) ack(result);
  });

  // Request to join a closed clan
  socket.on("clans:request:send", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, message } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await requestJoinClan(prisma, userId, clanId, message);

    if (result.success && result.request) {
      // Notify clan leaders/moderators about new request
      io.to(`clan:${clanId}`).emit("clans:request:received", {
        clanId,
        request: result.request,
      });
    }

    if (ack) ack(result);
  });

  // Accept clan request
  socket.on("clans:request:accept", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { requestId } = payload || {};

    if (!requestId) {
      if (ack) ack({ success: false, error: "requestId required" });
      return;
    }

    const result = await acceptClanRequest(prisma, userId, requestId);

    if (result.success) {
      // Notify the accepted user
      forEachSocialUserSocket(result.userId, (sid) => {
        io.to(sid).emit("clans:request:accepted", {
          clanId: result.clanId,
          membership: result.membership,
        });
        io.sockets.sockets.get(sid)?.join(`clan:${result.clanId}`);
      });
      // Notify clan members about new member
      io.to(`clan:${result.clanId}`).emit("clans:member:joined", {
        clanId: result.clanId,
        member: result.membership,
      });
    }

    if (ack) ack(result);
  });

  // Reject clan request
  socket.on("clans:request:reject", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { requestId } = payload || {};

    if (!requestId) {
      if (ack) ack({ success: false, error: "requestId required" });
      return;
    }

    const result = await rejectClanRequest(prisma, userId, requestId);

    if (result.success) {
      // Notify the rejected user
      emitToSocialUser(result.userId, "clans:request:rejected", { clanId: result.clanId });
    }

    if (ack) ack(result);
  });

  // Cancel own clan request
  socket.on("clans:request:cancel", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { requestId } = payload || {};

    if (!requestId) {
      if (ack) ack({ success: false, error: "requestId required" });
      return;
    }

    const result = await cancelClanRequest(prisma, userId, requestId);
    if (ack) ack(result);
  });

  // Get clan requests (for leaders/moderators)
  socket.on("clans:requests", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, status } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await getClanRequests(prisma, userId, clanId, { status });
    if (ack) ack(result);
  });

  // Get my pending clan requests
  socket.on("clans:requests:my", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const result = await getMyClanRequests(prisma, userId);
    if (ack) ack(result);
  });

  // Promote member to moderator (leader only, VIP/PRO required)
  socket.on("clans:member:promote", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, targetUserId } = payload || {};

    if (!clanId || !targetUserId) {
      if (ack) ack({ success: false, error: "clanId and targetUserId required" });
      return;
    }

    const result = await promoteMember(prisma, userId, targetUserId, clanId);

    if (result.success) {
      // Notify clan members about role change
      io.to(`clan:${clanId}`).emit("clans:member:role:changed", {
        clanId,
        member: result.member,
        newRole: "moderator",
        changedBy: userId,
      });
    }

    if (ack) ack(result);
  });

  // Demote moderator to member (leader only)
  socket.on("clans:member:demote", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, targetUserId } = payload || {};

    if (!clanId || !targetUserId) {
      if (ack) ack({ success: false, error: "clanId and targetUserId required" });
      return;
    }

    const result = await demoteMember(prisma, userId, targetUserId, clanId);

    if (result.success) {
      // Notify clan members about role change
      io.to(`clan:${clanId}`).emit("clans:member:role:changed", {
        clanId,
        member: result.member,
        newRole: "member",
        changedBy: userId,
      });
    }

    if (ack) ack(result);
  });

  // Transfer leadership (leader only)
  socket.on("clans:leadership:transfer", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, newLeaderId } = payload || {};

    if (!clanId || !newLeaderId) {
      if (ack) ack({ success: false, error: "clanId and newLeaderId required" });
      return;
    }

    const result = await transferLeadership(prisma, userId, newLeaderId, clanId);

    if (result.success) {
      // Notify clan members about leadership transfer
      io.to(`clan:${clanId}`).emit("clans:leadership:transferred", {
        clanId,
        oldLeaderId: userId,
        newLeaderId: result.newLeaderId,
      });
    }

    if (ack) ack(result);
  });

  // Send message to clan chat
  socket.on("clans:message:send", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, content } = payload || {};

    if (!clanId || !content) {
      if (ack) ack({ success: false, error: "clanId and content required" });
      return;
    }

    const result = await sendClanMessage(prisma, userId, clanId, content);

    if (result.success) {
      // Broadcast message to all clan members
      io.to(`clan:${clanId}`).emit("clans:message:received", {
        clanId,
        message: result.message,
      });
    }

    if (ack) ack(result);
  });

  // Get clan messages history
  socket.on("clans:messages", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, limit, before, after } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    const result = await getClanMessages(prisma, userId, clanId, { limit, before, after });
    if (ack) ack(result);
  });

  // Delete clan message
  socket.on("clans:message:delete", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { messageId } = payload || {};

    if (!messageId) {
      if (ack) ack({ success: false, error: "messageId required" });
      return;
    }

    const result = await deleteClanMessage(prisma, userId, messageId);

    if (result.success) {
      // Notify clan members about deleted message
      io.to(`clan:${result.clanId}`).emit("clans:message:deleted", {
        clanId: result.clanId,
        messageId,
        deletedBy: userId,
      });
    }

    if (ack) ack(result);
  });

  // Join clan chat room (for reconnection)
  socket.on("clans:chat:join", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId } = payload || {};

    if (!clanId) {
      if (ack) ack({ success: false, error: "clanId required" });
      return;
    }

    // Verify membership
    const membership = await prisma.clanMember.findFirst({
      where: { clanId, userId },
    });

    if (!membership) {
      if (ack) ack({ success: false, error: "Not a clan member" });
      return;
    }

    socket.join(`clan:${clanId}`);
    if (ack) ack({ success: true });
  });

  // Report a clan
  socket.on("clans:report", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, reason, description } = payload || {};

    if (!clanId || !reason) {
      if (ack) ack({ success: false, error: "clanId and reason required" });
      return;
    }

    const result = await reportClan(prisma, userId, clanId, reason, description);
    if (ack) ack(result);
  });

  // Get report reasons list
  socket.on("clans:report:reasons", async (payload, ack) => {
    if (ack) ack({ success: true, reasons: REPORT_REASONS });
  });

  // Get clan reports (admin only)
  socket.on("clans:reports", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { status, clanId, limit, offset } = payload || {};
    const result = await getClanReports(prisma, userId, { status, clanId, limit, offset });
    if (ack) ack(result);
  });

  // Resolve a report (admin only)
  socket.on("clans:report:resolve", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { reportId, status, adminNotes } = payload || {};

    if (!reportId || !status) {
      if (ack) ack({ success: false, error: "reportId and status required" });
      return;
    }

    const result = await resolveReport(prisma, userId, reportId, status, adminNotes);
    if (ack) ack(result);
  });

  // ===========================================================================
  // CLAN INVITE EVENTS
  // ===========================================================================

  // Send clan invite (leader/moderator only)
  socket.on("clan:invite:send", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { clanId, targetUserId, message } = payload || {};
    if (!clanId || !targetUserId) {
      if (ack) ack({ ok: false, error: "clanId and targetUserId required" });
      return;
    }

    try {
      // Check if user is leader or moderator of the clan
      const membership = await prisma.clanMember.findFirst({
        where: { clanId, userId, role: { in: ["leader", "moderator"] } }
      });

      if (!membership) {
        if (ack) ack({ ok: false, error: "Only clan leader or moderator can invite" });
        return;
      }

      // Check if target is already in a clan
      const targetMembership = await prisma.clanMember.findFirst({
        where: { userId: targetUserId }
      });

      if (targetMembership) {
        if (ack) ack({ ok: false, error: "User is already in a clan" });
        return;
      }

      // Check for existing pending invite
      const existingInvite = await prisma.clanInvite.findFirst({
        where: { clanId, inviteeId: targetUserId, status: "pending" }
      });

      if (existingInvite) {
        if (ack) ack({ ok: false, error: "Invite already sent" });
        return;
      }

      // Create invite (expires in 7 days)
      const invite = await prisma.clanInvite.create({
        data: {
          clanId,
          inviterId: userId,
          inviteeId: targetUserId,
          message: message || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        include: {
          clan: { select: { id: true, name: true, tag: true, avatarUrl: true } },
          inviter: { select: { id: true, nickname: true, avatarUrl: true } }
        }
      });

      // Notify target user
      const resolvedTargetId = await resolveUserId(prisma, targetUserId);
      const resolvedInviteeId = resolvedTargetId || targetUserId;
      emitToSocialUser(resolvedInviteeId, "clan:invite:received", {
        invite: {
          id: invite.id,
          clan: invite.clan,
          inviter: invite.inviter,
          message: invite.message,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
      });

      if (ack) ack({ ok: true, invite });
    } catch (e) {
      console.error("[clan:invite:send] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Accept clan invite
  socket.on("clan:invite:accept", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { inviteId } = payload || {};
    if (!inviteId) {
      if (ack) ack({ ok: false, error: "inviteId required" });
      return;
    }

    try {
      const invite = await prisma.clanInvite.findUnique({
        where: { id: inviteId },
        include: { clan: true }
      });

      if (!invite) {
        if (ack) ack({ ok: false, error: "Invite not found" });
        return;
      }

      if (invite.inviteeId !== userId) {
        if (ack) ack({ ok: false, error: "Not your invite" });
        return;
      }

      if (invite.status !== "pending") {
        if (ack) ack({ ok: false, error: "Invite already processed" });
        return;
      }

      if (new Date() > invite.expiresAt) {
        await prisma.clanInvite.update({
          where: { id: inviteId },
          data: { status: "expired" }
        });
        if (ack) ack({ ok: false, error: "Invite expired" });
        return;
      }

      // Check if user is already in a clan
      const existingMembership = await prisma.clanMember.findFirst({
        where: { userId }
      });

      if (existingMembership) {
        if (ack) ack({ ok: false, error: "You are already in a clan" });
        return;
      }

      // Accept invite - add user to clan
      await prisma.$transaction([
        prisma.clanInvite.update({
          where: { id: inviteId },
          data: { status: "accepted" }
        }),
        prisma.clanMember.create({
          data: {
            clanId: invite.clanId,
            userId,
            role: "member"
          }
        }),
        prisma.clan.update({
          where: { id: invite.clanId },
          data: { memberCount: { increment: 1 } }
        })
      ]);

      // Notify clan members
      const clanMembers = await prisma.clanMember.findMany({
        where: { clanId: invite.clanId },
        select: { userId: true }
      });

      const newMember = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true, avatarUrl: true }
      });

      for (const member of clanMembers) {
        emitToSocialUser(member.userId, "clan:member:joined", {
          clanId: invite.clanId,
          member: newMember,
        });
      }

      if (ack) ack({ ok: true, clanId: invite.clanId });
    } catch (e) {
      console.error("[clan:invite:accept] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Decline clan invite
  socket.on("clan:invite:decline", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { inviteId } = payload || {};
    if (!inviteId) {
      if (ack) ack({ ok: false, error: "inviteId required" });
      return;
    }

    try {
      const invite = await prisma.clanInvite.findUnique({
        where: { id: inviteId }
      });

      if (!invite) {
        if (ack) ack({ ok: false, error: "Invite not found" });
        return;
      }

      if (invite.inviteeId !== userId) {
        if (ack) ack({ ok: false, error: "Not your invite" });
        return;
      }

      if (invite.status !== "pending") {
        if (ack) ack({ ok: false, error: "Invite already processed" });
        return;
      }

      await prisma.clanInvite.update({
        where: { id: inviteId },
        data: { status: "declined" }
      });

      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("[clan:invite:decline] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Get pending clan invites for current user
  socket.on("clan:invite:list", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    try {
      const invites = await prisma.clanInvite.findMany({
        where: {
          inviteeId: userId,
          status: "pending",
          expiresAt: { gt: new Date() }
        },
        include: {
          clan: { select: { id: true, name: true, tag: true, avatarUrl: true, memberCount: true } },
          inviter: { select: { id: true, nickname: true, avatarUrl: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      if (ack) ack({ ok: true, invites });
    } catch (e) {
      console.error("[clan:invite:list] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // Cancel clan invite (inviter only)
  socket.on("clan:invite:cancel", async (payload, ack) => {
    const userId = socket.data.userId;
    if (!userId) {
      if (ack) ack({ ok: false, error: "Not authenticated" });
      return;
    }

    const { inviteId } = payload || {};
    if (!inviteId) {
      if (ack) ack({ ok: false, error: "inviteId required" });
      return;
    }

    try {
      const invite = await prisma.clanInvite.findUnique({
        where: { id: inviteId }
      });

      if (!invite) {
        if (ack) ack({ ok: false, error: "Invite not found" });
        return;
      }

      // Check if user is inviter or clan leader/moderator
      const membership = await prisma.clanMember.findFirst({
        where: { clanId: invite.clanId, userId, role: { in: ["leader", "moderator"] } }
      });

      if (invite.inviterId !== userId && !membership) {
        if (ack) ack({ ok: false, error: "Not authorized" });
        return;
      }

      if (invite.status !== "pending") {
        if (ack) ack({ ok: false, error: "Invite already processed" });
        return;
      }

      await prisma.clanInvite.delete({
        where: { id: inviteId }
      });

      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("[clan:invite:cancel] error:", e);
      if (ack) ack({ ok: false, error: "Server error" });
    }
  });

  // ===========================================================================
  // EMOTIONAL GAME EVENTS
  // ===========================================================================

  socket.on("emotional:room:create", async (payload, ack) => {
    const name = normalizeEmotionalName(payload?.name);
    const visitorId = payload?.visitorId || null;

    if (!name) {
      if (ack) ack({ ok: false, error: "��� �����������" });
      return;
    }

    await leaveAllRooms(socket);

    // ���� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let frameSlug = payload?.frameSlug || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      if (!frameSlug) frameSlug = userData?.customization?.frameAll || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
    }

    const { room, playerId } = createEmotionalRoom(name, avatarUrl, visitorId, frameSlug, nicknameStyle);

    socket.data.emotionalRoomCode = room.code;
    socket.data.emotionalPlayerId = playerId;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    emotionalPlayerSockets.set(playerId, socket.id);
    socket.join(`emotional:${room.code}`);
    setAutoLeaveTimer(socket);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "emotional");
      trackGameSession(socket, "emotional", room.code);
    }

    // ���������� ��������� ���� (�� ������� � �������������������)
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
      if (ack) ack({ ok: false, error: "��� � ��� �����������" });
      return;
    }

    await leaveAllRooms(socket);

    // ���� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let frameSlug = payload?.frameSlug || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      if (!frameSlug) frameSlug = userData?.customization?.frameAll || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
    }

    const result = joinEmotionalRoom(code, name, avatarUrl, visitorId, frameSlug, nicknameStyle);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    socket.data.emotionalRoomCode = result.room.code;
    socket.data.emotionalPlayerId = result.playerId;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    emotionalPlayerSockets.set(result.playerId, socket.id);
    socket.join(`emotional:${result.room.code}`);
    setAutoLeaveTimer(socket);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "emotional");
      trackGameSession(socket, "emotional", room.code);
    }

    // ���������� ��������� ����
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
    const visitorId = socket.data.visitorId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    // �������� gameStartedAt �� ������� ��� fallback ��� ������ �������
    const room = getEmotionalRoom(roomCode);
    const gameStartedAt = room?.gameStartedAt || null;

    // ���������� ����� � ���� ����� �������
    if (visitorId) {
      recordPlayerLeave(visitorId, "emotional", io, gameStartedAt);
    }

    const result = leaveEmotionalRoom(roomCode, playerId);

    // ���� ����� ��������� ��� ���� �����������/������� ������� � ������������� ������
    stopEmotionalTimer(roomCode);

    socket.leave(`emotional:${roomCode}`);
    emotionalPlayerSockets.delete(playerId);
    socket.data.emotionalRoomCode = null;
    socket.data.emotionalPlayerId = null;
    socket.data.visitorId = null;

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
      if (ack) ack({ ok: false, error: "�� � �������" });
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = submitEmotionalTurn(roomCode, playerId, emotion);
    console.log("[Emotional] submit received - emotion:", emotion, "error:", result.error);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���� ��� ����� � ����� ������� ����
    const canAdvance = canAdvanceEmotionalToVote(result.room, Date.now());
    console.log("[Emotional] canAdvance:", canAdvance, "phase:", result.room.phase, "submissions:", Object.keys(result.room.submissions || {}));
    if (canAdvance) {
      advanceEmotionalToVote(result.room, Date.now());
      console.log("[Emotional] after advanceToVote - phase:", result.room.phase, "table length:", result.room.table?.length);
      // �����: ��������� ������ ��� ���������� ����� reveal!
      startEmotionalTimer(roomCode);
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = skipEmotionalTurn(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    if (canAdvanceEmotionalToVote(result.room, Date.now())) {
      advanceEmotionalToVote(result.room, Date.now());
      // �����: ��������� ������ ��� ���������� ����� reveal!
      startEmotionalTimer(roomCode);
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = castEmotionalVote(roomCode, playerId, slotId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    if (canFinalizeEmotionalVote(result.room, Date.now())) {
      finalizeEmotionalRound(result.room);

      // ���������� ���������� ��� ������� ������, ��� ���������
      // ���������� ���������� = ����� �� ����� �������� (leaderId)
      const leaderId = result.room.leaderId;
      const leaderSlot = result.room.table?.find(s => s.playerId === leaderId);
      const leaderSlotId = leaderSlot?.slotId;

      for (const player of result.room.players) {
        // ���������� �������� � �� �� ��������
        if (player.id === leaderId) continue;
        // ���������� ������� ��� visitorId (����������������)
        if (!player.visitorId) continue;

        const votedSlotId = result.room.votes?.[player.id];
        // ����� ���������� � ����������� ���� �� ������������
        if (votedSlotId) {
          const guessedCorrectly = votedSlotId === leaderSlotId;
          try {
            await recordEmotionalRoundComplete(player.visitorId, guessedCorrectly, io);
          } catch (e) {
            console.error("[Stats] Emotional round error:", e);
          }
        }
      }

      // ���������, ����������� �� ����
      if (result.room.status === "ended") {
        const targetScore = result.room.settings?.targetScore ?? 15;
        const winnerPlayerIds = Object.entries(result.room.scores || {})
          .filter(([, score]) => score >= targetScore)
          .map(([playerId]) => playerId);
        const winnerSet = new Set(winnerPlayerIds);

        // ��������� ����� ���� � ��������
        const gameStartedAt = result.room.gameStartedAt;
        const timePlayed = gameStartedAt ? Math.floor((Date.now() - gameStartedAt) / 1000) : 0;

        console.log("[Stats] Emotional game ended - gameStartedAt:", gameStartedAt, "timePlayed:", timePlayed);

        for (const player of result.room.players) {
          if (!player.visitorId) continue;
          const won = winnerSet.has(player.id);
          try {
            await recordEmotionalGameComplete(player.visitorId, won, io, timePlayed);
          } catch (e) {
            console.error("[Stats] Emotional game complete error:", e);
          }
        }
      }
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = startEmotionalNextRound(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error, deckEmpty: result.deckEmpty });
      return;
    }

    if (result.room.status === "playing") {
      startEmotionalTimer(roomCode);
    } else {
      stopEmotionalTimer(roomCode);
    }

    // ���� ���� ��������� � ���������� ����������
    // (status === "ended" � emotional, �� "finished")
    if (result.room.status === "ended" && result.winners) {
      const winnerSet = new Set(result.winners);

      // ��������� ����� ���� � ��������
      const gameStartedAt = result.room.gameStartedAt;
      const timePlayed = gameStartedAt ? Math.floor((Date.now() - gameStartedAt) / 1000) : 0;

      console.log("[Stats] Emotional game ended (finalize) - gameStartedAt:", gameStartedAt, "timePlayed:", timePlayed);

      for (const player of result.room.players) {
        if (!player.visitorId) continue;
        const won = winnerSet.has(player.id);
        try {
          await recordEmotionalGameComplete(player.visitorId, won, io, timePlayed);
        } catch (e) {
          console.error("[Stats] Emotional game complete error:", e);
        }
      }
    }

    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true, winners: result.winners || [] });
  });

  // ����������� ������ ������ (����� ������ �����������)
  socket.on("emotional:deck:reshuffle", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = reshuffleEmotionalDeck(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ���� ������� � �����������
    result.room.players.forEach(p => {
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
        io.to(socketId).emit("emotional:deck:reshuffled", { deckCount: result.room.emotionDeck?.length || 0 });
      }
    });

    if (ack) ack({ ok: true, reshuffled: true });
  });

  socket.on("emotional:game:new", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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
        message: "�� ���� ������� �� ������� ������",
      });

      // ������������� ���������� �� �������
      const kickedSocket = io.sockets.sockets.get(kickedSocketId);
      if (kickedSocket) {
        kickedSocket.leave(`emotional:${roomCode}`);
        kickedSocket.data.emotionalRoomCode = null;
        kickedSocket.data.emotionalPlayerId = null;
      }
      emotionalPlayerSockets.delete(targetPlayerId);
    }

    // sync ���� ���������� (����� kicked)
    result.room.players.forEach(p => {
      if (p.connectionStatus === "kicked") return;
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true, kickedPlayerName: result.kickedPlayerName });
  });

  // ����� ����
  socket.on("emotional:game:pause", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = pauseEmotionalGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ���� ������� � �����
    result.room.players.forEach(p => {
      if (p.connectionStatus === "left" || p.connectionStatus === "kicked") return;
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // ������������� ����
  socket.on("emotional:game:resume", async (payload, ack) => {
    const roomCode = socket.data.emotionalRoomCode;
    const playerId = socket.data.emotionalPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = resumeEmotionalGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ���� ������� � �������������
    result.room.players.forEach(p => {
      if (p.connectionStatus === "left" || p.connectionStatus === "kicked") return;
      const socketId = emotionalPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // ===========================================================================
  // CODENAMES GAME EVENTS
  // ===========================================================================

  socket.on("codenames:room:create", async (payload, ack) => {
    const name = normalizeCodenamesName(payload?.name);
    const visitorId = payload?.visitorId || null;
    if (!name) {
      if (ack) ack({ ok: false, error: "��� �����������" });
      return;
    }

    // ������� �� ���� ���������� ������ ����� ��������� �����
    await leaveAllRooms(socket);

    // ���� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let frameSlug = payload?.frameSlug || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      if (!frameSlug) frameSlug = userData?.customization?.frameAll || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
    }

    const { room, playerId } = createCodenamesRoom(name, avatarUrl, visitorId, frameSlug, nicknameStyle);

    socket.data.codenamesRoomCode = room.code;
    socket.data.codenamesPlayerId = playerId;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    codenamesPlayerSockets.set(playerId, socket.id);
    socket.join(`codenames:${room.code}`);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "codenames");
      trackGameSession(socket, "codenames", room.code);
    }

    const state = buildCodenamesRoomState(room, playerId);
    if (ack) ack({ ok: true, state, playerId });
  });

  socket.on("codenames:room:join", async (payload, ack) => {
    const name = normalizeCodenamesName(payload?.name);
    const code = normalizeCodenamesName(payload?.code).toUpperCase();
    const visitorId = payload?.visitorId || null;

    if (!name || !code) {
      if (ack) ack({ ok: false, error: "��� � ��� �����������" });
      return;
    }

    // ������� �� ���� ���������� ������ ����� ��������������
    await leaveAllRooms(socket);

    // ���� avatarUrl, frameSlug � nicknameStyle �� payload ��� �� ������ ������������
    let avatarUrl = payload?.avatarUrl || null;
    let frameSlug = payload?.frameSlug || null;
    let nicknameStyle = null;
    if (socket.data.userId) {
      const userData = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: {
          avatarUrl: true,
          customization: {
            select: {
              frameAll: true,
              nicknameColorType: true,
              nicknameCustomColor: true,
              nicknameGradient: { select: { cssValue: true } },
              nicknameGlow: { select: { cssValue: true } }
            }
          }
        }
      });
      if (!avatarUrl) avatarUrl = userData?.avatarUrl || null;
      if (!frameSlug) frameSlug = userData?.customization?.frameAll || null;
      // ��������� nicknameStyle
      if (userData?.customization) {
        const c = userData.customization;
        nicknameStyle = {
          colorType: c.nicknameColorType,
          customColor: c.nicknameCustomColor,
          gradient: c.nicknameGradient,
          glow: c.nicknameGlow
        };
      }
    }

    const result = joinCodenamesRoom(code, name, avatarUrl, visitorId, frameSlug, nicknameStyle);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // Получаем комнату для использования
    const room = result.room;
    
    socket.data.codenamesRoomCode = room.code;
    socket.data.codenamesPlayerId = result.playerId;
    socket.data.visitorId = visitorId; // ��������� ��� ������ ������� ��� ������
    codenamesPlayerSockets.set(result.playerId, socket.id);
    socket.join(`codenames:${room.code}`);
    setAutoLeaveTimer(socket);

    // ���������� ����� ����� � ���� ��� ����������
    if (visitorId) {
      recordPlayerJoin(visitorId, "codenames");
      trackGameSession(socket, "codenames", room.code);
    }

    // ���������� ��������� ���� �������
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
      if (ack) ack({ ok: false, error: "����������� ������" });
      return;
    }

    const room = getCodenamesRoom(roomCode);
    if (!room) {
      if (ack) ack({ ok: false, error: "������� �� �������" });
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      if (ack) ack({ ok: false, error: "����� �� ������" });
      return;
    }

    player.connectionStatus = "online";
    player.lastSeen = new Date();

    socket.data.codenamesRoomCode = room.code;
    socket.data.codenamesPlayerId = playerId;
    socket.data.visitorId = player.visitorId; // ��������� ��� ������ ������� ��� ������
    codenamesPlayerSockets.set(playerId, socket.id);
    socket.join(`codenames:${room.code}`);

    // ���������� ���������� ��������� ����
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
    const visitorId = socket.data.visitorId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    // �������� gameStartedAt �� ������� ��� fallback ��� ������ �������
    const room = getCodenamesRoom(roomCode);
    const gameStartedAt = room?.gameStartedAt || null;

    // ���������� ����� � ���� ����� �������
    if (visitorId) {
      recordPlayerLeave(visitorId, "codenames", io, gameStartedAt);
    }

    const result = leaveCodenamesRoom(roomCode, playerId);

    socket.leave(`codenames:${roomCode}`);
    codenamesPlayerSockets.delete(playerId);
    socket.data.codenamesRoomCode = null;
    socket.data.codenamesPlayerId = null;
    socket.data.visitorId = null;

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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = joinCodenamesTeam(roomCode, playerId, team);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ��������� ����
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    if (!team || !name) {
      if (ack) ack({ ok: false, error: "������� ������� � ��������" });
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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

    // ��������� ������
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    if (!word || word.trim().length === 0) {
      if (ack) ack({ ok: false, error: "������� �����-���������" });
      return;
    }

    const result = giveCodenamesHint(roomCode, playerId, word, count);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ���������� ��� �������� (��� ���������)
    const captain = result.room.players.find(p => p.id === playerId);
    if (captain?.visitorId) {
      try {
        await recordCodenamesRoundComplete(captain.visitorId, "captain", 0, io);
      } catch (e) {
        console.error("[Stats] Codenames hint error:", e);
      }
    }

    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // ������ �� ��������������� - ����� ������ �� ���� ��� ���������� ����

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:hint:edit", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { word, count } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
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

  // ����������� �� ��������
  socket.on("codenames:card:vote", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = voteCodenamesCard(roomCode, playerId, cardId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ���������� ��������� ����
    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // ���� ��� ������������� �� ���� �������� - ��������� pending � ����� �������
    if (result.allVoted) {
      const pendingResult = startCodenamesPendingCard(roomCode, playerId, cardId);
      if (!pendingResult.error && pendingResult.pendingStarted) {
        // �������������� ��������� � pending ��� ���� �������
        pendingResult.room.players.forEach(p => {
          const socketId = codenamesPlayerSockets.get(p.id);
          if (socketId) {
            io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(pendingResult.room, p.id));
          }
        });

        // ��������� ������ �� ������������� (2 ���)
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

  // ������ ������
  socket.on("codenames:card:cancelVote", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    // �������� pending ���� ��� (��������� �������� ��������)
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

  // ����� �������� � �������������� (2.5 ���)
  socket.on("codenames:card:select", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = startCodenamesPendingCard(roomCode, playerId, cardId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���� ����� ��� ������ (��������� ���� �� �� �� ��������)
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

    // �������������� ��������� � pending card
    result.room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(result.room, p.id));
      }
    });

    // ���������� � ������ pending
    io.to(`codenames:${roomCode}`).emit("codenames:card:pending:start", {
      cardId,
      playerId,
      playerName: result.room.pendingCard.playerName,
      startedAt: result.room.pendingCard.startedAt,
      endsAt: result.room.pendingCard.endsAt
    });

    // ��������� ������ ������������� (2.5 ���)
    const timeoutId = setTimeout(() => {
      const confirmResult = confirmCodenamesPendingCard(roomCode);
      if (confirmResult.error) {
        return;
      }

      // �������������� ��������� ����� reveal
      confirmResult.room.players.forEach(p => {
        const socketId = codenamesPlayerSockets.get(p.id);
        if (socketId) {
          io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(confirmResult.room, p.id));
        }
      });

      // ���������� � �������������
      io.to(`codenames:${roomCode}`).emit("codenames:card:pending:confirm", {
        cardId,
        cardType: confirmResult.cardType
      });

      // ���� ���� ���������, ������������� ������
      if (confirmResult.gameOver) {
        stopCodenamesTimer(roomCode);
        io.to(`codenames:${roomCode}`).emit("codenames:game:finished", {
          winner: confirmResult.room.winner,
          reason: confirmResult.room.log[confirmResult.room.log.length - 1]?.reason
        });
      } else if (confirmResult.startTimer && confirmResult.timerDuration) {
        // ��������� ����� ������ ��� ���������� ����
        startCodenamesTimer(roomCode, confirmResult.timerDuration, io);
      }
    }, CODENAMES_TIMER_SETTINGS.PENDING_CONFIRM);

    setCodenamesPendingTimer(roomCode, timeoutId, cardId);

    if (ack) ack({ ok: true, pending: true, cardId });
  });

  // ������ ������ ��������
  socket.on("codenames:card:cancel", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
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

  // "������" �� �������� ��� �������� ������� (������ ���������; ���� �� ���������, ���� � ����� ���)
  socket.on("codenames:card:poke", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const room = getCodenamesRoom(roomCode);
    if (!room) {
      if (ack) ack({ ok: false, error: "������� �� �������" });
      return;
    }

    const player = room.players?.find(p => p.id === playerId);
    if (!player) {
      if (ack) ack({ ok: false, error: "����� �� ������" });
      return;
    }

    // ��������� ��������� � ������������ (� ������� ��� �������)
    const isCaptain = player.role === "captain";
    const isSpectator = player.role === "spectator" || !player.team;
    if (isCaptain || isSpectator) {
      if (ack) ack({ ok: false, error: "����������" });
      return;
    }

    if (room.status !== "playing") {
      if (ack) ack({ ok: false, error: "���� �� �������" });
      return;
    }

    const card = room.board?.find(c => c.id === cardId);
    if (!card || card.revealed) {
      if (ack) ack({ ok: false, error: "������ ������� ��� ��������" });
      return;
    }

    const isMyTurn = player.team === room.currentTeam;
    const canPoke = !room.currentHint || !isMyTurn;
    if (!canPoke) {
      if (ack) ack({ ok: false, error: "����������" });
      return;
    }

    // ��������� ���� ������� ��� �������� (��� ��������� ��������� ����)
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

  // ������ �������� �������� (��� �������� ������������� ��� ����������� reveal)
  socket.on("codenames:card:reveal", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { cardId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    // ������� pending ���� ����
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

    // ���� ���� ���������, ������������� ������ � ���������� ����������
    if (result.gameOver) {
      stopCodenamesTimer(roomCode);

      // ��������� ����� ���� � ��������
      const gameStartedAt = result.room.gameStartedAt;
      const timePlayed = gameStartedAt ? Math.floor((Date.now() - gameStartedAt) / 1000) : 0;

      // ���������� ���������� ��� ���� �������
      const winningTeam = result.room.winner;
      for (const player of result.room.players) {
        const won = player.team === winningTeam;
        try {
          await recordCodenamesGameComplete(player.visitorId, won, io, timePlayed);
        } catch (e) {
          console.error("[Stats] Codenames game complete error:", e);
        }
      }

      io.to(`codenames:${roomCode}`).emit("codenames:game:finished", {
        winner: result.room.winner,
        reason: result.room.log[result.room.log.length - 1]?.reason
      });
    } else if (result.startTimer && result.timerDuration) {
      // ��������� ����� ������ ��� ���������� ����
      startCodenamesTimer(roomCode, result.timerDuration, io);
    }

    if (ack) ack({ ok: true, cardType: result.cardType, endTurn: result.endTurn, gameOver: result.gameOver });
  });

  // ����������� �� ���������� ���� (������������)
  socket.on("codenames:turn:voteEnd", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = voteCodenamesEndTurn(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���� ��� ������������� - ��������� ���
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
      // ������ �������������� ��������� � ��������
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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

    // ��������� ����� ������ ��� ���������� ����
    if (result.startTimer && result.timerDuration) {
      startCodenamesTimer(roomCode, result.timerDuration, io);
    }

    if (ack) ack({ ok: true });
  });

  socket.on("codenames:game:reset", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    // ������������� ������ ��� ������ ����
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

  // ������������ ������ �������� ������� (����� ����� ������)
  socket.on("codenames:room:toggle", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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

  // ������� ����
  socket.on("codenames:turn:skip", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
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

  // �������� ������
  socket.on("codenames:player:kick", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;
    const { targetPlayerId } = payload || {};

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    if (!targetPlayerId) {
      if (ack) ack({ ok: false, error: "�� ������ �����" });
      return;
    }

    const result = kickCodenamesPlayer(roomCode, playerId, targetPlayerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ���������� ������� ��������� ������
    const kickedSocketId = codenamesPlayerSockets.get(targetPlayerId);
    if (kickedSocketId) {
      io.to(kickedSocketId).emit("codenames:player:kicked", {
        message: "�� ���� ������� �� ������� ������"
      });
    }

    // �������������� ��������� ��� ���������
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
      if (ack) ack({ ok: false, error: "�� � �������" });
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

  // ���������� ������� ������ (������������� ��������/�������/nicknameStyle �� �������)
  socket.on("codenames:player:update_profile", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const { nickname, avatarUrl, nicknameStyle } = payload || {};
    const room = getCodenamesRoom(roomCode);

    if (!room) {
      if (ack) ack({ ok: false, error: "������� �� �������" });
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      if (ack) ack({ ok: false, error: "����� �� ������" });
      return;
    }

    // ��������� ������ ������
    if (nickname && nickname.trim()) {
      player.name = nickname.trim().slice(0, 20);
    }
    if (avatarUrl !== undefined) {
      player.avatarUrl = avatarUrl;
    }
    if (nicknameStyle !== undefined) {
      player.nicknameStyle = nicknameStyle;
    }

    // ���������� ���������� ��������� ���� � �������
    room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  // ===========================================================================
  // CODENAMES PAUSE/RESUME
  // ===========================================================================
  socket.on("codenames:game:pause", async (payload, ack) => {
    const roomCode = socket.data.codenamesRoomCode;
    const playerId = socket.data.codenamesPlayerId;

    if (!roomCode || !playerId) {
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = pauseCodenamesGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ������������� ��������� ������
    stopCodenamesTimer(roomCode);

    // ���������� ���� �������
    io.to(`codenames:${roomCode}`).emit("codenames:game:paused", { isPaused: true });

    // ���������� ���������� ���������
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
      if (ack) ack({ ok: false, error: "�� � �������" });
      return;
    }

    const result = resumeCodenamesGame(roomCode, playerId);
    if (result.error) {
      if (ack) ack({ ok: false, error: result.error });
      return;
    }

    // ��������� ��������� ������ � ���������� ��������
    if (room.guessTimerEndsAt) {
      const remainingMs = room.guessTimerEndsAt - Date.now();
      if (remainingMs > 0) {
        startCodenamesTimer(roomCode, Math.ceil(remainingMs / 1000), io);
      }
    }

    // ���������� ���� �������
    io.to(`codenames:${roomCode}`).emit("codenames:game:paused", { isPaused: false });

    // ���������� ���������� ���������
    room.players.forEach(p => {
      const socketId = codenamesPlayerSockets.get(p.id);
      if (socketId) {
        io.to(socketId).emit("codenames:state:sync", buildCodenamesRoomState(room, p.id));
      }
    });

    if (ack) ack({ ok: true });
  });

  socket.on("disconnect", async () => {
    console.log("[Socket Disconnect] Socket ID:", socket.id,
      "aliasPlayerId:", socket.data.aliasPlayerId, "aliasRoomId:", socket.data.aliasRoomId,
      "emotionalPlayerId:", socket.data.emotionalPlayerId, "emotionalRoomCode:", socket.data.emotionalRoomCode,
      "visitorId:", socket.data.visitorId);

    // ������� ������ ���������� ��� ����������
    const autoLeaveTimerId = roomAutoLeaveTimers.get(socket.id);
    if (autoLeaveTimerId) {
      clearTimeout(autoLeaveTimerId);
      roomAutoLeaveTimers.delete(socket.id);
    }

    // Handle Emotional disconnect
    if (socket.data.emotionalPlayerId && socket.data.emotionalRoomCode) {
      const playerId = socket.data.emotionalPlayerId;
      const roomCode = socket.data.emotionalRoomCode;

      const currentSocketId = emotionalPlayerSockets.get(playerId);
      if (currentSocketId && currentSocketId !== socket.id) {
        // ����� ��� ��������������� ����� ������ ����� � ����������
        console.log("[Emotional Disconnect] Ignoring stale socket for player:", playerId);
      } else {
        // �������� gameStartedAt �� ������� ��� fallback ��� ������ �������
        const emotionalRoom = getEmotionalRoom(roomCode);
        const emotionalGameStartedAt = emotionalRoom?.gameStartedAt || null;

        // ���������� ����� � ����
        if (socket.data.visitorId) {
          recordPlayerLeave(socket.data.visitorId, "emotional", io, emotionalGameStartedAt);
        }

        const result = disconnectEmotionalPlayer(roomCode, playerId);
        if (result.room) {
          // ���������� ������ ������� � �����������
          result.room.players.forEach((p) => {
            if (p.id === playerId) return;
            if (p.connectionStatus === "left" || p.connectionStatus === "kicked") return;
            const socketId = emotionalPlayerSockets.get(p.id);
            if (socketId) {
              io.to(socketId).emit("emotional:state:sync", buildEmotionalRoomState(result.room, p.id));
            }
          });
        }
        emotionalPlayerSockets.delete(playerId);
      }
    }

    // Handle Codenames disconnect
    if (socket.data.codenamesPlayerId && socket.data.codenamesRoomCode) {
      const playerId = socket.data.codenamesPlayerId;
      const roomCode = socket.data.codenamesRoomCode;

      const currentSocketId = codenamesPlayerSockets.get(playerId);
      if (currentSocketId && currentSocketId !== socket.id) {
        // ����� ��� ��������������� ����� ������ �����
      } else {
        // ���������� ����� � ����
        if (socket.data.visitorId) {
          recordPlayerLeave(socket.data.visitorId, "codenames", io);
        }

        const room = getCodenamesRoom(roomCode);
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.connectionStatus = "disconnected";
            player.lastSeen = new Date();

            // ���������� ������ �������
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

      // ���������, ��� ������������� ����� ������������� �������� ���������� ��� ����� ������
      // ���� ����� ��� ��������������� ����� ������ ����� - �� �������� ��� ��� disconnected
      const currentSocketId = aliasPlayerSockets.get(aliasPlayerId);
      console.log("[Alias Disconnect] Player:", aliasPlayerId, "currentSocketId:", currentSocketId, "this socket.id:", socket.id);

      if (currentSocketId && currentSocketId !== socket.id) {
        console.log("[Alias Disconnect] Ignoring disconnect from stale socket for player:", aliasPlayerId);
        return; // ���� ����� �������, ����� ��� ��������� ����� ����� �����
      }

      // ���������� ����� � ����
      if (socket.data.visitorId) {
        recordPlayerLeave(socket.data.visitorId, "alias", io);
      }

      try {
        const player = await prisma.aliasPlayer.findUnique({ where: { id: aliasPlayerId } });
        if (player) {
          console.log("[Alias Disconnect] Marking player as disconnected:", aliasPlayerId, player.name);
          await prisma.aliasPlayer.update({
            where: { id: aliasPlayerId },
            data: { connectionStatus: "disconnected", lastSeen: new Date() }
          });

          // �������� ������ ������� � �����������
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

    // Update user online status on disconnect
    if (socket.data.userId) {
      const disconnectedUserId = socket.data.userId;
      // remove only current socket from presence set
      const remaining = removeSocialUserSocket(disconnectedUserId, socket.id);

      // If some sockets remain (multi-tab), keep user online.
      if (remaining > 0) {
        return;
      }

      // Grace period to avoid offline flicker on reconnect
      const existingTimer = userOfflineTimers.get(disconnectedUserId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timeoutId = setTimeout(async () => {
        try {
          userOfflineTimers.delete(disconnectedUserId);

          await prisma.user.update({
            where: { id: disconnectedUserId },
            data: {
              onlineStatus: "offline",
              lastSeenAt: new Date(),
              currentGameType: null,
              currentRoomCode: null,
            },
          });

          // Notify friends about status change
          const friendships = await prisma.friendship.findMany({
            where: { friendId: disconnectedUserId },
            select: { userId: true },
          });

          for (const f of friendships) {
            emitToSocialUser(f.userId, "friends:status:update", {
              userId: disconnectedUserId,
              onlineStatus: "offline",
              lastSeenAt: new Date(),
            });
          }
        } catch (e) {
          // Ignore errors
        }
      }, 5000);

      userOfflineTimers.set(disconnectedUserId, timeoutId);
    }

    // Handle Truth or Dare disconnect
    if (socket.data.playerId && socket.data.roomId) {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;

      // ���������� ����� � ����
      if (socket.data.visitorId) {
        recordPlayerLeave(socket.data.visitorId, "tod", io);
      }

      try {
        // ��������� ������ �� disconnected (��������� ������ �����)
        const player = await prisma.player.update({
          where: { id: playerId },
          data: {
            lastSeen: new Date(),
            connectionStatus: "disconnected"
          }
        });

        // ���������� ���� � ������� �� ��������� �������
        io.to(roomId).emit("player:connection_status", {
          playerId,
          connectionStatus: "disconnected",
          playerName: player.name
        });

        // ��������� ��������� �������
        await emitRoomState(roomId);

      } catch (error) {
        // Ignore missing player records.
      }
      playerSockets.delete(playerId);
    }
  });
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `\n[Ошибка] Порт ${PORT} уже занят.\n` +
      `Закройте процесс, который слушает порт ${PORT}, и запустите снова: npm run dev\n` +
      `Подсказка (Windows PowerShell):\n` +
      `  netstat -ano | findstr :${PORT}\n` +
      `  taskkill /PID <PID> /F\n`
    );
    process.exit(1);
  }

  console.error("[Server error]", err);
  process.exit(1);
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
"" 
