/**
 * Activity Module — отслеживание активности пользователей (Discord-стиль)
 * 
 * Функционал:
 * - Отслеживание сессий (вход/выход из игр)
 * - Расчёт стриков активности (дни подряд)
 * - Текущая активность (в какой игре находится)
 * - История активности за 30 дней
 * - Возможность присоединиться к игре друга
 * 
 * Socket события:
 * - profile:activity:get — получить активность пользователя
 * - profile:activity:current — получить текущую активность (в какой игре)
 * - profile:activity:hide — скрыть запись из истории
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Импортируем in-memory хранилища из игровых модулей
let codenamesRooms = null;
let emotionalRooms = null;

// Ленивая инициализация (чтобы избежать циклических зависимостей)
function getCodenamesRooms() {
  if (!codenamesRooms) {
    try {
      codenamesRooms = require("../game/codenames").codenamesRooms;
    } catch (e) {
      console.error("[Activity] Failed to load codenamesRooms:", e);
    }
  }
  return codenamesRooms;
}

function getEmotionalRooms() {
  if (!emotionalRooms) {
    try {
      emotionalRooms = require("../game/emotional").emotionalRooms;
    } catch (e) {
      console.error("[Activity] Failed to load emotionalRooms:", e);
    }
  }
  return emotionalRooms;
}

// ============================================
// Константы
// ============================================

const ACTIVITY_DAYS_LIMIT = 30; // История за 30 дней
const MAX_ACTIVITIES_PER_PAGE = 20;

// Игры PartyChaos
const GAMES_MAP = {
  "tod": { 
    name: "Правда или действие", 
    icon: "🎯", 
    color: "#e74c3c", 
    path: "/truth-or-dare",
    coverUrl: "/covers/TruthOrDare.jpg"
  },
  "alias": { 
    name: "Alias", 
    icon: "🎭", 
    color: "#9b59b6", 
    path: "/alias",
    coverUrl: "/covers/Alias.jpg"
  },
  "codenames": { 
    name: "Codenames", 
    icon: "🕵️", 
    color: "#3498db", 
    path: "/codenames",
    coverUrl: "/covers/Codenames.jpg"
  },
  "emotional": { 
    name: "Emotional", 
    icon: "🧠", 
    color: "#e91e63", 
    path: "/emotional",
    coverUrl: "/covers/Emotional.jpg"
  },
};

// In-memory хранилище активных сессий для быстрого доступа
// Map<visitorId, { sessionId, gameType, roomCode, startedAt, players }>
const activeSessions = new Map();

// ============================================
// Хелперы
// ============================================

/**
 * Резолвит userId (может быть передан id или visitorId)
 */
async function resolveUserId(targetId) {
  if (!targetId) return null;
  
  // Сначала пробуем найти по id
  let user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true }
  });
  
  if (user) return user.id;
  
  // Пробуем найти по visitorId
  user = await prisma.user.findFirst({
    where: { visitorId: targetId },
    select: { id: true }
  });
  
  return user?.id || null;
}

/**
 * Получить информацию об игре по типу
 */
function getGameInfo(gameType) {
  return GAMES_MAP[gameType] || {
    name: gameType,
    icon: "🎮",
    color: "#7c3aed",
    path: "/games"
  };
}

/**
 * Форматировать длительность в читаемый вид
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 60) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }
  return `${minutes} мин`;
}

/**
 * Проверить и обновить стрик активности
 */
async function updateActivityStreak(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        lastActivityDate: true, 
        activityStreakDays: true,
        maxActivityStreak: true 
      }
    });
    
    if (!user) return;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActivity = user.lastActivityDate 
      ? new Date(user.lastActivityDate) 
      : null;
    
    let newStreak = user.activityStreakDays || 0;
    let maxStreak = user.maxActivityStreak || 0;
    
    if (lastActivity) {
      const lastActivityDay = new Date(
        lastActivity.getFullYear(), 
        lastActivity.getMonth(), 
        lastActivity.getDate()
      );
      const diffDays = Math.floor((today - lastActivityDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Уже была активность сегодня — не меняем стрик
        return { streak: newStreak, maxStreak };
      } else if (diffDays === 1) {
        // Следующий день — увеличиваем стрик
        newStreak += 1;
      } else {
        // Пропущен день — сбрасываем стрик на 1
        newStreak = 1;
      }
    } else {
      // Первая активность
      newStreak = 1;
    }
    
    // Обновляем максимальный стрик
    if (newStreak > maxStreak) {
      maxStreak = newStreak;
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { 
        activityStreakDays: newStreak,
        maxActivityStreak: maxStreak,
        lastActivityDate: now
      }
    });
    
    console.log(`[Activity] User ${userId} streak updated: ${newStreak} days (max: ${maxStreak})`);
    return { streak: newStreak, maxStreak };
  } catch (error) {
    console.error("[Activity] Error updating streak:", error);
    return null;
  }
}

// ============================================
// Управление сессиями
// ============================================

/**
 * Начать сессию пользователя (вход в игру)
 * @param {string} userId - ID пользователя
 * @param {string} gameType - Тип игры (tod, alias, etc.)
 * @param {string} roomCode - Код комнаты
 * @param {Array} players - Список игроков в комнате (опционально)
 * @param {string} deviceInfo - Информация об устройстве
 */
async function startSession(userId, gameType, roomCode, players = [], deviceInfo = null) {
  if (!userId) return null;
  
  try {
    // Завершаем предыдущую сессию если есть
    await endSession(userId);
    
    // Создаём новую сессию в БД
    const session = await prisma.userSession.create({
      data: {
        userId,
        gameType,
        roomCode,
        deviceInfo,
        startedAt: new Date()
      }
    });
    
    // Обновляем текущую сессию пользователя и онлайн-статус
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentSessionId: session.id,
        currentGameType: gameType,
        currentRoomCode: roomCode,
        onlineStatus: "in_game",
        lastSeenAt: new Date()
      }
    });
    
    // Сохраняем в in-memory для быстрого доступа
    activeSessions.set(userId, {
      sessionId: session.id,
      gameType,
      roomCode,
      startedAt: session.startedAt,
      players: players.slice(0, 10) // Ограничиваем до 10 игроков
    });
    
    // Обновляем стрик
    await updateActivityStreak(userId);
    
    console.log(`[Activity] Session started for user ${userId}: ${gameType} (${roomCode})`);
    return session;
  } catch (error) {
    console.error("[Activity] Error starting session:", error);
    return null;
  }
}

/**
 * Обновить список игроков в текущей сессии
 */
function updateSessionPlayers(userId, players) {
  const session = activeSessions.get(userId);
  if (session) {
    session.players = players.slice(0, 10);
  }
}

/**
 * Завершить сессию пользователя (выход из игры)
 * @param {string} userId - ID пользователя
 * @param {boolean} recordActivity - Записывать ли в историю активности
 */
async function endSession(userId, recordActivity = true) {
  if (!userId) return null;
  
  try {
    // Получаем текущую сессию из in-memory
    const activeSession = activeSessions.get(userId);
    
    // Получаем данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentSessionId: true }
    });
    
    if (!user?.currentSessionId) {
      activeSessions.delete(userId);
      return null;
    }
    
    // Получаем сессию из БД
    const session = await prisma.userSession.findUnique({
      where: { id: user.currentSessionId }
    });
    
    if (!session || session.endedAt) {
      activeSessions.delete(userId);
      return null;
    }
    
    const now = new Date();
    const duration = Math.floor((now - session.startedAt) / 1000);
    
    // Обновляем сессию
    const updatedSession = await prisma.userSession.update({
      where: { id: session.id },
      data: {
        endedAt: now,
        duration
      }
    });
    
    // Обновляем пользователя
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentSessionId: null,
        currentGameType: null,
        currentRoomCode: null,
        onlineStatus: "online",
        lastSeenAt: now,
        totalPlayTime: { increment: duration }
      }
    });
    
    // Записываем в историю активности если сессия длилась > 60 секунд
    if (recordActivity && duration >= 60 && session.gameType) {
      const gameInfo = getGameInfo(session.gameType);
      await prisma.userActivity.create({
        data: {
          userId,
          activityType: "played",
          gameType: session.gameType,
          gameName: gameInfo.name,
          roomCode: session.roomCode,
          duration: Math.floor(duration / 60), // в минутах
          details: JSON.stringify({
            icon: gameInfo.icon,
            color: gameInfo.color,
            playersCount: activeSession?.players?.length || 0
          })
        }
      });
      
      // Синхронизируем время с UserGameStats (для "Любимых игр" и профиля)
      try {
        const existingStats = await prisma.userGameStats.findUnique({
          where: { userId_gameType: { userId, gameType: session.gameType } }
        });
        
        if (existingStats) {
          await prisma.userGameStats.update({
            where: { id: existingStats.id },
            data: { 
              timePlayed: { increment: duration },
              lastPlayedAt: new Date()
            }
          });
        } else {
          await prisma.userGameStats.create({
            data: {
              userId,
              gameType: session.gameType,
              gamesPlayed: 0,
              gamesWon: 0,
              timePlayed: duration,
              lastPlayedAt: new Date()
            }
          });
        }
      } catch (statsError) {
        console.error("[Activity] Error syncing UserGameStats:", statsError);
      }
    }
    
    // Удаляем из in-memory
    activeSessions.delete(userId);
    
    console.log(`[Activity] Session ended for user ${userId}: ${duration}s`);
    return updatedSession;
  } catch (error) {
    console.error("[Activity] Error ending session:", error);
    activeSessions.delete(userId);
    return null;
  }
}

/**
 * Получить текущую активность пользователя
 * @param {string} targetUserId - ID пользователя
 * @returns Данные текущей активности или null
 */
async function getCurrentActivity(targetUserId) {
  if (!targetUserId) return null;
  
  try {
    // Резолвим userId (может быть передан visitorId)
    let resolvedUserId = targetUserId;
    let user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        currentGameType: true,
        currentRoomCode: true,
        currentSessionId: true,
        onlineStatus: true
      }
    });
    
    // Если не нашли по id, пробуем по visitorId
    if (!user) {
      user = await prisma.user.findFirst({
        where: { visitorId: targetUserId },
        select: {
          id: true,
          currentGameType: true,
          currentRoomCode: true,
          currentSessionId: true,
          onlineStatus: true
        }
      });
      if (user) {
        resolvedUserId = user.id;
      }
    }
    
    // Проверяем in-memory по resolvedUserId
    const activeSession = activeSessions.get(resolvedUserId);
    
    // Показываем активность если есть currentGameType (независимо от onlineStatus)
    if (!user?.currentGameType) {
      return null;
    }
    
    const gameInfo = getGameInfo(user.currentGameType);
    
    // Получаем время начала сессии
    let startedAt = activeSession?.startedAt;
    if (!startedAt && user.currentSessionId) {
      const session = await prisma.userSession.findUnique({
        where: { id: user.currentSessionId },
        select: { startedAt: true }
      });
      startedAt = session?.startedAt;
    }
    
    // Получаем список игроков из комнаты
    let players = activeSession?.players || [];
    
    // Если нет в кеше, пробуем получить из БД в зависимости от типа игры
    if (players.length === 0 && user.currentRoomCode) {
      players = await getPlayersInRoom(user.currentGameType, user.currentRoomCode);
    }
    
    return {
      type: "game",
      gameType: user.currentGameType,
      title: gameInfo.name,
      subtitle: user.currentRoomCode ? `Комната: ${user.currentRoomCode}` : null,
      icon: gameInfo.icon,
      color: gameInfo.color,
      path: gameInfo.path,
      isLive: true,
      roomCode: user.currentRoomCode,
      startedAt: startedAt?.toISOString(),
      elapsedMinutes: startedAt 
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
        : null,
      players: players.slice(0, 5).map(p => ({
        id: p.id,
        visitorId: p.visitorId,
        nickname: p.name || p.nickname,
        avatar: p.avatarUrl || p.avatar
      })),
      canJoin: !!user.currentRoomCode // Можно присоединиться если есть код комнаты
    };
  } catch (error) {
    console.error("[Activity] Error getting current activity:", error);
    return null;
  }
}

/**
 * Получить игроков в комнате по типу игры и коду
 */
async function getPlayersInRoom(gameType, roomCode) {
  try {
    switch (gameType) {
      case "tod": {
        const room = await prisma.room.findUnique({
          where: { code: roomCode },
          include: {
            players: {
              where: { connectionStatus: "online" },
              select: { id: true, name: true, avatarUrl: true, visitorId: true }
            }
          }
        });
        return room?.players || [];
      }
      case "alias": {
        const room = await prisma.aliasRoom.findUnique({
          where: { code: roomCode },
          include: {
            players: {
              where: { connectionStatus: "online" },
              select: { id: true, name: true, avatarUrl: true, visitorId: true }
            }
          }
        });
        return room?.players || [];
      }
      case "codenames": {
        const rooms = getCodenamesRooms();
        if (!rooms) return [];
        const room = rooms.get(roomCode?.toUpperCase());
        if (!room?.players) return [];
        // Codenames хранит игроков как массив объектов
        return room.players.map(p => ({
          id: p.odId || p.visitorId,
          visitorId: p.visitorId,
          name: p.name || p.nickname,
          avatarUrl: p.avatarUrl || p.avatar
        }));
      }
      case "emotional": {
        const rooms = getEmotionalRooms();
        if (!rooms) return [];
        const room = rooms.get(roomCode?.toUpperCase());
        if (!room?.players) return [];
        // Emotional хранит игроков как массив объектов
        return room.players.map(p => ({
          id: p.odId || p.visitorId,
          visitorId: p.visitorId,
          name: p.name || p.nickname,
          avatarUrl: p.avatarUrl || p.avatar
        }));
      }
      default:
        return [];
    }
  } catch (error) {
    console.error("[Activity] Error getting players in room:", error);
    return [];
  }
}

/**
 * Получить историю активности пользователя
 * @param {string} targetUserId - ID пользователя
 * @param {number} limit - Максимальное количество записей
 * @param {number} offset - Смещение для пагинации
 */
async function getActivityHistory(targetUserId, limit = 20, offset = 0, uniqueByGame = true) {
  if (!targetUserId) return { activities: [], hasMore: false };
  
  // Резолвим userId
  const resolvedUserId = await resolveUserId(targetUserId);
  if (!resolvedUserId) return { activities: [], hasMore: false };
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ACTIVITY_DAYS_LIMIT);
  
  try {
    // Получаем все активности за 30 дней
    const allActivities = await prisma.userActivity.findMany({
      where: {
        userId: resolvedUserId,
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: "desc" }
    });
    
    let activities = allActivities;
    
    // Если нужна уникальность по играм — берём только последнюю запись по каждой игре
    if (uniqueByGame) {
      const seenGames = new Set();
      activities = allActivities.filter(activity => {
        if (!activity.gameType || seenGames.has(activity.gameType)) {
          return false;
        }
        seenGames.add(activity.gameType);
        return true;
      });
    }
    
    // Пагинация
    const paginatedActivities = activities.slice(offset, offset + limit + 1);
    const hasMore = paginatedActivities.length > limit;
    const result = paginatedActivities.slice(0, limit);
    
    return {
      activities: result.map(activity => {
        const details = JSON.parse(activity.details || "{}");
        const gameInfo = activity.gameType ? getGameInfo(activity.gameType) : {};
        
        return {
          id: activity.id,
          activityType: activity.activityType,
          gameType: activity.gameType,
          name: activity.gameName || gameInfo.name,
          icon: details.icon || gameInfo.icon || "🎮",
          color: details.color || gameInfo.color || "#7c3aed",
          coverUrl: gameInfo.coverUrl,
          playedAt: activity.createdAt.toISOString(),
          duration: activity.duration,
          durationFormatted: formatDuration(activity.duration ? activity.duration * 60 : null),
          playersCount: details.playersCount,
          roomCode: activity.roomCode,
          scheduledEvent: activity.scheduledEvent
        };
      }),
      hasMore
    };
  } catch (error) {
    console.error("[Activity] Error getting activity history:", error);
    return { activities: [], hasMore: false };
  }
}

/**
 * Получить статистику активности пользователя
 */
async function getActivityStats(targetUserId) {
  if (!targetUserId) return null;
  
  // Резолвим userId
  const resolvedUserId = await resolveUserId(targetUserId);
  if (!resolvedUserId) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: resolvedUserId },
      select: {
        totalPlayTime: true,
        activityStreakDays: true,
        maxActivityStreak: true,
        lastActivityDate: true,
        lastSeenAt: true,
        onlineStatus: true
      }
    });
    
    if (!user) return null;
    
    // Подсчитываем количество сессий за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSessionsCount = await prisma.userSession.count({
      where: {
        userId: resolvedUserId,
        startedAt: { gte: sevenDaysAgo }
      }
    });
    
    // Средняя длительность сессии за 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sessionsAgg = await prisma.userSession.aggregate({
      where: {
        userId: resolvedUserId,
        startedAt: { gte: thirtyDaysAgo },
        duration: { not: null }
      },
      _avg: { duration: true },
      _count: true
    });
    
    return {
      totalPlayTime: user.totalPlayTime,
      totalPlayTimeFormatted: formatDuration(user.totalPlayTime),
      currentStreak: user.activityStreakDays,
      maxStreak: user.maxActivityStreak,
      lastActivityDate: user.lastActivityDate?.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString(),
      onlineStatus: user.onlineStatus,
      sessionsThisWeek: recentSessionsCount,
      avgSessionDuration: sessionsAgg._avg?.duration 
        ? Math.floor(sessionsAgg._avg.duration / 60) 
        : null, // в минутах
      totalSessions30d: sessionsAgg._count
    };
  } catch (error) {
    console.error("[Activity] Error getting activity stats:", error);
    return null;
  }
}

/**
 * Скрыть запись активности
 */
async function hideActivity(userId, activityId) {
  try {
    // Проверяем что активность принадлежит пользователю
    const activity = await prisma.userActivity.findUnique({
      where: { id: activityId }
    });
    
    if (!activity || activity.userId !== userId) {
      return { success: false, error: "Активность не найдена" };
    }
    
    await prisma.userActivity.delete({
      where: { id: activityId }
    });
    
    return { success: true };
  } catch (error) {
    console.error("[Activity] Error hiding activity:", error);
    return { success: false, error: "Ошибка удаления" };
  }
}

/**
 * Получить полные данные активности для профиля
 */
async function getFullActivityData(targetUserId, currentUserId = null) {
  const [currentActivity, historyData, stats] = await Promise.all([
    getCurrentActivity(targetUserId),
    getActivityHistory(targetUserId, 10),
    getActivityStats(targetUserId)
  ]);
  
  return {
    success: true,
    currentActivity,
    recentActivities: historyData.activities,
    hasMoreActivities: historyData.hasMore,
    stats,
    isSelf: currentUserId === targetUserId
  };
}

// ============================================
// Socket.IO обработчики
// ============================================

function registerActivityHandlers(socket, io) {
  const getUserId = () => socket.data?.userId || socket.userId;
  
  // Получить полную активность пользователя
  socket.on("profile:activity:get", async ({ userId, targetUserId, limit, offset }, ack) => {
    const currentUserId = getUserId();
    const targetId = targetUserId || userId;
    
    if (!targetId) {
      if (typeof ack === "function") ack({ success: false, error: "userId required" });
      return;
    }
    
    const result = await getFullActivityData(targetId, currentUserId);
    if (typeof ack === "function") ack(result);
  });
  
  // Получить текущую активность (в какой игре)
  socket.on("profile:activity:current", async ({ userId }, ack) => {
    const activity = await getCurrentActivity(userId);
    if (typeof ack === "function") ack({ success: true, currentActivity: activity });
  });
  
  // Получить историю активности с пагинацией
  socket.on("profile:activity:history", async ({ userId, limit, offset }, ack) => {
    const result = await getActivityHistory(userId, limit, offset);
    if (typeof ack === "function") ack({ success: true, ...result });
  });
  
  // Получить статистику активности
  socket.on("profile:activity:stats", async ({ userId }, ack) => {
    const stats = await getActivityStats(userId);
    if (typeof ack === "function") ack({ success: true, stats });
  });
  
  // Скрыть активность из истории
  socket.on("profile:activity:hide", async ({ activityId }, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") ack({ success: false, error: "Не авторизован" });
      return;
    }
    
    const result = await hideActivity(userId, activityId);
    if (typeof ack === "function") ack(result);
  });
}

// ============================================
// Экспорт
// ============================================

module.exports = {
  // Управление сессиями
  startSession,
  endSession,
  updateSessionPlayers,
  
  // Получение данных
  getCurrentActivity,
  getActivityHistory,
  getActivityStats,
  getFullActivityData,
  hideActivity,
  
  // Стрики
  updateActivityStreak,
  
  // Хелперы
  getGameInfo,
  formatDuration,
  
  // Socket handlers
  registerActivityHandlers,
  
  // In-memory storage (для доступа из других модулей)
  activeSessions,
  
  // Константы
  GAMES_MAP
};
