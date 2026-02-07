/**
 * Emotional Intelligence Game Logic Module (Iteration 1)
 * In-memory rooms: create/join/leave + room state builder.
 */

const { customAlphabet } = require("nanoid");
const fs = require("fs");
const path = require("path");
const { hyphenateSync } = require("hyphen/ru");

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

const emotionalRooms = new Map(); // code -> room
const emotionalPausedRooms = new Map(); // roomCode -> { isPaused, pausedAt, remainingPhaseTime, remainingAutoAdvanceTime }

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const EMOTIONAL_DATA_DIR = path.join(__dirname, "..", "..", "data", "emotional");

// Парсим эмоции с категориями: формат "Эмоция,category"
const EMOTIONS_RAW = readLines(path.join(EMOTIONAL_DATA_DIR, "emotions.txt"));
const EMOTIONS_WITH_CATEGORIES = EMOTIONS_RAW.map((line) => {
  const [emotion, category] = line.split(",").map((s) => s.trim());
  return { emotion, category: category || "other" };
});
// Для обратной совместимости — просто список эмоций
const EMOTIONS_SOURCE = EMOTIONS_WITH_CATEGORIES.map((e) => e.emotion);
// Маппинг эмоция -> категория (для быстрого поиска)
const EMOTION_TO_CATEGORY = Object.fromEntries(
  EMOTIONS_WITH_CATEGORIES.map((e) => [e.emotion, e.category])
);
// Маппинг категория -> список эмоций
const CATEGORY_TO_EMOTIONS = {};
EMOTIONS_WITH_CATEGORIES.forEach((e) => {
  if (!CATEGORY_TO_EMOTIONS[e.category]) CATEGORY_TO_EMOTIONS[e.category] = [];
  CATEGORY_TO_EMOTIONS[e.category].push(e.emotion);
});

const WORDS_SOURCE = readLines(path.join(EMOTIONAL_DATA_DIR, "words.txt"));

// Чтобы колода не заканчивалась слишком быстро при 4+ игроках,
// используем заранее размноженный набор эмоций (перемешиваем один раз на комнату).
// Требование ТЗ: уникальность эмоций во всей игре.
// Одна эмоция = одна карточка. Колода может закончиться — это нормально.
const EMOTION_COPIES = 1;


function normalizeName(name) {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 20);
}

function makeUniqueName(name, takenLower) {
  const base = normalizeName(name);
  if (!base) return "";
  const lower = base.toLowerCase();
  if (!takenLower.includes(lower)) return base;

  for (let i = 2; i < 100; i++) {
    const candidate = `${base} ${i}`;
    if (!takenLower.includes(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Math.floor(Math.random() * 1000)}`;
}

function generateRoomCode() {
  let code = makeRoomCode();
  // just in case
  while (emotionalRooms.has(code)) code = makeRoomCode();
  return code;
}

function getDefaultSettings() {
  return {
    targetScore: 15,
    allowSkip: true,
    autoAdvance: false, // Автоматический переход к следующему раунду через 5 секунд
  };
}

function normalizeSettings(raw) {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const targetScore = Number.isFinite(raw.targetScore)
    ? Math.max(1, Math.min(50, Math.round(raw.targetScore)))
    : defaults.targetScore;

  const allowSkip = typeof raw.allowSkip === "boolean" ? raw.allowSkip : defaults.allowSkip;
  const autoAdvance = typeof raw.autoAdvance === "boolean" ? raw.autoAdvance : defaults.autoAdvance;

  return { targetScore, allowSkip, autoAdvance };
}

/**
 * Добавляет мягкие переносы (soft hyphens) в слово для корректного переноса по слогам
 * @param {string} word - слово для обработки
 * @returns {string} слово с soft hyphens (\u00AD) в точках переноса
 */
function hyphenateWord(word) {
  try {
    return hyphenateSync(word);
  } catch (err) {
    console.error("[Emotional] Hyphenation error for word:", word, err);
    return word;
  }
}

function createEmotionDeck() {
  // Применяем переносы один раз; затем формируем колоду.
  const hyphenatedEmotions = EMOTIONS_SOURCE.map((emotion) => hyphenateWord(emotion));

  const deck = [];
  for (let i = 0; i < EMOTION_COPIES; i++) {
    deck.push(...hyphenatedEmotions);
  }
  return shuffleInPlace(deck);
}

function createWordDeck() {
  return shuffleInPlace([...WORDS_SOURCE]);
}

function createRoom(hostName, hostAvatarUrl, visitorId) {
  const code = generateRoomCode();
  const playerId = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const room = {
    id: code,
    code,
    hostId: playerId,
    status: "lobby",
    phase: "lobby",
    round: 0,
    leaderId: playerId,
    settings: getDefaultSettings(),

    // Iteration 3 data
    emotionDeck: createEmotionDeck(),
    wordDeck: createWordDeck(),
    hands: {}, // playerId -> string[]
    scores: {}, // playerId -> number

    // Round data (set when round starts)
    phaseEndsAt: null,
    currentWord: null,
    secretEmotionByLeader: null, // leaderId -> emotion (не отправлять всем!)
    submissions: {}, // playerId -> emotion | "skip" | null
    table: [], // shuffled list of { slotId, emotion, playerId } (playerId hidden in public state)
    // reveal: какие слоты уже раскрыты (slotId -> true)
    revealedSlotIds: {},
    // reveal: когда были раскрыты все карты (чтобы дать анимации переворота закончиться)
    allRevealedAt: null,
    tableRevealed: false,
    votes: {}, // voterId -> slotId
    roundResult: null,
    // История раундов для отчёта игры
    roundHistory: [], // { roundNumber, secretEmotion, voteResult: "correct" | "incorrect" | "draw" | "no_contest" }
    emptySince: null,

    createdAt: new Date(),
    updatedAt: new Date(),
    players: [
      {
        id: playerId,
        name: hostName,
        avatarUrl: hostAvatarUrl,
        visitorId: visitorId || null,
        connectionStatus: "online",
        joinedAt: new Date(),
        lastSeen: new Date(),
      },
    ],
  };

  room.scores[playerId] = 0;
  room.hands[playerId] = [];

  emotionalRooms.set(code, room);
  return { room, playerId };
}

function drawFromDeck(room, count) {
  const drawn = [];
  while (drawn.length < count) {
    if (!room.emotionDeck || room.emotionDeck.length === 0) {
      // По правилам запрещено восстанавливать/перемешивать/регенерировать колоду.
      break;
    }
    drawn.push(room.emotionDeck.pop());
  }
  return drawn;
}

/**
 * Выбирает карты из колоды, отдавая приоритет той же категории (вайбу),
 * что и referenceEmotion. Если в колоде нет карт той же категории,
 * берёт любые доступные карты.
 * 
 * @param {object} room - комната
 * @param {number} count - сколько карт нужно
 * @param {string} referenceEmotion - эмоция-образец (для определения категории)
 * @returns {string[]} - массив эмоций
 */
function drawFromDeckByCategory(room, count, referenceEmotion) {
  if (!room.emotionDeck || room.emotionDeck.length === 0) return [];
  
  // Убираем soft hyphens для поиска категории
  const cleanEmotion = referenceEmotion?.replace(/\u00AD/g, "") || "";
  const targetCategory = EMOTION_TO_CATEGORY[cleanEmotion] || "other";
  
  const drawn = [];
  
  // Сначала ищем карты той же категории
  for (let i = room.emotionDeck.length - 1; i >= 0 && drawn.length < count; i--) {
    const emotion = room.emotionDeck[i];
    const emotionClean = emotion?.replace(/\u00AD/g, "") || "";
    const emotionCategory = EMOTION_TO_CATEGORY[emotionClean];
    
    if (emotionCategory === targetCategory) {
      drawn.push(room.emotionDeck.splice(i, 1)[0]);
    }
  }
  
  // Если не хватило карт той же категории — добираем любые
  while (drawn.length < count && room.emotionDeck.length > 0) {
    drawn.push(room.emotionDeck.pop());
  }
  
  return drawn;
}

function dealHands(room) {
  const activePlayers = room.players.filter((p) => p.connectionStatus === "online");
  activePlayers.forEach((p) => {
    if (!room.hands[p.id]) room.hands[p.id] = [];
    const need = 8 - room.hands[p.id].length;
    if (need > 0) {
      room.hands[p.id].push(...drawFromDeck(room, need));
    }
  });
}

function popWord(room) {
  // По правилам: если колода пуста — добор не происходит.
  if (!room.wordDeck || room.wordDeck.length === 0) {
    return null;
  }
  // Применяем переносы к слову
  const word = room.wordDeck.pop();
  return word ? hyphenateWord(word) : null;
}

function joinRoom(code, name, avatarUrl, visitorId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  // reconnect by visitorId
  if (visitorId) {
    const existing = room.players.find(
      (p) => p.visitorId === visitorId && p.connectionStatus !== "left" && p.connectionStatus !== "kicked"
    );
    if (existing) {
      console.log("[Emotional joinRoom] Reconnecting player:", existing.id, "visitorId:", visitorId, "hand before:", room.hands[existing.id]?.length || 0);
      existing.connectionStatus = "online";
      existing.lastSeen = new Date();
      if (avatarUrl !== undefined) existing.avatarUrl = avatarUrl;
      // Обновляем имя при переподключении, если передано новое
      if (name) {
        const takenNames = room.players
          .filter((p) => p.connectionStatus !== "left" && p.id !== existing.id)
          .map((p) => (p.name || "").toLowerCase());
        existing.name = makeUniqueName(name, takenNames);
      }
      room.updatedAt = new Date();
      room.emptySince = null;
      if (room.scores[existing.id] == null) room.scores[existing.id] = 0;
      // Инициализируем руку только если её нет (не перезаписываем существующую)
      if (!room.hands[existing.id]) room.hands[existing.id] = [];
      console.log("[Emotional joinRoom] Reconnected. Hand after:", room.hands[existing.id]?.length || 0);
      return { room, playerId: existing.id, reconnected: true };
    }
  }

  // Не нашли существующего игрока для reconnect — создаём нового
  console.log("[Emotional joinRoom] Creating NEW player. visitorId:", visitorId, "existing players:", room.players.map(p => ({ id: p.id, visitorId: p.visitorId, status: p.connectionStatus })));
  
  const takenNames = room.players
    .filter((p) => p.connectionStatus !== "left")
    .map((p) => (p.name || "").toLowerCase());
  const finalName = makeUniqueName(name, takenNames);

  const playerId = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const player = {
    id: playerId,
    name: finalName,
    avatarUrl,
    visitorId: visitorId || null,
    connectionStatus: "online",
    joinedAt: new Date(),
    lastSeen: new Date(),
  };

  room.players.push(player);
  if (room.scores[playerId] == null) room.scores[playerId] = 0;
  if (!room.hands[playerId]) room.hands[playerId] = [];

  room.updatedAt = new Date();
  room.emptySince = null;
  return { room, playerId };
}

function getRoom(code) {
  return emotionalRooms.get(code?.toUpperCase());
}

function leaveRoom(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connectionStatus = "left";
    player.lastSeen = new Date();

    // Возвращаем карты ушедшего игрока в колоду
    const hand = room.hands?.[playerId] || [];
    if (hand.length > 0 && room.emotionDeck) {
      room.emotionDeck.push(...hand);
      shuffleInPlace(room.emotionDeck);
    }

    // cleanup per-player state
    if (room.hands) delete room.hands[playerId];
    if (room.submissions) delete room.submissions[playerId];
    if (room.votes) delete room.votes[playerId];

    room.updatedAt = new Date();

    if (room.hostId === playerId) {
      const newHost = room.players.find(
        (p) => p.connectionStatus === "online" && p.id !== playerId
      );
      if (newHost) {
        room.hostId = newHost.id;
      }
    }
  }

  const hasActive = room.players.some((p) => p.connectionStatus === "online");
  if (!hasActive) {
    // Не удаляем комнату мгновенно — иначе приглашения по ссылке/коду ломаются.
    // Даём комнате "grace period".
    room.emptySince = Date.now();
    room.updatedAt = new Date();
    return { room, deleted: false, empty: true };
  }

  room.emptySince = null;
  return { room, deleted: false };
}

function buildRoomState(room, meId) {
  const isLeader = room.leaderId === meId;

  // Публичный стол: playerId не отправляем (анонимность)
  const publicTable = Array.isArray(room.table)
    ? room.table.map((slot) => ({
        slotId: slot.slotId,
        emotion: slot.emotion,
      }))
    : [];

  const deckCount = Array.isArray(room.emotionDeck) ? room.emotionDeck.length : 0;
  
  // Получаем состояние паузы
  const pauseState = emotionalPausedRooms.get(room.code);
  const isPaused = pauseState?.isPaused || false;

  return {
    // Серверное время для синхронизации таймеров на клиенте
    serverNow: Date.now(),
    room: {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      phase: room.phase,
      phaseEndsAt: room.phaseEndsAt,
      round: room.round,
      leaderId: room.leaderId,
      settings: room.settings,
      currentWord: room.currentWord,
      deckCount,
      deckEmpty: deckCount === 0,
      // Итерация 10: флаг очистки стола после показа результатов
      tableCleared: room.tableCleared || false,
      // Статус паузы
      isPaused,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    },
    meId,

    // Персональные данные
    my: {
      hand: room.hands?.[meId] || [],
      score: room.scores?.[meId] ?? 0,
      submission: room.submissions?.[meId] ?? null,
      secretEmotion: isLeader ? room.secretEmotionByLeader : null,
      vote: room.votes?.[meId] ?? null,
    },

    // Публичные данные
    scores: room.scores || {},
    // Всегда отправляем emotion — клиент сам управляет анимацией reveal по таймеру
    table: publicTable,
    // Время начала reveal фазы для клиентской анимации
    // Отправляем в обеих фазах (reveal и vote), чтобы клиент мог управлять анимацией без перемонтирования
    revealStartedAt: (room.phase === "reveal" || room.phase === "vote") ? room.revealStartedAt : null,
    votesCountBySlotId: getVotesCountBySlotId(room),
    votersBySlotId: getVotersBySlotId(room),
    roundResult: room.roundResult || null,
    roundHistory: room.roundHistory || [],

    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl || null,
      connectionStatus: p.connectionStatus || "online",
      joinedAt: p.joinedAt,
      lastSeen: p.lastSeen,
    })),
  };
}

function getVotesCountBySlotId(room) {
  const counts = {};
  if (!room?.votes) return counts;
  Object.values(room.votes).forEach((slotId) => {
    if (!slotId) return;
    counts[slotId] = (counts[slotId] || 0) + 1;
  });
  return counts;
}

/**
 * Возвращает объект: slotId -> массив никнеймов игроков, которые голосовали за этот слот.
 * Используется для отчёта раунда в UI.
 */
function getVotersBySlotId(room) {
  const votersMap = {};
  if (!room?.votes) return votersMap;

  Object.entries(room.votes).forEach(([voterId, slotId]) => {
    if (!slotId) return;
    if (!votersMap[slotId]) votersMap[slotId] = [];
    const player = room.players.find((p) => p.id === voterId);
    if (player) {
      votersMap[slotId].push(player.name || "Аноним");
    }
  });

  return votersMap;
}


function updateSettings(code, actorId, nextSettings) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== actorId) return { error: "Только хост может менять настройки" };

  room.settings = normalizeSettings({ ...room.settings, ...nextSettings });
  room.updatedAt = new Date();
  return { room };
}

function resetGame(code, actorId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== actorId) return { error: "Только хост может начать заново" };

  room.status = "lobby";
  room.phase = "lobby";
  room.round = 0;
  room.leaderId = room.hostId;

  // reset gameplay state
  room.phaseEndsAt = null;
  room.currentWord = null;
  room.secretEmotionByLeader = null;
  room.submissions = {};
  room.votes = {};
  room.table = [];
  room.revealedSlotIds = {};
  room.allRevealedAt = null;
  room.revealStartedAt = null;
  room.tableRevealed = false;
  room.roundResult = null;
  room.tableCleared = false;
  room.resultsShownAt = null;
  room.roundHistory = []; // Сброс истории раундов

  // Полный сброс: создаём новые колоды эмоций и слов
  room.emotionDeck = createEmotionDeck();
  room.wordDeck = createWordDeck();

  // Сбрасываем очки всех игроков
  room.players.forEach((p) => {
    room.scores[p.id] = 0;
  });

  // Очищаем руки всех игроков (будут розданы при старте игры)
  room.hands = {};
  room.players.forEach((p) => {
    room.hands[p.id] = [];
  });

  // НЕ раздаём руки здесь — они раздаются при startGame

  room.updatedAt = new Date();
  return { room };
}

function kickPlayer(code, actorId, targetPlayerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== actorId) return { error: "Только хост может удалять игроков" };
  if (!targetPlayerId) return { error: "Не выбран игрок" };
  if (targetPlayerId === room.hostId) return { error: "Нельзя удалить хоста" };

  const target = room.players.find((p) => p.id === targetPlayerId);
  if (!target || target.connectionStatus === "left") return { error: "Игрок не найден" };

  target.connectionStatus = "kicked";
  target.lastSeen = new Date();

  // Возвращаем карты кикнутого игрока в колоду
  const hand = room.hands?.[targetPlayerId] || [];
  if (hand.length > 0 && room.emotionDeck) {
    room.emotionDeck.push(...hand);
    shuffleInPlace(room.emotionDeck);
  }
  delete room.hands[targetPlayerId];
  
  // Очищаем данные раунда
  if (room.submissions) delete room.submissions[targetPlayerId];
  if (room.votes) delete room.votes[targetPlayerId];

  room.updatedAt = new Date();

  return { room, kickedPlayerName: target.name };
}

function getActivePlayers(room) {
  return room.players.filter((p) => p.connectionStatus === "online");
}

/**
 * Отметить игрока как отключённого (disconnected).
 * Карты остаются у игрока, но он не участвует в голосовании текущего раунда.
 * При переподключении (joinRoom с тем же visitorId) статус вернётся в "online".
 */
function disconnectPlayer(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  
  // Если игрок уже ушёл или кикнут — не меняем статус
  if (player.connectionStatus === "left" || player.connectionStatus === "kicked") {
    return { room };
  }

  player.connectionStatus = "disconnected";
  player.lastSeen = new Date();
  room.updatedAt = new Date();

  // Если дисконнектнулся хост — передаём права
  if (room.hostId === playerId) {
    const newHost = room.players.find(
      (p) => p.connectionStatus === "online" && p.id !== playerId
    );
    if (newHost) {
      room.hostId = newHost.id;
    }
  }

  // Проверяем, остались ли активные игроки
  const hasActive = room.players.some((p) => p.connectionStatus === "online");
  if (!hasActive) {
    room.emptySince = Date.now();
    return { room, empty: true };
  }

  room.emptySince = null;
  return { room };
}

function ensureLobbyReady(room) {
  // базовая подготовка (раздать руки)
  dealHands(room);
}

function startGame(code, actorId, nowMs = Date.now()) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== actorId) return { error: "Только хост может начать игру" };

  const active = getActivePlayers(room);
  if (active.length < 2) return { error: "Нужно минимум 2 игрока" };

  ensureLobbyReady(room);

  room.status = "playing";
  room.phase = "submit";
  room.round = (room.round || 0) + 1;
  room.leaderId = room.leaderId || room.hostId;

  // round init
  room.currentWord = popWord(room);
  {
    const secretArr = drawFromDeck(room, 1);
    room.secretEmotionByLeader = secretArr.length ? secretArr[0] : null;
  }
  room.phaseEndsAt = nowMs + 60_000;
  room.submissions = {};
  room.votes = {};
  room.roundResult = null;
  room.table = [];
  room.revealedSlotIds = {};
  room.allRevealedAt = null;
  room.revealStartedAt = null;
  room.tableRevealed = false;

  room.updatedAt = new Date();
  return { room };
}

function submitTurn(code, playerId, emotion) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.phase !== "submit") return { error: "Сейчас нельзя выбирать эмоцию" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.connectionStatus !== "online") return { error: "Игрок не найден" };

  // Ведущий не выбирает карту из руки — его эмоция задаётся автоматически
  if (room.leaderId === playerId) {
    return { error: "Ведущий не выбирает карту — эмоция задана" };
  }

  const hand = room.hands?.[playerId] || [];
  if (!hand.includes(emotion)) return { error: "Этой эмоции нет в руке" };

  room.submissions[playerId] = emotion;
  room.updatedAt = new Date();
  return { room };
}

function skipTurn(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.phase !== "submit") return { error: "Сейчас нельзя пропускать" };
  if (!room.settings?.allowSkip) return { error: "Пропуск отключён настройками" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.connectionStatus !== "online") return { error: "Игрок не найден" };

  room.submissions[playerId] = "skip";
  room.updatedAt = new Date();
  return { room };
}

function canAdvanceToVote(room, nowMs = Date.now()) {
  if (room.phase !== "submit") return false;
  const active = getActivePlayers(room);
  const leaderId = room.leaderId;
  // Игрок считается "сделавшим ход" если:
  // 1. Он ведущий (ведущий не выкладывает карту из руки)
  // 2. Он уже сделал submission
  // 3. У него нет карт на руке (новый игрок, присоединившийся во время раунда)
  const allSubmitted = active.every((p) => {
    if (p.id === leaderId) return true;
    if (room.submissions?.[p.id]) return true;
    const hand = room.hands?.[p.id] || [];
    if (hand.length === 0) return true; // Нет карт — не ожидаем submission
    return false;
  });
  const timeOver = room.phaseEndsAt && nowMs >= room.phaseEndsAt;
  return allSubmitted || timeOver;
}

function advanceToVote(room, nowMs = Date.now()) {
  if (room.phase !== "submit") return;

  // Если таймер истёк — все, кто не выложил, пропускают раунд (по правилам)
  const isTimeout = room.phaseEndsAt && nowMs >= room.phaseEndsAt;
  if (isTimeout) {
    const activePlayers = getActivePlayers(room);
    activePlayers.forEach((p) => {
      if (p.id === room.leaderId) return;
      if (!room.submissions?.[p.id]) {
        room.submissions[p.id] = "skip";
      }
    });
  }

  // формируем стол из submitted эмоций (skip не кладём).
  // Ведущий НЕ выкладывает карту: его эмоция раскрывается отдельно.
  const slots = [];
  const active = getActivePlayers(room);
  active.forEach((p) => {
    if (p.id === room.leaderId) return;

    const sub = room.submissions?.[p.id];
    if (!sub || sub === "skip") return;

    // убираем карту из руки
    const hand = room.hands?.[p.id] || [];
    const idx = hand.indexOf(sub);
    if (idx >= 0) hand.splice(idx, 1);

    slots.push({
      slotId: `s_${Math.random().toString(36).slice(2, 9)}`,
      emotion: sub,
      playerId: p.id,
    });
  });

  // Ведущий тоже обязан сыграть карту (берём из его руки отдельно от secretEmotion)
  const leaderId = room.leaderId;
  if (leaderId && room.submissions?.[leaderId] && room.submissions[leaderId] !== "skip") {
    // уже добавлен выше как активный игрок
  }

  // Добавляем карту ведущего (секретную эмоцию) на стол автоматически.
  // В руку ведущего не лезем и карту из колоды 8 не тратим.
  if (room.leaderId && room.secretEmotionByLeader) {
    slots.push({
      slotId: `s_${Math.random().toString(36).slice(2, 9)}`,
      emotion: room.secretEmotionByLeader,
      playerId: room.leaderId,
    });
  }

  // Добавляем дополнительные карты из колоды при малом количестве игроков:
  // - 2 игрока: +2 карты (итого минимум 4 на столе)
  // - 3 игрока: +1 карта (итого минимум 4 на столе)
  // Карты выбираются из той же категории (вайба), что и секретная эмоция ведущего,
  // чтобы голосование было интереснее и не слишком очевидным.
  const activeCount = getActivePlayers(room).length;
  let extraCardsNeeded = 0;
  if (activeCount === 2) {
    extraCardsNeeded = 2;
  } else if (activeCount === 3) {
    extraCardsNeeded = 1;
  }
  
  if (extraCardsNeeded > 0) {
    const extraEmotions = drawFromDeckByCategory(room, extraCardsNeeded, room.secretEmotionByLeader);
    extraEmotions.forEach((emotion) => {
      slots.push({
        slotId: `s_${Math.random().toString(36).slice(2, 9)}`,
        emotion: emotion,
        playerId: null, // Карта из колоды — без владельца
      });
    });
  }

  // Итерация 9: если на столе < 2 карт — голосование бессмысленно.
  // Переходим сразу в фазу "no_contest" (пропуск раунда без голосования).
  if (slots.length < 2) {
    room.table = slots;
    room.tableRevealed = true;
    room.revealedSlotIds = Object.fromEntries(slots.map((s) => [s.slotId, true]));
    room.allRevealedAt = null;
    room.phase = "no_contest";
    room.phaseEndsAt = null;
    room.tableCleared = true; // Сразу показываем кнопку "Следующий раунд"
    room.votes = {};
    room.roundResult = {
      leaderId: room.leaderId,
      leaderSecretEmotion: room.secretEmotionByLeader,
      winners: [],
      leaderWon: false,
      votesCount: {},
      scores: room.scores,
      noContest: true,
    };

    // Сохраняем результат раунда no_contest в историю
    const leaderPlayer = room.players.find((p) => p.id === room.leaderId);
    if (!room.roundHistory) room.roundHistory = [];
    room.roundHistory.push({
      roundNumber: room.round,
      secretEmotion: room.secretEmotionByLeader,
      voteResult: "no_contest",
      winnerEmotions: [],
      leaderId: room.leaderId,
      leaderName: leaderPlayer?.name || "Ведущий",
      roundScores: {},
      votersByEmotion: {},
    });

    room.updatedAt = new Date();

    // добор карт до 8
    dealHands(room);
    return;
  }

  shuffleInPlace(slots);
  room.table = slots;
  room.tableRevealed = false;
  room.revealedSlotIds = {};
  room.allRevealedAt = null;

  // Фаза "reveal": сначала выкладываем карты рубашкой вниз, затем раскрываем по одной.
  // Тайминги по ТЗ:
  // - 5 секунд после выкладки
  // - затем по одной карте слева направо с интервалом 0.5с
  room.phase = "reveal";
  room.revealStartedAt = nowMs;
  room.phaseEndsAt = null; // управляется тикером (startEmotionalTimer)
  room.votes = {};
  room.updatedAt = new Date();

  // добор карт до 8 после того, как сыграли
  dealHands(room);
}

function castVote(code, voterId, slotId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.phase !== "vote") return { error: "Сейчас нельзя голосовать" };

  // Ведущий не голосует
  if (room.leaderId === voterId) {
    return { error: "Ведущий не голосует" };
  }

  // Игрок, пропустивший выкладку или не участвовавший в раунде, не голосует
  const submission = room.submissions?.[voterId];
  if (!submission || submission === "skip") {
    return { error: "Вы не участвуете в голосовании этого раунда" };
  }

  const voter = room.players.find((p) => p.id === voterId);
  if (!voter) return { error: "Игрок не найден" };
  if (voter.connectionStatus !== "online") return { error: "Отключённые игроки не могут голосовать" };

  const slot = room.table.find((s) => s.slotId === slotId);
  if (!slot) return { error: "Карта не найдена" };

  room.votes[voterId] = slotId;
  room.updatedAt = new Date();
  return { room };
}

function canFinalizeVote(room, nowMs = Date.now()) {
  if (room.phase !== "vote") return false;

  // Голосуют только онлайн-игроки (не disconnected), кто сделал submission (не skip) и не ведущий
  const active = getActivePlayers(room).filter((p) => {
    if (p.id === room.leaderId) return false;
    const submission = room.submissions?.[p.id];
    // Игрок участвует в голосовании только если он выложил карту (не skip и не undefined)
    return submission && submission !== "skip";
  });
  const allVoted = active.every((p) => room.votes?.[p.id]);
  const timeOver = room.phaseEndsAt && nowMs >= room.phaseEndsAt;
  return allVoted || timeOver;
}

function finalizeRound(room) {
  if (room.phase !== "vote") return;

  const votesCount = {};
  Object.values(room.votes || {}).forEach((slotId) => {
    votesCount[slotId] = (votesCount[slotId] || 0) + 1;
  });

  let max = 0;
  Object.values(votesCount).forEach((c) => (max = Math.max(max, c)));

  const winners = Object.entries(votesCount)
    .filter(([, c]) => c === max)
    .map(([slotId]) => slotId);

  // Победители: playerIds по slotId
  const winnerSlots = room.table.filter((s) => winners.includes(s.slotId));

  // Для UI в results: на столе остаются только победившие карты
  // (или две при равенстве). Если никто не голосовал — оставляем весь стол.
  const hasAnyVotes = Object.keys(votesCount).length > 0;
  if (hasAnyVotes && winnerSlots.length > 0) {
    room.table = winnerSlots;
    room.revealedSlotIds = Object.fromEntries(winnerSlots.map((s) => [s.slotId, true]));
    room.tableRevealed = true;
  }

  const leaderId = room.leaderId;
  const leaderSecret = room.secretEmotionByLeader;

  // Определяем, есть ли среди победителей карта ведущего
  const leaderWon = winnerSlots.some((s) => s.playerId === leaderId);

  // Находим slotId карты ведущего
  const leaderSlot = room.table.find((s) => s.playerId === leaderId);
  const leaderSlotId = leaderSlot?.slotId;

  // Начисление очков по новой логике:
  // 1. Игроки, проголосовавшие за карту ведущего, получают +1 (независимо от победы)
  // 2. Ведущий получает +2 только если его карта победила
  // 3. Игрок (не ведущий), чья карта победила, получает +1
  // 4. Проголосовавшие за победившую карту игрока (не ведущего) — ничего

  // 1. Начисляем +1 всем, кто проголосовал за карту ведущего
  if (leaderSlotId) {
    Object.entries(room.votes || {}).forEach(([voterId, votedSlotId]) => {
      if (votedSlotId === leaderSlotId) {
        if (room.scores[voterId] == null) room.scores[voterId] = 0;
        room.scores[voterId] += 1;
      }
    });
  }

  // 2. Если карта ведущего победила — ведущий получает +2
  if (leaderWon) {
    if (room.scores[leaderId] == null) room.scores[leaderId] = 0;
    room.scores[leaderId] += 2;
  }

  // 3. Игроки (не ведущие), чьи карты победили — получают +1
  winnerSlots.forEach((s) => {
    if (s.playerId !== leaderId) {
      if (room.scores[s.playerId] == null) room.scores[s.playerId] = 0;
      room.scores[s.playerId] += 1;
    }
  });

  // roundResult для UI
  room.roundResult = {
    leaderId,
    leaderSecretEmotion: leaderSecret,
    winners: winnerSlots.map((s) => ({ slotId: s.slotId, playerId: s.playerId, emotion: s.emotion })),
    leaderWon,
    votesCount,
    scores: room.scores,
  };

  // Сохраняем результат раунда в историю
  let voteResult = "incorrect";
  if (winnerSlots.length === 0) {
    voteResult = "no_votes";
  } else if (winnerSlots.length > 1) {
    // Проверяем, есть ли среди победителей карта ведущего
    const leaderAmongWinners = winnerSlots.some((s) => s.playerId === leaderId);
    voteResult = leaderAmongWinners ? "draw_correct" : "draw_incorrect";
  } else if (leaderWon) {
    voteResult = "correct";
  }

  // Вычисляем очки за этот раунд
  const roundScores = {};
  
  // Ведущий получает +2 если победил
  if (leaderWon) {
    roundScores[leaderId] = (roundScores[leaderId] || 0) + 2;
  }

  // Игроки получают +1 за голос за карту ведущего
  if (leaderSlotId) {
    Object.entries(room.votes || {}).forEach(([voterId, votedSlotId]) => {
      if (votedSlotId === leaderSlotId) {
        roundScores[voterId] = (roundScores[voterId] || 0) + 1;
      }
    });
  }

  // Владельцы победивших карт (не ведущий) получают +1
  winnerSlots.forEach((s) => {
    if (s.playerId !== leaderId) {
      roundScores[s.playerId] = (roundScores[s.playerId] || 0) + 1;
    }
  });

  // Собираем информацию о голосах по эмоциям для истории
  const votersByEmotion = {};
  const slotById = Object.fromEntries(room.table.map((s) => [s.slotId, s]));
  Object.entries(room.votes || {}).forEach(([voterId, slotId]) => {
    const slot = slotById[slotId];
    if (slot) {
      const voter = room.players.find((p) => p.id === voterId);
      if (!votersByEmotion[slot.emotion]) {
        votersByEmotion[slot.emotion] = {
          emotion: slot.emotion,
          isLeaderCard: slot.playerId === leaderId,
          ownerName: room.players.find((p) => p.id === slot.playerId)?.name || null,
          voters: [],
          voteCount: 0,
          isWinner: winnerSlots.some((w) => w.slotId === slotId),
        };
      }
      // Сохраняем и id, и имя для отображения очков в отчёте
      votersByEmotion[slot.emotion].voters.push({
        id: voterId,
        name: voter?.name || "?",
      });
      votersByEmotion[slot.emotion].voteCount++;
    }
  });

  const leaderPlayer = room.players.find((p) => p.id === leaderId);
  
  if (!room.roundHistory) room.roundHistory = [];
  room.roundHistory.push({
    roundNumber: room.round,
    secretEmotion: leaderSecret,
    voteResult,
    winnerEmotions: winnerSlots.map((s) => s.emotion),
    leaderId,
    leaderName: leaderPlayer?.name || "Ведущий",
    roundScores,
    votersByEmotion,
  });

  const target = room.settings?.targetScore ?? 15;
  const reached = Object.entries(room.scores || {})
    .filter(([, score]) => score >= target)
    .map(([playerId]) => playerId);

  if (reached.length > 0) {
    room.status = "ended";
    room.phase = "ended";
    room.phaseEndsAt = null;
    room.resultsShownAt = null;
    room.tableCleared = false;
  } else {
    room.phase = "results";
    room.phaseEndsAt = null;
    // Итерация 10: запоминаем время показа результатов для автоматической очистки стола через 5 сек
    room.resultsShownAt = Date.now();
    room.tableCleared = false;
  }

  room.updatedAt = new Date();
}

function rotateLeader(room) {
  const active = getActivePlayers(room);
  if (active.length === 0) return;
  const idx = active.findIndex((p) => p.id === room.leaderId);
  const next = active[(idx + 1 + active.length) % active.length];
  room.leaderId = next.id;
}

function advanceRevealToVote(room, nowMs = Date.now()) {
  if (room.phase !== "reveal") return;

  // Гарантируем, что к моменту голосования все карты уже раскрыты.
  room.tableRevealed = true;
  room.revealedSlotIds = Object.fromEntries((room.table || []).map((s) => [s.slotId, true]));

  room.phase = "vote";
  room.phaseEndsAt = nowMs + 30_000;

  // НЕ очищаем revealStartedAt — клиент использует его для плавной анимации без перемонтирования
  // room.revealStartedAt остаётся для клиентской анимации
  room.allRevealedAt = null;

  room.updatedAt = new Date();
}

function startNextRound(code, actorId, nowMs = Date.now()) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== actorId) return { error: "Только хост может продолжить" };

  // check win
  const target = room.settings?.targetScore ?? 15;
  const winners = Object.entries(room.scores || {})
    .filter(([, score]) => score >= target)
    .map(([playerId]) => playerId);
  if (winners.length > 0) {
    room.status = "ended";
    room.phase = "ended";
    room.phaseEndsAt = null;
    room.updatedAt = new Date();
    return { room, winners };
  }

  // Проверяем, достаточно ли карт в колоде для следующего раунда
  // Нужна минимум 1 карта для секретной эмоции ведущего
  if (!room.emotionDeck || room.emotionDeck.length < 1) {
    return { error: "Колода закончилась", deckEmpty: true };
  }

  rotateLeader(room);

  room.phase = "submit";
  room.status = "playing";
  room.round = (room.round || 0) + 1;
  room.currentWord = popWord(room);
  const secretArr = drawFromDeck(room, 1);
  room.secretEmotionByLeader = secretArr.length ? secretArr[0] : null;
  room.phaseEndsAt = nowMs + 60_000;
  room.submissions = {};
  room.votes = {};
  room.roundResult = null;
  room.table = [];
  room.revealedSlotIds = {};
  room.allRevealedAt = null;
  room.revealStartedAt = null;
  room.tableRevealed = false;
  room.tableCleared = false;
  room.resultsShownAt = null;
  room.autoAdvanceAt = null; // Сбрасываем таймер автопродолжения

  ensureLobbyReady(room);
  room.updatedAt = new Date();

  return { room };
}

/**
 * Перетасовать колоду эмоций — восстанавливает все эмоции кроме тех, что на руках у игроков
 */
function reshuffleDeck(code, actorId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== actorId) return { error: "Только хост может перетасовать колоду" };

  // Собираем все эмоции, которые сейчас на руках у игроков
  const handsEmotions = new Set();
  Object.values(room.hands || {}).forEach((hand) => {
    hand.forEach((emotion) => handsEmotions.add(emotion));
  });

  // Создаём новую колоду из всех эмоций, исключая те, что на руках
  const hyphenatedEmotions = EMOTIONS_SOURCE.map((emotion) => hyphenateWord(emotion));
  const newDeck = [];
  for (let i = 0; i < EMOTION_COPIES; i++) {
    hyphenatedEmotions.forEach((emotion) => {
      if (!handsEmotions.has(emotion)) {
        newDeck.push(emotion);
      }
    });
  }

  shuffleInPlace(newDeck);
  room.emotionDeck = newDeck;
  room.updatedAt = new Date();

  return { room, reshuffled: true };
}

function cleanupRooms(nowMs = Date.now(), maxEmptyMs = 10 * 60 * 1000) {
  for (const [code, room] of emotionalRooms.entries()) {
    if (room?.emptySince && nowMs - room.emptySince > maxEmptyMs) {
      emotionalRooms.delete(code);
      emotionalPausedRooms.delete(code);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAUSE / RESUME GAME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Поставить игру на паузу.
 * Сохраняет оставшееся время таймеров для корректного возобновления.
 * Пауза блокирует:
 * - submit: выкладку карт
 * - reveal: анимацию раскрытия
 * - vote: голосование
 * - results: автопродолжение (autoAdvance)
 * 
 * @param {string} code - код комнаты
 * @param {string} playerId - ID игрока (должен быть хостом)
 * @returns {object} - результат операции
 */
function pauseGame(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может ставить игру на паузу" };
  if (room.status !== "playing") return { error: "Игра не активна" };
  
  // Проверяем, не на паузе ли уже
  const existingPause = emotionalPausedRooms.get(code);
  if (existingPause?.isPaused) return { error: "Игра уже на паузе" };

  const now = Date.now();
  
  // Вычисляем оставшееся время фазы
  let remainingPhaseTime = null;
  if (room.phaseEndsAt && room.phaseEndsAt > now) {
    remainingPhaseTime = room.phaseEndsAt - now;
  }
  
  // Вычисляем оставшееся время autoAdvance (для фазы results)
  let remainingAutoAdvanceTime = null;
  if (room.phase === "results" && room.resultsShownAt && room.settings?.autoAdvance) {
    const autoAdvanceDelay = 5000; // 5 секунд
    const elapsed = now - room.resultsShownAt;
    if (elapsed < autoAdvanceDelay) {
      remainingAutoAdvanceTime = autoAdvanceDelay - elapsed;
    }
  }
  
  // Вычисляем оставшееся время для reveal анимации
  let remainingRevealTime = null;
  if (room.phase === "reveal" && room.revealStartedAt) {
    remainingRevealTime = now - room.revealStartedAt; // сколько уже прошло
  }

  const pauseState = {
    isPaused: true,
    pausedAt: now,
    phase: room.phase,
    remainingPhaseTime,
    remainingAutoAdvanceTime,
    remainingRevealTime,
    revealStartedAt: room.revealStartedAt,
    resultsShownAt: room.resultsShownAt,
  };

  emotionalPausedRooms.set(code, pauseState);

  // Устанавливаем флаг паузы в комнате
  room.isPaused = true;
  room.updatedAt = new Date();

  return { room, pauseState };
}

/**
 * Возобновить игру после паузы.
 * Восстанавливает таймеры с учётом оставшегося времени.
 * 
 * @param {string} code - код комнаты
 * @param {string} playerId - ID игрока (должен быть хостом)
 * @returns {object} - результат операции
 */
function resumeGame(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может возобновить игру" };

  const pauseState = emotionalPausedRooms.get(code);
  if (!pauseState || !pauseState.isPaused) {
    return { error: "Игра не на паузе" };
  }

  const now = Date.now();

  // Восстанавливаем таймер фазы
  if (pauseState.remainingPhaseTime !== null) {
    room.phaseEndsAt = now + pauseState.remainingPhaseTime;
  }
  
  // Восстанавливаем время начала reveal (сдвигаем на время паузы)
  if (pauseState.phase === "reveal" && pauseState.revealStartedAt !== null) {
    const pauseDuration = now - pauseState.pausedAt;
    room.revealStartedAt = pauseState.revealStartedAt + pauseDuration;
  }
  
  // Восстанавливаем время показа результатов (для autoAdvance)
  if (pauseState.phase === "results" && pauseState.resultsShownAt !== null) {
    const pauseDuration = now - pauseState.pausedAt;
    room.resultsShownAt = pauseState.resultsShownAt + pauseDuration;
  }

  // Снимаем паузу
  room.isPaused = false;
  emotionalPausedRooms.delete(code);
  room.updatedAt = new Date();

  return { room };
}

/**
 * Проверить, на паузе ли игра
 * @param {string} code - код комнаты
 * @returns {boolean}
 */
function isGamePaused(code) {
  return emotionalPausedRooms.get(code)?.isPaused || false;
}

/**
 * Получить состояние паузы
 * @param {string} code - код комнаты
 * @returns {object|null}
 */
function getPauseState(code) {
  return emotionalPausedRooms.get(code) || null;
}

module.exports = {
  cleanupRooms,
  emotionalRooms,
  emotionalPausedRooms,
  normalizeName,
  makeUniqueName,
  generateRoomCode,
  getDefaultSettings,
  normalizeSettings,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  disconnectPlayer,
  updateSettings,
  resetGame,
  kickPlayer,

  // Iteration 3 exports
  startGame,
  submitTurn,
  skipTurn,
  canAdvanceToVote,
  advanceToVote,
  castVote,
  canFinalizeVote,
  finalizeRound,
  startNextRound,
  reshuffleDeck,

  // reveal auto-advance
  advanceRevealToVote,

  // pause / resume
  pauseGame,
  resumeGame,
  isGamePaused,
  getPauseState,

  buildRoomState,
};
