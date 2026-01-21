/**
 * Alias Game Logic Module
 * Handles all Alias-specific game logic and Socket.IO events
 */

const { customAlphabet } = require("nanoid");

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

// In-memory state for timers and pause
const aliasTimers = new Map();
const aliasPausedRooms = new Map();
const aliasPlayerSockets = new Map();
const aliasRoundHistory = new Map(); // roomId -> [{ word, correct, timestamp }]
const aliasReviewTimers = new Map(); // roomId -> { interval, endsAt }

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
function getDefaultAliasSettings() {
  return {
    difficulty: "normal",
    turnSeconds: 60,
    targetScore: 30,
    skipPenalty: 0 // 0 or -1
  };
}

function parseSettings(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

function normalizeAliasSettings(raw) {
  const defaults = getDefaultAliasSettings();
  const parsed = parseSettings(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return { ...defaults, ...parsed };
  }
  return defaults;
}

function serializeSettings(raw) {
  return JSON.stringify(normalizeAliasSettings(raw));
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
async function generateAliasRoomCode(prisma) {
  let code = makeRoomCode();
  let existing = await prisma.aliasRoom.findUnique({ where: { code } });
  while (existing) {
    code = makeRoomCode();
    existing = await prisma.aliasRoom.findUnique({ where: { code } });
  }
  return code;
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

// ═══════════════════════════════════════════════════════════════════════════
// BUILD ROOM STATE
// ═══════════════════════════════════════════════════════════════════════════
async function buildAliasRoomState(prisma, roomId) {
  const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
  if (!room) return null;

  const settings = normalizeAliasSettings(room.settings);
  const teams = await prisma.aliasTeam.findMany({
    where: { roomId },
    orderBy: { turnOrder: "asc" },
    include: { members: true }
  });
  // Не показываем игроков со статусом "left" (на случай если остались старые записи)
  const players = await prisma.aliasPlayer.findMany({
    where: { roomId, connectionStatus: { not: "left" } },
    orderBy: { joinedAt: "asc" }
  });

  // Get current word for explainer only (handled on client side)
  let currentWord = null;
  if (room.currentWordId) {
    const word = await prisma.aliasWord.findUnique({ where: { id: room.currentWordId } });
    currentWord = word?.text || null;
  }

  return {
    room: {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      settings,
      currentTeamId: room.currentTeamId,
      currentExplainerId: room.currentExplainerId,
      turnStartedAt: room.turnStartedAt,
      turnEndsAt: room.turnEndsAt
    },
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      score: t.score,
      turnOrder: t.turnOrder,
      creatorId: t.creatorId,
      members: t.members.map(m => m.id)
    })),
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      teamId: p.teamId,
      isReady: p.isReady,
      isSpectator: p.isSpectator,
      connectionStatus: p.connectionStatus,
      explainOrder: p.explainOrder
    })),
    currentWord // Will be filtered on client for non-explainers
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function stopAliasTimer(roomId) {
  const entry = aliasTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    aliasTimers.delete(roomId);
  }
  const wasPaused = aliasPausedRooms.has(roomId);
  aliasPausedRooms.delete(roomId);
  return wasPaused;
}

function isAliasPaused(roomId) {
  return aliasPausedRooms.get(roomId)?.isPaused || false;
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
async function buildDeck(prisma, difficulty) {
  const words = await prisma.aliasWord.findMany({
    where: { difficulty, isActive: true },
    select: { id: true }
  });
  
  // Fisher-Yates shuffle
  const ids = words.map(w => w.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  
  return ids;
}

async function getNextWord(prisma, roomId) {
  const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
  if (!room) return null;

  let deck = JSON.parse(room.deck || "[]");
  const settings = normalizeAliasSettings(room.settings);

  // Rebuild deck if empty
  if (deck.length === 0) {
    deck = await buildDeck(prisma, settings.difficulty);
    if (deck.length === 0) return null;
  }

  const wordId = deck.shift();
  const usedWordIds = JSON.parse(room.usedWordIds || "[]");
  usedWordIds.push(wordId);

  await prisma.aliasRoom.update({
    where: { id: roomId },
    data: {
      deck: JSON.stringify(deck),
      usedWordIds: JSON.stringify(usedWordIds),
      currentWordId: wordId
    }
  });

  const word = await prisma.aliasWord.findUnique({ where: { id: wordId } });
  return word?.text || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TURN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// Хранилище индексов объясняющих для каждой команды (teamId -> index)
const teamExplainerIndexes = new Map();

function getNextTeamAndExplainer(teams, players, currentTeamId, currentExplainerId) {
  if (teams.length === 0) return { teamId: null, explainerId: null, nextExplainerIndex: 0 };

  // Find current team index
  let teamIndex = teams.findIndex(t => t.id === currentTeamId);
  if (teamIndex === -1) teamIndex = -1;
  
  // Move to next team
  teamIndex = (teamIndex + 1) % teams.length;
  const nextTeam = teams[teamIndex];

  // Get team members sorted by explainOrder
  // НЕ фильтруем по connectionStatus - disconnected игрок тоже может быть объясняющим
  // Он просто не сможет начать ход пока не переподключится, но очередь сохраняется
  const teamMembers = players
    .filter(p => p.teamId === nextTeam.id && !p.isSpectator)
    .sort((a, b) => a.explainOrder - b.explainOrder);

  if (teamMembers.length === 0) {
    return { teamId: nextTeam.id, explainerId: null, nextExplainerIndex: 0 };
  }

  // Получаем текущий индекс объясняющего для этой команды
  let explainerIndex = teamExplainerIndexes.get(nextTeam.id) || 0;
  
  // Убеждаемся, что индекс в пределах массива
  explainerIndex = explainerIndex % teamMembers.length;
  
  const explainerId = teamMembers[explainerIndex]?.id || null;
  
  // Увеличиваем индекс для следующего раза (циклически)
  const nextIndex = (explainerIndex + 1) % teamMembers.length;
  teamExplainerIndexes.set(nextTeam.id, nextIndex);

  return {
    teamId: nextTeam.id,
    explainerId,
    nextExplainerIndex: nextIndex
  };
}

// Сброс индексов объясняющих (при сбросе игры)
function resetExplainerIndexes(roomTeamIds) {
  if (roomTeamIds) {
    roomTeamIds.forEach(id => teamExplainerIndexes.delete(id));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUND HISTORY
// ═══════════════════════════════════════════════════════════════════════════

// Хранилище ID команды для текущего раунда (для корректировки очков после хода)
const aliasRoundTeamId = new Map();

function addWordToHistory(roomId, word, correct, teamId) {
  if (!aliasRoundHistory.has(roomId)) {
    aliasRoundHistory.set(roomId, []);
  }
  // Сохраняем teamId при первом добавлении слова
  if (teamId && !aliasRoundTeamId.has(roomId)) {
    aliasRoundTeamId.set(roomId, teamId);
  }
  aliasRoundHistory.get(roomId).push({
    word,
    correct,
    timestamp: Date.now()
  });
}

function getRoundHistory(roomId) {
  return aliasRoundHistory.get(roomId) || [];
}

function getRoundTeamId(roomId) {
  return aliasRoundTeamId.get(roomId) || null;
}

function clearRoundHistory(roomId) {
  aliasRoundHistory.delete(roomId);
  aliasRoundTeamId.delete(roomId);
}

function updateWordInHistory(roomId, index, correct) {
  const history = aliasRoundHistory.get(roomId);
  if (history && history[index]) {
    history[index].correct = correct;
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
  getDefaultAliasSettings,
  normalizeAliasSettings,
  serializeSettings,
  generateAliasRoomCode,
  normalizeName,
  makeUniqueName,
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
  aliasTimers,
  aliasPausedRooms,
  aliasPlayerSockets,
  aliasReviewTimers
};
