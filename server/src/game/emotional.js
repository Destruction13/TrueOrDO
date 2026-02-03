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
const EMOTIONS_SOURCE = readLines(path.join(EMOTIONAL_DATA_DIR, "emotions.txt"));
const WORDS_SOURCE = readLines(path.join(EMOTIONAL_DATA_DIR, "words.txt"));

// Чтобы колода не заканчивалась слишком быстро при 4+ игроках,
// используем заранее размноженный набор эмоций (перемешиваем один раз на комнату).
const EMOTION_COPIES = 6;


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
  };
}

function normalizeSettings(raw) {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const targetScore = Number.isFinite(raw.targetScore)
    ? Math.max(1, Math.min(50, Math.round(raw.targetScore)))
    : defaults.targetScore;

  const allowSkip = typeof raw.allowSkip === "boolean" ? raw.allowSkip : defaults.allowSkip;

  return { targetScore, allowSkip };
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
  const deck = [];
  for (let i = 0; i < EMOTION_COPIES; i++) {
    // Применяем переносы к каждой эмоции
    const hyphenatedEmotions = EMOTIONS_SOURCE.map(emotion => hyphenateWord(emotion));
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
      (p) => p.visitorId === visitorId && p.connectionStatus !== "left"
    );
    if (existing) {
      existing.connectionStatus = "online";
      existing.lastSeen = new Date();
      if (avatarUrl !== undefined) existing.avatarUrl = avatarUrl;
      room.updatedAt = new Date();
      room.emptySince = null;
      if (room.scores[existing.id] == null) room.scores[existing.id] = 0;
      if (!room.hands[existing.id]) room.hands[existing.id] = [];
      return { room, playerId: existing.id, reconnected: true };
    }
  }

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

  return {
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
    table: (() => {
      // В фазе reveal эмоции раскрываются по одной, поэтому часть слотов может оставаться "в рубашке".
      // publicTable содержит полную таблицу (emotion), но наружу отдаём emotion=null пока слот не раскрыт.
      if (room.phase === "reveal") {
        const revealed = room.revealedSlotIds || {};
        return publicTable.map((s) => ({
          ...s,
          emotion: revealed[s.slotId] ? s.emotion : null,
        }));
      }

      return publicTable;
    })(),
    votesCountBySlotId: getVotesCountBySlotId(room),
    roundResult: room.roundResult || null,

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

  // По правилам запрещено восстанавливать колоды автоматически.
  // В reset делаем только сброс состояния раунда; сами колоды не пересоздаём.

  // ensure hands again
  ensureLobbyReady(room);

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
  room.updatedAt = new Date();

  return { room, kickedPlayerName: target.name };
}

function getActivePlayers(room) {
  return room.players.filter((p) => p.connectionStatus === "online");
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
  const allSubmitted = active.every((p) => (p.id === leaderId ? true : room.submissions?.[p.id]));
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

  // Игрок, пропустивший выкладку, не участвует в голосовании
  if (room.submissions?.[voterId] === "skip") {
    return { error: "Вы пропустили раунд и не участвуете в голосовании" };
  }

  const voter = room.players.find((p) => p.id === voterId);
  if (!voter || voter.connectionStatus !== "online") return { error: "Игрок не найден" };

  const slot = room.table.find((s) => s.slotId === slotId);
  if (!slot) return { error: "Карта не найдена" };

  room.votes[voterId] = slotId;
  room.updatedAt = new Date();
  return { room };
}

function canFinalizeVote(room, nowMs = Date.now()) {
  if (room.phase !== "vote") return false;

  // Голосуют только те, кто НЕ пропустил выкладку (и не ведущий)
  const active = getActivePlayers(room).filter(
    (p) => p.id !== room.leaderId && room.submissions?.[p.id] !== "skip"
  );
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

  // начисление очков
  if (winnerSlots.length > 0) {
    winnerSlots.forEach((s) => {
      if (room.scores[s.playerId] == null) room.scores[s.playerId] = 0;
      const add = s.playerId === leaderId ? 2 : 1;
      room.scores[s.playerId] += add;
    });
  }

  // roundResult для UI
  room.roundResult = {
    leaderId,
    leaderSecretEmotion: leaderSecret,
    winners: winnerSlots.map((s) => ({ slotId: s.slotId, playerId: s.playerId, emotion: s.emotion })),
    leaderWon,
    votesCount,
    scores: room.scores,
  };

  const target = room.settings?.targetScore ?? 15;
  const reached = Object.entries(room.scores || {})
    .filter(([, score]) => score >= target)
    .map(([playerId]) => playerId);

  if (reached.length > 0) {
    room.status = "ended";
    room.phase = "ended";
    room.phaseEndsAt = null;
  } else {
    room.phase = "results";
    room.phaseEndsAt = null;
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

  // cleanup reveal meta
  room.revealStartedAt = null;
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

  ensureLobbyReady(room);
  room.updatedAt = new Date();

  return { room };
}

function cleanupRooms(nowMs = Date.now(), maxEmptyMs = 10 * 60 * 1000) {
  for (const [code, room] of emotionalRooms.entries()) {
    if (room?.emptySince && nowMs - room.emptySince > maxEmptyMs) {
      emotionalRooms.delete(code);
    }
  }
}

module.exports = {
  cleanupRooms,
  emotionalRooms,
  normalizeName,
  makeUniqueName,
  generateRoomCode,
  getDefaultSettings,
  normalizeSettings,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
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

  // reveal auto-advance
  advanceRevealToVote,

  buildRoomState,
};
