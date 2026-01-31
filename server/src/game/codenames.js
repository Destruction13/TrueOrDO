/**
 * Codenames Game Logic Module
 * Handles all Codenames-specific game logic and Socket.IO events
 */

const { customAlphabet } = require("nanoid");
const fs = require("fs");
const path = require("path");
const { hyphenateSync } = require("hyphen/ru");

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

// In-memory state
const codenamesPlayerSockets = new Map(); // playerId -> socketId
const codenamesTimers = new Map(); // roomId -> { intervalId, endsAt, phase }
const codenamesPausedRooms = new Map(); // roomCode -> { isPaused, pausedAt, remainingHintTime, remainingGuessTime }

// Card types
const CARD_TYPES = {
  RED: "red",
  BLUE: "blue",
  NEUTRAL: "neutral",
  ASSASSIN: "assassin"
};

// Team colors
const TEAMS = {
  RED: "red",
  BLUE: "blue"
};

// Player roles
const ROLES = {
  CAPTAIN: "captain",
  OPERATIVE: "operative",
  SPECTATOR: "spectator"
};

// Timer settings (in seconds)
const TIMER_SETTINGS = {
  FIRST_HINT: 120,  // 2 минуты на первую подсказку
  HINT: 60,         // 1 минута на подсказку (потом overtime)
  GUESS: 60,        // 1 минута на угадывание
  BONUS: 10,        // +10 секунд за правильное угадывание
  PENDING_CONFIRM: 2000  // 2 секунды на подтверждение выбора карточки (в мс)
};

// Таймеры для pending selection
const codenamePendingTimers = new Map(); // roomCode -> { timeoutId, cardId, startedAt }

// ═══════════════════════════════════════════════════════════════════════════
// LOAD WORDS FROM FILE
// ═══════════════════════════════════════════════════════════════════════════
let wordsList = [];

function loadWords() {
  try {
    const filePath = path.join(__dirname, "..", "..", "data", "alias", "easy.txt");
    const content = fs.readFileSync(filePath, "utf-8");
    wordsList = content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 15); // Фильтруем слишком длинные слова
    console.log(`[Codenames] Loaded ${wordsList.length} words`);
  } catch (err) {
    console.error("[Codenames] Failed to load words:", err);
    wordsList = [];
  }
}

// Load words on module init
loadWords();

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
function getDefaultCodenamesSettings() {
  return {
    turnTimeLimit: 0, // 0 = без ограничения, иначе секунды
    traitorMode: false // режим предателя
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

function normalizeCodenamesSettings(raw) {
  const defaults = getDefaultCodenamesSettings();
  const parsed = parseSettings(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return { ...defaults, ...parsed };
  }
  return defaults;
}

function serializeSettings(raw) {
  return JSON.stringify(normalizeCodenamesSettings(raw));
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function generateRoomCode() {
  return makeRoomCode();
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
// HYPHENATION - перенос слов по слогам
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Добавляет мягкие переносы (soft hyphens) в слово для корректного переноса по слогам
 * Использует библиотеку hyphen с русскими правилами
 * @param {string} word - слово для обработки
 * @returns {string} слово с soft hyphens (\u00AD) в точках переноса
 */
function hyphenateWord(word) {
  try {
    // hyphenateSync возвращает слово с символами переноса (по умолчанию \u00AD - soft hyphen)
    return hyphenateSync(word);
  } catch (err) {
    console.error("[Codenames] Hyphenation error for word:", word, err);
    return word;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME BOARD GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Генерирует игровое поле 5x5 с 25 карточками
 * @param {string} startingTeam - команда, которая ходит первой ("red" или "blue")
 * @returns {Array} массив из 25 карточек
 */
function generateBoard(startingTeam = TEAMS.RED) {
  if (wordsList.length < 25) {
    throw new Error("Not enough words loaded");
  }

  // Перемешиваем слова и берём 25
  const shuffledWords = [...wordsList].sort(() => Math.random() - 0.5);
  const selectedWords = shuffledWords.slice(0, 25);

  // Распределяем типы карточек:
  // - Команда, которая ходит первой: 9 карточек
  // - Другая команда: 8 карточек
  // - Нейтральные: 7 карточек
  // - Убийца: 1 карточка
  const cardTypes = [];
  
  const firstTeamCount = 9;
  const secondTeamCount = 8;
  const neutralCount = 7;
  const assassinCount = 1;

  for (let i = 0; i < firstTeamCount; i++) {
    cardTypes.push(startingTeam);
  }
  for (let i = 0; i < secondTeamCount; i++) {
    cardTypes.push(startingTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED);
  }
  for (let i = 0; i < neutralCount; i++) {
    cardTypes.push(CARD_TYPES.NEUTRAL);
  }
  for (let i = 0; i < assassinCount; i++) {
    cardTypes.push(CARD_TYPES.ASSASSIN);
  }

  // Перемешиваем типы
  const shuffledTypes = cardTypes.sort(() => Math.random() - 0.5);

  // Создаём карточки с переносами по слогам
  const cards = selectedWords.map((word, index) => {
    const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
    const hyphenatedWord = hyphenateWord(capitalizedWord);
    return {
      id: index,
      word: hyphenatedWord,
      type: shuffledTypes[index],
      revealed: false
    };
  });

  return cards;
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY ROOM STATE (для простоты без Prisma)
// ═══════════════════════════════════════════════════════════════════════════
const codenamesRooms = new Map(); // code -> room state

function createRoom(hostName, hostAvatarUrl, visitorId) {
  const code = generateRoomCode();
  const playerId = `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startingTeam = Math.random() < 0.5 ? TEAMS.RED : TEAMS.BLUE;
  
  const room = {
    id: code,
    code,
    hostId: playerId,
    status: "lobby", // lobby | playing | finished
    settings: getDefaultCodenamesSettings(),
    currentTeam: startingTeam,
    startingTeam,
    board: null, // Генерируется при старте игры
    currentHint: null, // { word, count }
    guessesRemaining: 0,
    winner: null,
    redScore: 0,
    blueScore: 0,
    redTotal: 0,
    blueTotal: 0,
    createdAt: new Date(),
    // Timer state - раздельные таймеры для hint и guess
    timerPhase: null, // "hint" | "guess" | null
    timerEndsAt: null,
    timerDuration: null,
    hintTimerEndsAt: null, // Когда заканчивается время на подсказку
    guessTimerEndsAt: null, // Когда заканчивается время на угадывание
    isFirstTurn: true,
    // Turn counter for timer logic
    turnNumber: 0,
    // Voting state for card selection
    cardVotes: {}, // { cardId: [playerId, ...] }
    pendingCard: null, // { cardId, startedAt } - карточка в процессе подтверждения
    // Team names - редактируемые названия команд
    redTeamName: "Красные",
    blueTeamName: "Синие",
    redTeamCaptainId: null, // ID капитана красной команды (только он может менять название)
    blueTeamCaptainId: null, // ID капитана синей команды
    players: [{
      id: playerId,
      name: hostName,
      avatarUrl: hostAvatarUrl,
      visitorId,
      team: null,
      role: null, // "captain" | "operative" | "spectator" | null
      connectionStatus: "online",
      joinedAt: new Date(),
      lastSeen: new Date()
    }],
    log: [], // История ходов
    hintHistory: [] // История подсказок { team, word, count, guessedWords, timestamp }
  };

  codenamesRooms.set(code, room);
  return { room, playerId };
}

function getRoom(code) {
  return codenamesRooms.get(code?.toUpperCase());
}

function deleteRoom(code) {
  codenamesRooms.delete(code);
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

function joinRoom(code, name, avatarUrl, visitorId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  // Проверяем, есть ли игрок с таким visitorId (реконнект)
  // Кикнутые игроки полностью удаляются из массива, поэтому они зайдут как новые
  let player = room.players.find(p => p.visitorId === visitorId && p.connectionStatus !== "left");
  
  if (player) {
    player.connectionStatus = "online";
    player.lastSeen = new Date();
    return { room, playerId: player.id, reconnected: true };
  }

  // Проверка на уникальность имени
  const takenNames = room.players.filter(p => p.connectionStatus !== "left").map(p => p.name.toLowerCase());
  const finalName = makeUniqueName(name, takenNames);

  const playerId = `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  player = {
    id: playerId,
    name: finalName,
    avatarUrl,
    visitorId,
    team: null,
    role: null,
    connectionStatus: "online",
    joinedAt: new Date(),
    lastSeen: new Date()
  };

  room.players.push(player);
  return { room, playerId };
}

function leaveRoom(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  const player = room.players.find(p => p.id === playerId);
  if (player) {
    player.connectionStatus = "left";
    
    // Если это был хост, назначаем нового
    if (room.hostId === playerId) {
      const newHost = room.players.find(p => p.connectionStatus === "online" && p.id !== playerId);
      if (newHost) {
        room.hostId = newHost.id;
      }
    }
  }

  // Удаляем комнату если все ушли
  const activePlayers = room.players.filter(p => p.connectionStatus !== "left");
  if (activePlayers.length === 0) {
    deleteRoom(code);
    return { deleted: true };
  }

  return { room };
}

function joinTeam(code, playerId, team) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  // Разрешаем смену команды в лобби или если комната открыта
  if (room.status !== "lobby" && !room.isRoomOpen) return { error: "Комната закрыта для смены команд" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };

  // Если игрок был капитаном в другой команде, сбрасываем роль
  if (player.team !== team && player.role === ROLES.CAPTAIN) {
    player.role = null;
  }
  
  // Сбрасываем голос за завершение хода при смене команды
  if (player.team !== team && room.endTurnVotes) {
    room.endTurnVotes = room.endTurnVotes.filter(id => id !== playerId);
  }
  
  // Сбрасываем голос за карточку при смене команды
  if (player.team !== team && room.cardVotes) {
    for (const cardId in room.cardVotes) {
      room.cardVotes[cardId] = room.cardVotes[cardId].filter(id => id !== playerId);
    }
  }
  
  player.team = team;
  
  // Автоматически назначаем роль агента, если капитан уже есть
  if (team) {
    const existingCaptain = room.players.find(
      p => p.team === team && p.role === ROLES.CAPTAIN && p.id !== playerId
    );
    if (existingCaptain) {
      player.role = ROLES.OPERATIVE;
    } else if (!player.role || player.role === ROLES.SPECTATOR) {
      // Если капитана нет, оставляем выбор
      player.role = null;
    }
  } else {
    // Уход в наблюдатели
    player.role = ROLES.SPECTATOR;
  }
  
  return { room };
}

function setRole(code, playerId, role) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };

  // Смена на наблюдателя возможна только в лобби или при открытой комнате
  if (role === ROLES.SPECTATOR) {
    if (room.status !== "lobby" && !room.isRoomOpen) return { error: "Комната закрыта для смены ролей" };
    
    // Если был капитаном, убираем его как капитана команды
    if (player.role === ROLES.CAPTAIN) {
      if (player.team === TEAMS.RED) room.redTeamCaptainId = null;
      else if (player.team === TEAMS.BLUE) room.blueTeamCaptainId = null;
    }
    
    player.team = null;
    player.role = ROLES.SPECTATOR;
    return { room };
  }

  // Смена капитан <-> агент возможна только в лобби или при открытой комнате
  if (room.status !== "lobby" && !room.isRoomOpen) return { error: "Комната закрыта для смены ролей" };
  if (!player.team) return { error: "Сначала выберите команду" };

  // Проверяем, что капитан в команде только один
  if (role === ROLES.CAPTAIN) {
    const existingCaptain = room.players.find(
      p => p.team === player.team && p.role === ROLES.CAPTAIN && p.id !== playerId
    );
    if (existingCaptain) {
      // Нельзя стать капитаном, если капитан уже есть
      return { error: "В команде уже есть капитан" };
    }
    
    // Устанавливаем капитана команды
    if (player.team === TEAMS.RED) room.redTeamCaptainId = playerId;
    else if (player.team === TEAMS.BLUE) room.blueTeamCaptainId = playerId;
  } else if (role === ROLES.OPERATIVE && player.role === ROLES.CAPTAIN) {
    // Если капитан становится агентом, убираем его как капитана
    if (player.team === TEAMS.RED) room.redTeamCaptainId = null;
    else if (player.team === TEAMS.BLUE) room.blueTeamCaptainId = null;
  }

  player.role = role;
  return { room };
}

/**
 * Переименовать команду (только капитан команды может это сделать)
 */
function renameTeam(code, playerId, team, newName) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  
  // Проверяем, что игрок - капитан этой команды
  if (team === TEAMS.RED) {
    if (room.redTeamCaptainId !== playerId) {
      return { error: "Только капитан может менять название команды" };
    }
    room.redTeamName = newName.trim().slice(0, 20) || "Красные";
  } else if (team === TEAMS.BLUE) {
    if (room.blueTeamCaptainId !== playerId) {
      return { error: "Только капитан может менять название команды" };
    }
    room.blueTeamName = newName.trim().slice(0, 20) || "Синие";
  } else {
    return { error: "Неверная команда" };
  }
  
  return { room };
}

function startGame(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может начать игру" };
  if (room.status !== "lobby") return { error: "Игра уже началась" };

  // Проверяем, что есть хотя бы по одному игроку в каждой команде
  const redPlayers = room.players.filter(p => p.team === TEAMS.RED && p.connectionStatus !== "left");
  const bluePlayers = room.players.filter(p => p.team === TEAMS.BLUE && p.connectionStatus !== "left");

  if (redPlayers.length === 0 || bluePlayers.length === 0) {
    return { error: "В каждой команде должен быть хотя бы один игрок" };
  }

  // Проверяем наличие капитанов
  const redCaptain = redPlayers.find(p => p.role === ROLES.CAPTAIN);
  const blueCaptain = bluePlayers.find(p => p.role === ROLES.CAPTAIN);

  if (!redCaptain || !blueCaptain) {
    return { error: "В каждой команде должен быть капитан" };
  }

  // Генерируем поле
  room.board = generateBoard(room.startingTeam);
  room.status = "playing";
  room.currentTeam = room.startingTeam;
  room.currentHint = null;
  room.guessesRemaining = 0;
  
  // Подсчитываем количество карточек каждой команды
  room.redTotal = room.board.filter(c => c.type === TEAMS.RED).length;
  room.blueTotal = room.board.filter(c => c.type === TEAMS.BLUE).length;
  room.redScore = 0;
  room.blueScore = 0;
  
  // Timer state - два раздельных таймера
  // Фаза hint: капитан видит свой таймер (2 мин первый ход, 1 мин потом)
  // Фаза guess: команда видит таймер на угадывание (1 мин)
  // Если капитан не успел - переход в overtime, агенты получают остаток времени
  room.isFirstTurn = true;
  room.turnNumber = 1;
  room.timerPhase = "hint";
  
  // Первый ход: 2 мин на подсказку + 1 мин на угадывание (общий дедлайн)
  const hintTime = TIMER_SETTINGS.FIRST_HINT;
  const now = Date.now();
  room.hintTimerEndsAt = now + hintTime * 1000;
  room.guessTimerEndsAt = now + (hintTime + TIMER_SETTINGS.GUESS) * 1000; // Общий дедлайн хода
  room.timerDuration = hintTime;
  room.timerEndsAt = room.hintTimerEndsAt;
  
  room.hintHistory = [];
  room.cardVotes = {};
  room.pendingCard = null;

  room.log.push({
    type: "game_start",
    startingTeam: room.startingTeam,
    timestamp: new Date()
  });

  // Возвращаем общую длительность хода (hint + guess) для таймера на сервере
  return { room, startTimer: true, timerDuration: hintTime + TIMER_SETTINGS.GUESS };
}

function giveHint(code, playerId, word, count) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  if (player.role !== ROLES.CAPTAIN) return { error: "Только капитан может давать подсказки" };
  if (room.currentHint) return { error: "Подсказка уже дана" };

  const numCount = parseInt(count, 10);
  if (isNaN(numCount) || numCount < 0 || numCount > 9) {
    return { error: "Число должно быть от 0 до 9" };
  }

  room.currentHint = { word: word.trim(), count: numCount, guessedWords: [] };
  // Без ограничения на количество угадываний
  room.guessesRemaining = 999;
  
  // Переключаемся на фазу угадывания
  room.timerPhase = "guess";
  
  // Вычисляем оставшееся время для угадывания
  const now = Date.now();
  let guessTime = TIMER_SETTINGS.GUESS;
  
  // Если капитан успел до конца своего таймера, команда получает полную минуту
  // Если не успел (overtime) - команда получает оставшееся время от общего
  if (room.hintTimerEndsAt && now < room.hintTimerEndsAt) {
    // Капитан успел - полная минута на угадывание
    guessTime = TIMER_SETTINGS.GUESS;
  } else if (room.guessTimerEndsAt && now < room.guessTimerEndsAt) {
    // Был в overtime - используем оставшееся время
    guessTime = Math.max(1, Math.ceil((room.guessTimerEndsAt - now) / 1000));
  }
  
  room.guessTimerEndsAt = now + guessTime * 1000;
  room.timerEndsAt = room.guessTimerEndsAt;
  room.timerDuration = guessTime;
  room.hintTimerEndsAt = null; // Таймер подсказки завершён
  
  // Сбрасываем голосование
  room.cardVotes = {};
  room.pendingCard = null;

  room.log.push({
    type: "hint",
    team: room.currentTeam,
    playerId,
    playerName: player.name,
    word: room.currentHint.word,
    count: numCount,
    timestamp: new Date()
  });

  return { room, startTimer: true, timerDuration: guessTime };
}

function editHint(code, playerId, word, count) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  if (player.role !== ROLES.CAPTAIN) return { error: "Только капитан может редактировать подсказку" };
  if (!room.currentHint) return { error: "Сначала должна быть дана подсказка" };

  if (!word || String(word).trim().length === 0) {
    return { error: "Введите слово-подсказку" };
  }

  const numCount = parseInt(count, 10);
  if (isNaN(numCount) || numCount < 0 || numCount > 9) {
    return { error: "Число должно быть от 0 до 9" };
  }

  const prev = { word: room.currentHint.word, count: room.currentHint.count };

  room.currentHint.word = String(word).trim();
  room.currentHint.count = numCount;

  room.log.push({
    type: "hint_edit",
    team: room.currentTeam,
    playerId,
    playerName: player.name,
    prevWord: prev.word,
    prevCount: prev.count,
    word: room.currentHint.word,
    count: numCount,
    timestamp: new Date()
  });

  return { room };
}

// Голосование за карточку
function voteForCard(code, playerId, cardId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  if (player.role === ROLES.CAPTAIN) return { error: "Капитан не может выбирать карточки" };
  if (player.role === ROLES.SPECTATOR) return { error: "Наблюдатели не могут голосовать" };
  if (!room.currentHint) return { error: "Дождитесь подсказки от капитана" };
  if (room.guessesRemaining <= 0) return { error: "Больше нет попыток" };

  const card = room.board.find(c => c.id === cardId);
  if (!card) return { error: "Карточка не найдена" };
  if (card.revealed) return { error: "Карточка уже открыта" };

  // Убираем предыдущий голос игрока (если был за другую карточку)
  for (const cid of Object.keys(room.cardVotes)) {
    room.cardVotes[cid] = room.cardVotes[cid].filter(pid => pid !== playerId);
    if (room.cardVotes[cid].length === 0) {
      delete room.cardVotes[cid];
    }
  }

  // Добавляем голос
  if (!room.cardVotes[cardId]) {
    room.cardVotes[cardId] = [];
  }
  room.cardVotes[cardId].push(playerId);

  // Проверяем, все ли агенты команды проголосовали за одну карточку
  // Агентами считаются все игроки команды, кроме капитана и наблюдателей
  // (включая игроков без явной роли - они тоже могут голосовать)
  const teamOperatives = room.players.filter(
    p => p.team === room.currentTeam && 
        p.role !== ROLES.CAPTAIN && 
        p.role !== ROLES.SPECTATOR &&
        p.connectionStatus === "online"
  );
  
  const votesForCard = room.cardVotes[cardId] || [];
  const allVoted = teamOperatives.length > 0 && 
                   teamOperatives.every(op => votesForCard.includes(op.id));

  return { 
    room, 
    allVoted, 
    cardId,
    votesNeeded: teamOperatives.length,
    currentVotes: votesForCard.length
  };
}

// Отмена голоса
function cancelVote(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  // Убираем голос игрока
  for (const cid of Object.keys(room.cardVotes)) {
    room.cardVotes[cid] = room.cardVotes[cid].filter(pid => pid !== playerId);
    if (room.cardVotes[cid].length === 0) {
      delete room.cardVotes[cid];
    }
  }

  return { room };
}

function revealCard(code, playerId, cardId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  if (player.role === ROLES.CAPTAIN) return { error: "Капитан не может выбирать карточки" };
  if (!room.currentHint) return { error: "Дождитесь подсказки от капитана" };
  if (room.guessesRemaining <= 0) return { error: "Больше нет попыток" };

  const card = room.board.find(c => c.id === cardId);
  if (!card) return { error: "Карточка не найдена" };
  if (card.revealed) return { error: "Карточка уже открыта" };

  card.revealed = true;
  
  // Сбрасываем голосование после открытия карточки
  room.cardVotes = {};
  room.pendingCard = null;
  room.guessesRemaining--;
  
  // Добавляем слово в историю текущей подсказки
  if (room.currentHint) {
    room.currentHint.guessedWords.push({
      word: card.word,
      type: card.type,
      correct: card.type === room.currentTeam
    });
  }

  room.log.push({
    type: "reveal",
    team: room.currentTeam,
    playerId,
    playerName: player.name,
    cardId,
    word: card.word,
    cardType: card.type,
    timestamp: new Date()
  });

  // Проверяем результат
  let endTurn = false;
  let gameOver = false;
  let timerDuration = null;

  if (card.type === CARD_TYPES.ASSASSIN) {
    // Проигрыш - открыли убийцу
    room.winner = room.currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
    room.status = "finished";
    gameOver = true;
    room.timerPhase = null;
    room.timerEndsAt = null;
    room.log.push({
      type: "game_end",
      winner: room.winner,
      reason: "assassin",
      timestamp: new Date()
    });
  } else if (card.type === room.currentTeam) {
    // Угадали свою карточку - продолжаем играть
    if (room.currentTeam === TEAMS.RED) {
      room.redScore++;
    } else {
      room.blueScore++;
    }

    // Проверяем победу
    if (room.redScore >= room.redTotal) {
      room.winner = TEAMS.RED;
      room.status = "finished";
      gameOver = true;
      room.timerPhase = null;
      room.timerEndsAt = null;
      room.log.push({
        type: "game_end",
        winner: TEAMS.RED,
        reason: "all_found",
        timestamp: new Date()
      });
    } else if (room.blueScore >= room.blueTotal) {
      room.winner = TEAMS.BLUE;
      room.status = "finished";
      gameOver = true;
      room.timerPhase = null;
      room.timerEndsAt = null;
      room.log.push({
        type: "game_end",
        winner: TEAMS.BLUE,
        reason: "all_found",
        timestamp: new Date()
      });
    } else {
      // Добавляем бонусное время +10 секунд за правильное угадывание
      if (room.guessTimerEndsAt) {
        room.guessTimerEndsAt += TIMER_SETTINGS.BONUS * 1000;
        room.timerEndsAt = room.guessTimerEndsAt;
      }
    }
    // Убрали ограничение - играют пока не ошибутся, не закончится время или не завершат ход вручную
  } else if (card.type === CARD_TYPES.NEUTRAL) {
    // Нейтральная карточка - конец хода
    endTurn = true;
  } else {
    // Карточка противника
    if (card.type === TEAMS.RED) {
      room.redScore++;
    } else {
      room.blueScore++;
    }

    // Проверяем победу противника
    if (room.redScore >= room.redTotal) {
      room.winner = TEAMS.RED;
      room.status = "finished";
      gameOver = true;
      room.timerPhase = null;
      room.timerEndsAt = null;
      room.log.push({
        type: "game_end",
        winner: TEAMS.RED,
        reason: "all_found",
        timestamp: new Date()
      });
    } else if (room.blueScore >= room.blueTotal) {
      room.winner = TEAMS.BLUE;
      room.status = "finished";
      gameOver = true;
      room.timerPhase = null;
      room.timerEndsAt = null;
      room.log.push({
        type: "game_end",
        winner: TEAMS.BLUE,
        reason: "all_found",
        timestamp: new Date()
      });
    } else {
      endTurn = true;
    }
  }

  if (endTurn && !gameOver) {
    // Сохраняем подсказку в историю
    if (room.currentHint) {
      room.hintHistory.push({
        team: room.currentTeam,
        word: room.currentHint.word,
        count: room.currentHint.count,
        guessedWords: room.currentHint.guessedWords || [],
        timestamp: new Date()
      });
    }
    
    room.currentTeam = room.currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
    room.currentHint = null;
    room.guessesRemaining = 0;
    room.isFirstTurn = false;
    room.turnNumber++;
    room.cardVotes = {};
    room.pendingCard = null;
    
    // Новый таймер: 1 мин на подсказку
    room.timerPhase = "hint";
    const hintTime = TIMER_SETTINGS.HINT;
    room.hintTimerEndsAt = Date.now() + hintTime * 1000;
    room.guessTimerEndsAt = Date.now() + (hintTime + TIMER_SETTINGS.GUESS) * 1000;
    room.timerEndsAt = room.hintTimerEndsAt;
    room.timerDuration = hintTime;
    timerDuration = hintTime + TIMER_SETTINGS.GUESS;
    
    room.log.push({
      type: "turn_end",
      nextTeam: room.currentTeam,
      timestamp: new Date()
    });
  }

  return { room, cardType: card.type, endTurn, gameOver, startTimer: endTurn && !gameOver, timerDuration };
}

// Голосование за завершение хода
function voteEndTurn(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  // Агентами считаются все игроки команды, кроме капитана и наблюдателей
  if (player.role === ROLES.CAPTAIN) return { error: "Капитан не может голосовать за завершение хода" };
  if (player.role === ROLES.SPECTATOR) return { error: "Наблюдатели не могут голосовать" };
  if (!room.currentHint) return { error: "Сначала должна быть дана подсказка" };

  // Инициализируем массив голосов если нет
  if (!room.endTurnVotes) {
    room.endTurnVotes = [];
  }

  // Проверяем, голосовал ли уже игрок
  const alreadyVoted = room.endTurnVotes.includes(playerId);
  
  if (alreadyVoted) {
    // Отменяем голос
    room.endTurnVotes = room.endTurnVotes.filter(id => id !== playerId);
    return { room, allVoted: false, cancelled: true };
  }

  // Добавляем голос
  room.endTurnVotes.push(playerId);

  // Проверяем, все ли агенты команды проголосовали
  // Агентами считаются все игроки команды, кроме капитана и наблюдателей
  const teamOperatives = room.players.filter(
    p => p.team === room.currentTeam && 
        p.role !== ROLES.CAPTAIN && 
        p.role !== ROLES.SPECTATOR &&
        p.connectionStatus === "online"
  );
  
  const allVoted = teamOperatives.length > 0 && 
                   teamOperatives.every(op => room.endTurnVotes.includes(op.id));

  return { 
    room, 
    allVoted,
    votesNeeded: teamOperatives.length,
    currentVotes: room.endTurnVotes.length
  };
}

// Отмена голоса за завершение хода
function cancelEndTurnVote(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  if (room.endTurnVotes) {
    room.endTurnVotes = room.endTurnVotes.filter(id => id !== playerId);
  }

  return { room };
}

// Выполнить завершение хода (вызывается когда все проголосовали)
function executeEndTurn(code, reason = "manual") {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };
  
  if (!room.currentHint) return { error: "Сначала должна быть дана подсказка" };

  // Сохраняем подсказку в историю
  room.hintHistory.push({
    team: room.currentTeam,
    word: room.currentHint.word,
    count: room.currentHint.count,
    guessedWords: room.currentHint.guessedWords || [],
    timestamp: new Date()
  });

  room.currentTeam = room.currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
  room.currentHint = null;
  room.guessesRemaining = 0;
  room.isFirstTurn = false;
  room.turnNumber++;
  room.cardVotes = {};
  room.pendingCard = null;
  room.endTurnVotes = []; // Сбрасываем голоса
  
  // Новый таймер: 1 мин на подсказку
  room.timerPhase = "hint";
  const hintTime = TIMER_SETTINGS.HINT;
  room.hintTimerEndsAt = Date.now() + hintTime * 1000;
  room.guessTimerEndsAt = Date.now() + (hintTime + TIMER_SETTINGS.GUESS) * 1000;
  room.timerEndsAt = room.hintTimerEndsAt;
  room.timerDuration = hintTime;

  room.log.push({
    type: "turn_end",
    nextTeam: room.currentTeam,
    reason,
    timestamp: new Date()
  });

  return { room, startTimer: true, timerDuration: hintTime + TIMER_SETTINGS.GUESS };
}

function endTurn(code, playerId, reason = "manual") {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  
  // Разрешаем завершение хода только если подсказка уже дана
  if (!room.currentHint) return { error: "Сначала должна быть дана подсказка" };

  // Сохраняем подсказку в историю
  room.hintHistory.push({
    team: room.currentTeam,
    word: room.currentHint.word,
    count: room.currentHint.count,
    guessedWords: room.currentHint.guessedWords || [],
    timestamp: new Date()
  });

  room.currentTeam = room.currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
  room.currentHint = null;
  room.guessesRemaining = 0;
  room.isFirstTurn = false;
  room.turnNumber++;
  room.cardVotes = {};
  room.pendingCard = null;
  room.endTurnVotes = []; // Сбрасываем голоса
  
  // Новый таймер: 1 мин на подсказку
  room.timerPhase = "hint";
  const hintTime = TIMER_SETTINGS.HINT;
  room.hintTimerEndsAt = Date.now() + hintTime * 1000;
  room.guessTimerEndsAt = Date.now() + (hintTime + TIMER_SETTINGS.GUESS) * 1000; // Общий дедлайн хода
  room.timerEndsAt = room.hintTimerEndsAt;
  room.timerDuration = hintTime;

  room.log.push({
    type: "turn_end",
    nextTeam: room.currentTeam,
    reason,
    timestamp: new Date()
  });

  return { room, startTimer: true, timerDuration: hintTime + TIMER_SETTINGS.GUESS };
}

// Функция для принудительного завершения хода (вызывается при истечении таймера guess)
function forceEndTurn(code) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  // Сохраняем подсказку в историю (если была)
  if (room.currentHint) {
    room.hintHistory.push({
      team: room.currentTeam,
      word: room.currentHint.word,
      count: room.currentHint.count,
      guessedWords: room.currentHint.guessedWords || [],
      timestamp: new Date()
    });
  }

  const prevTeam = room.currentTeam;
  room.currentTeam = room.currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
  room.currentHint = null;
  room.guessesRemaining = 0;
  room.isFirstTurn = false;
  room.turnNumber++;
  room.cardVotes = {};
  room.pendingCard = null;
  
  // Новый таймер: 1 мин на подсказку
  room.timerPhase = "hint";
  const hintTime = TIMER_SETTINGS.HINT;
  room.hintTimerEndsAt = Date.now() + hintTime * 1000;
  room.guessTimerEndsAt = Date.now() + (hintTime + TIMER_SETTINGS.GUESS) * 1000;
  room.timerEndsAt = room.hintTimerEndsAt;
  room.timerDuration = hintTime;

  room.log.push({
    type: "turn_end",
    nextTeam: room.currentTeam,
    reason: "timeout",
    prevTeam,
    timestamp: new Date()
  });

  return { room, startTimer: true, timerDuration: hintTime + TIMER_SETTINGS.GUESS };
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING CARD SELECTION (подтверждение выбора карточки)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Начать процесс подтверждения выбора карточки
 * @param {string} code - код комнаты
 * @param {string} playerId - ID игрока
 * @param {number} cardId - ID карточки
 * @returns {object} - результат операции
 */
function startPendingCard(code, playerId, cardId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Игрок не найден" };
  if (player.team !== room.currentTeam) return { error: "Сейчас не ход вашей команды" };
  if (player.role === ROLES.CAPTAIN) return { error: "Капитан не может выбирать карточки" };
  if (!room.currentHint) return { error: "Дождитесь подсказки от капитана" };

  const card = room.board.find(c => c.id === cardId);
  if (!card) return { error: "Карточка не найдена" };
  if (card.revealed) return { error: "Карточка уже открыта" };

  // Если уже есть pending на эту же карточку от этого игрока - отменяем
  if (room.pendingCard && room.pendingCard.cardId === cardId && room.pendingCard.playerId === playerId) {
    return cancelPendingCard(code, playerId);
  }

  // Отменяем предыдущий pending timer если был
  const existingTimer = codenamePendingTimers.get(code);
  if (existingTimer) {
    clearTimeout(existingTimer.timeoutId);
    codenamePendingTimers.delete(code);
  }

  // Устанавливаем новый pending
  const now = Date.now();
  room.pendingCard = {
    cardId,
    playerId,
    playerName: player.name,
    startedAt: now,
    endsAt: now + TIMER_SETTINGS.PENDING_CONFIRM
  };

  return { room, pendingStarted: true, cardId };
}

/**
 * Отменить pending выбор карточки
 * @param {string} code - код комнаты
 * @param {string} playerId - ID игрока (опционально - если указан, отменяет только свой выбор)
 * @returns {object} - результат операции
 */
function cancelPendingCard(code, playerId = null) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };

  // Отменяем таймер
  const existingTimer = codenamePendingTimers.get(code);
  if (existingTimer) {
    clearTimeout(existingTimer.timeoutId);
    codenamePendingTimers.delete(code);
  }

  // Если указан playerId, отменяем только если это его выбор
  if (playerId && room.pendingCard && room.pendingCard.playerId !== playerId) {
    return { error: "Это не ваш выбор" };
  }

  const cancelledCardId = room.pendingCard?.cardId;
  room.pendingCard = null;

  return { room, pendingCancelled: true, cardId: cancelledCardId };
}

/**
 * Подтвердить pending выбор (вызывается по таймеру)
 * @param {string} code - код комнаты
 * @returns {object} - результат операции
 */
function confirmPendingCard(code) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (!room.pendingCard) return { error: "Нет активного выбора" };

  const { cardId, playerId } = room.pendingCard;
  
  // Очищаем pending перед reveal
  room.pendingCard = null;
  codenamePendingTimers.delete(code);

  // Выполняем reveal
  return revealCard(code, playerId, cardId);
}

/**
 * Сохранить таймер pending для комнаты
 */
function setPendingTimer(code, timeoutId, cardId) {
  codenamePendingTimers.set(code, { timeoutId, cardId, startedAt: Date.now() });
}

/**
 * Получить информацию о pending таймере
 */
function getPendingTimer(code) {
  return codenamePendingTimers.get(code);
}

/**
 * Очистить pending таймер
 */
function clearPendingTimer(code) {
  const timer = codenamePendingTimers.get(code);
  if (timer) {
    clearTimeout(timer.timeoutId);
    codenamePendingTimers.delete(code);
  }
}

// Функция для перехода в overtime (таймер hint истёк, но подсказки нет)
function switchToOvertime(code) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.status !== "playing") return { error: "Игра не активна" };
  if (room.timerPhase !== "hint") return { error: "Не в фазе подсказки" };
  if (room.currentHint) return { error: "Подсказка уже дана" };

  // Переключаемся на guess таймер, но подсказки ещё нет = OVERTIME
  room.timerPhase = "overtime";
  room.hintTimerEndsAt = null;
  room.timerEndsAt = room.guessTimerEndsAt;
  room.timerDuration = Math.max(1, Math.ceil((room.guessTimerEndsAt - Date.now()) / 1000));

  return { room };
}

function resetGame(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может перезапустить игру" };

  room.status = "lobby";
  room.board = null;
  room.currentHint = null;
  room.guessesRemaining = 0;
  room.winner = null;
  room.redScore = 0;
  room.blueScore = 0;
  room.redTotal = 0;
  room.blueTotal = 0;
  room.startingTeam = Math.random() < 0.5 ? TEAMS.RED : TEAMS.BLUE;
  room.currentTeam = room.startingTeam;
  room.log = [];

  // Сбрасываем готовность игроков, но сохраняем команды и роли
  room.players.forEach(p => {
    if (p.connectionStatus === "left") return;
    // Оставляем team и role как есть
  });

  return { room };
}

/**
 * Переключение режима открытой комнаты (тогглит возможность смены команд/ролей)
 * Не сбрасывает игру, просто разрешает/запрещает смену команд
 */
function toggleRoomOpen(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может управлять комнатой" };

  // Тогглим флаг открытой комнаты
  room.isRoomOpen = !room.isRoomOpen;

  room.log.push({
    type: room.isRoomOpen ? "room_opened" : "room_closed",
    playerId,
    timestamp: new Date()
  });

  return { room, isRoomOpen: room.isRoomOpen };
}

function shuffleTeams(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может перемешивать команды" };

  // В лобби перемешивание доступно всегда.
  // Во время игры - только если хост вручную открыл комнату, и только до выдачи подсказки
  // (чтобы не ломать текущую подсказку/голосования).
  if (room.status === "playing") {
    if (!room.isRoomOpen) return { error: "Откройте комнату, чтобы перемешивать команды во время игры" };
    if (room.timerPhase !== "hint" || room.currentHint) {
      return { error: "Перемешивание доступно только до выдачи подсказки" };
    }
  } else if (room.status !== "lobby") {
    return { error: "Перемешивание доступно только в лобби или при открытой комнате во время игры" };
  }

  const activePlayers = room.players.filter(
    p => p.connectionStatus !== "left" && p.connectionStatus !== "kicked"
  );

  // Shuffle (Fisher-Yates)
  const shuffled = [...activePlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const n = shuffled.length;
  if (n === 0) return { room };

  let redCount = Math.ceil(n / 2);
  let blueCount = n - redCount;
  // При нечётном количестве случайно выбираем, кто получает "лишнего"
  if (n % 2 === 1 && Math.random() < 0.5) {
    [redCount, blueCount] = [blueCount, redCount];
  }

  const redPlayers = shuffled.slice(0, redCount);
  const bluePlayers = shuffled.slice(redCount);

  // Сбрасываем капитанов
  room.redTeamCaptainId = null;
  room.blueTeamCaptainId = null;

  // Назначаем роли/команды
  redPlayers.forEach((p, idx) => {
    p.team = TEAMS.RED;
    p.role = idx === 0 ? ROLES.CAPTAIN : ROLES.OPERATIVE;
    if (idx === 0) room.redTeamCaptainId = p.id;
  });

  bluePlayers.forEach((p, idx) => {
    p.team = TEAMS.BLUE;
    p.role = idx === 0 ? ROLES.CAPTAIN : ROLES.OPERATIVE;
    if (idx === 0) room.blueTeamCaptainId = p.id;
  });

  // Голоса/выборы из лобби не актуальны, но на всякий случай чистим
  room.endTurnVotes = [];
  room.cardVotes = {};
  room.pendingCard = null;

  room.log.push({
    type: "teams_shuffled",
    byHostId: playerId,
    redCount: redPlayers.length,
    blueCount: bluePlayers.length,
    timestamp: new Date()
  });

  return { room };
}

/**
 * Пропуск хода - хост передаёт ход другой команде
 */
function skipTurn(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может пропустить ход" };
  if (room.status !== "playing") return { error: "Игра не активна" };

  // Сохраняем подсказку в историю если была
  if (room.currentHint) {
    room.hintHistory.push({
      team: room.currentTeam,
      word: room.currentHint.word,
      count: room.currentHint.count,
      guessedWords: room.currentHint.guessedWords || [],
      timestamp: new Date()
    });
  }

  const prevTeam = room.currentTeam;
  room.currentTeam = room.currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
  room.currentHint = null;
  room.guessesRemaining = 0;
  room.turnNumber++;
  room.cardVotes = {};
  room.pendingCard = null;
  
  // Новый таймер
  room.timerPhase = "hint";
  const hintTime = TIMER_SETTINGS.HINT;
  room.hintTimerEndsAt = Date.now() + hintTime * 1000;
  room.guessTimerEndsAt = Date.now() + (hintTime + TIMER_SETTINGS.GUESS) * 1000;
  room.timerEndsAt = room.hintTimerEndsAt;
  room.timerDuration = hintTime;

  room.log.push({
    type: "turn_skipped",
    prevTeam,
    nextTeam: room.currentTeam,
    byHost: true,
    timestamp: new Date()
  });

  return { room, startTimer: true, timerDuration: hintTime + TIMER_SETTINGS.GUESS };
}

/**
 * Удаление игрока из комнаты хостом
 */
function kickPlayer(code, hostId, targetPlayerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== hostId) return { error: "Только хост может удалять игроков" };
  if (hostId === targetPlayerId) return { error: "Нельзя удалить самого себя" };

  const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
  if (playerIndex === -1) return { error: "Игрок не найден" };
  
  const player = room.players[playerIndex];
  if (player.connectionStatus === "left") return { error: "Игрок уже покинул комнату" };

  const kickedPlayerName = player.name;
  const kickedVisitorId = player.visitorId;

  // Если удаляем капитана, очищаем его как капитана команды
  if (player.role === ROLES.CAPTAIN) {
    if (player.team === TEAMS.RED) room.redTeamCaptainId = null;
    else if (player.team === TEAMS.BLUE) room.blueTeamCaptainId = null;
  }

  // Полностью удаляем игрока из массива
  room.players.splice(playerIndex, 1);

  room.log.push({
    type: "player_kicked",
    playerId: targetPlayerId,
    playerName: kickedPlayerName,
    byHostId: hostId,
    timestamp: new Date()
  });

  return { room, kickedPlayerId: targetPlayerId, kickedPlayerName, kickedVisitorId };
}

function updateSettings(code, playerId, settings) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может менять настройки" };
  if (room.status !== "lobby") return { error: "Нельзя менять настройки во время игры" };

  room.settings = { ...room.settings, ...settings };
  return { room };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD STATE FOR CLIENT
// ═══════════════════════════════════════════════════════════════════════════
function buildRoomState(room, forPlayerId = null) {
  if (!room) return null;

  const player = room.players.find(p => p.id === forPlayerId);
  const isCaptain = player?.role === ROLES.CAPTAIN;
  const isFinished = room.status === "finished";

  // Для капитанов показываем все типы карточек, для остальных - только открытые
  // После окончания игры показываем все карточки всем игрокам
  const board = room.board?.map(card => ({
    id: card.id,
    word: card.word,
    revealed: card.revealed,
    type: (card.revealed || isCaptain || isFinished) ? card.type : null
  })) || null;

  // Передаём абсолютное время окончания таймера для синхронизации между устройствами
  const timerEndsAt = room.timerEndsAt && room.status === "playing" ? room.timerEndsAt : null;
  const hintTimerEndsAt = room.hintTimerEndsAt && room.status === "playing" ? room.hintTimerEndsAt : null;
  const guessTimerEndsAt = room.guessTimerEndsAt && room.status === "playing" ? room.guessTimerEndsAt : null;
  
  // Определяем overtime: фаза hint истекла, но подсказки нет, или явно фаза overtime
  const isOvertime = room.timerPhase === "overtime" || 
    (room.timerPhase === "hint" && hintTimerEndsAt && Date.now() > hintTimerEndsAt && !room.currentHint);

  // Подготавливаем информацию о голосах с данными игроков
  const cardVotes = {};
  if (room.cardVotes) {
    for (const [cardId, voterIds] of Object.entries(room.cardVotes)) {
      cardVotes[cardId] = voterIds.map(vid => {
        const voter = room.players.find(p => p.id === vid);
        return voter ? { id: voter.id, name: voter.name, avatarUrl: voter.avatarUrl } : null;
      }).filter(Boolean);
    }
  }
  
  // Подготавливаем информацию о голосах за завершение хода
  // Фильтруем только голоса от игроков текущей команды
  const endTurnVotes = (room.endTurnVotes || []).map(vid => {
    const voter = room.players.find(p => p.id === vid);
    // Проверяем, что голосующий из текущей команды
    if (voter && voter.team === room.currentTeam) {
      return { id: voter.id, name: voter.name, avatarUrl: voter.avatarUrl };
    }
    return null;
  }).filter(Boolean);

  // Считаем количество агентов в текущей команде
  // Агентами считаются все игроки команды, кроме капитана и наблюдателей
  const teamOperativesCount = room.players.filter(
    p => p.team === room.currentTeam && 
        p.role !== ROLES.CAPTAIN && 
        p.role !== ROLES.SPECTATOR &&
        p.connectionStatus === "online"
  ).length;

  // Информация о pending card selection
  const pendingCard = room.pendingCard ? {
    cardId: room.pendingCard.cardId,
    playerId: room.pendingCard.playerId,
    playerName: room.pendingCard.playerName,
    startedAt: room.pendingCard.startedAt,
    endsAt: room.pendingCard.endsAt
  } : null;

  return {
    // Серверное время, чтобы клиент мог компенсировать разницу часов между устройствами
    serverNow: Date.now(),
    room: {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      settings: room.settings,
      currentTeam: room.currentTeam,
      startingTeam: room.startingTeam,
      currentHint: room.currentHint ? {
        word: room.currentHint.word,
        count: room.currentHint.count
      } : null,
      winner: room.winner,
      redScore: room.redScore,
      blueScore: room.blueScore,
      redTotal: room.redTotal,
      blueTotal: room.blueTotal,
      timerPhase: room.timerPhase,
      timerDuration: room.timerDuration,
      timerEndsAt, // Текущий активный таймер
      hintTimerEndsAt, // Дедлайн подсказки (для отображения отдельного таймера)
      guessTimerEndsAt, // Дедлайн угадывания
      isOvertime, // Капитан в overtime
      isFirstTurn: room.isFirstTurn,
      turnNumber: room.turnNumber,
      teamOperativesCount,
      pendingCard,
      // Team names
      redTeamName: room.redTeamName || "Красные",
      blueTeamName: room.blueTeamName || "Синие",
      redTeamCaptainId: room.redTeamCaptainId,
      blueTeamCaptainId: room.blueTeamCaptainId,
      isRoomOpen: room.isRoomOpen || false
    },
    board,
    cardVotes,
    endTurnVotes,
    players: room.players
      .filter(p => p.connectionStatus !== "left")
      .map(p => ({
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl,
        team: p.team,
        role: p.role,
        connectionStatus: p.connectionStatus
      })),
    hintHistory: room.hintHistory || [],
    log: room.log.slice(-20) // Последние 20 записей
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function stopTimer(roomId) {
  const entry = codenamesTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    codenamesTimers.delete(roomId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAUSE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function pauseGame(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может ставить игру на паузу" };
  if (room.status !== "playing") return { error: "Игра не активна" };
  
  // Проверяем, не на паузе ли уже
  if (codenamesPausedRooms.has(code)) {
    return { error: "Игра уже на паузе" };
  }
  
  const now = Date.now();
  const pauseState = {
    isPaused: true,
    pausedAt: now,
    remainingHintTime: room.hintTimerEndsAt ? Math.max(0, room.hintTimerEndsAt - now) : null,
    remainingGuessTime: room.guessTimerEndsAt ? Math.max(0, room.guessTimerEndsAt - now) : null,
    timerPhase: room.timerPhase
  };
  
  codenamesPausedRooms.set(code, pauseState);
  
  // Обнуляем таймеры в комнате (они будут восстановлены при resume)
  room.hintTimerEndsAt = null;
  room.guessTimerEndsAt = null;
  room.timerEndsAt = null;
  
  return { room, pauseState };
}

function resumeGame(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.hostId !== playerId) return { error: "Только хост может снимать игру с паузы" };
  if (room.status !== "playing") return { error: "Игра не активна" };
  
  const pauseState = codenamesPausedRooms.get(code);
  if (!pauseState || !pauseState.isPaused) {
    return { error: "Игра не на паузе" };
  }
  
  const now = Date.now();
  
  // Восстанавливаем таймеры
  if (pauseState.remainingHintTime !== null) {
    room.hintTimerEndsAt = now + pauseState.remainingHintTime;
  }
  if (pauseState.remainingGuessTime !== null) {
    room.guessTimerEndsAt = now + pauseState.remainingGuessTime;
  }
  
  // Устанавливаем активный таймер в зависимости от фазы
  if (pauseState.timerPhase === "hint" && room.hintTimerEndsAt) {
    room.timerEndsAt = room.hintTimerEndsAt;
  } else if (room.guessTimerEndsAt) {
    room.timerEndsAt = room.guessTimerEndsAt;
  }
  
  room.timerPhase = pauseState.timerPhase;
  
  codenamesPausedRooms.delete(code);
  
  return { room };
}

function isGamePaused(code) {
  return codenamesPausedRooms.get(code)?.isPaused || false;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
  CARD_TYPES,
  TEAMS,
  ROLES,
  TIMER_SETTINGS,
  getDefaultCodenamesSettings,
  normalizeCodenamesSettings,
  serializeSettings,
  generateRoomCode,
  normalizeName,
  makeUniqueName,
  loadWords,
  generateBoard,
  createRoom,
  getRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  joinTeam,
  setRole,
  renameTeam,
  startGame,
  giveHint,
  editHint,
  voteForCard,
  cancelVote,
  revealCard,
  endTurn,
  voteEndTurn,
  cancelEndTurnVote,
  executeEndTurn,
  forceEndTurn,
  switchToOvertime,
  resetGame,
  toggleRoomOpen,
  shuffleTeams,
  skipTurn,
  kickPlayer,
  updateSettings,
  buildRoomState,
  stopTimer,
  // Pending card selection
  startPendingCard,
  cancelPendingCard,
  confirmPendingCard,
  setPendingTimer,
  getPendingTimer,
  clearPendingTimer,
  // Pause functions
  pauseGame,
  resumeGame,
  isGamePaused,
  codenamePendingTimers,
  codenamesPlayerSockets,
  codenamesTimers,
  codenamesRooms,
  codenamesPausedRooms
};
