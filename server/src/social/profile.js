/**
 * Profile API — серверная логика для полного профиля пользователя
 * 
 * Socket события:
 * - profile:get — получить полный профиль
 * - profile:games:update — обновить игры в профиле
 * - profile:widgets:update — обновить виджеты
 * - profile:note:set — установить заметку о пользователе
 * - profile:activity:get — получить историю активности
 * - social:biography:set — установить биографию профиля
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getFriendshipStatus } = require("./friends");

// ============================================
// Константы
// ============================================

const MAX_FAVORITE_GAMES = 8;
const MAX_CURRENT_GAMES = 5;
const MAX_WISHLIST_GAMES = 4;
const MAX_ACTIVITIES = 50;
const ACTIVITY_DAYS_LIMIT = 30;

// ============================================
// Хелперы
// ============================================

/**
 * Форматирует игры профиля для клиента
 */
function formatProfileGames(games) {
  return games.map(game => {
    // Парсим дополнительные данные из JSON если есть
    let extraData = {};
    try {
      extraData = JSON.parse(game.extraData || "{}");
    } catch (e) {}
    
    // Теги для current и featured
    const hasTags = game.listType === "current" || game.listType === "featured";
    
    return {
      id: game.gameId,
      name: game.name,
      coverUrl: game.coverUrl,
      icon: extraData.icon || null,
      color: extraData.color || null,
      sortOrder: game.sortOrder,
      comment: game.comment || null, // Комментарий для featured игры
      gameTags: hasTags ? {
        experience: game.experienceTag,
        rating: (() => {
          try {
            const parsed = JSON.parse(game.ratingTag);
            return Array.isArray(parsed) ? parsed : (game.ratingTag ? [game.ratingTag] : []);
          } catch {
            return game.ratingTag ? [game.ratingTag] : [];
          }
        })(),
        search: JSON.parse(game.searchTags || "[]"),
      } : undefined,
    };
  });
}

/**
 * Форматирует активность для клиента
 */
function formatActivity(activity) {
  return {
    id: activity.id,
    activityType: activity.activityType,
    gameType: activity.gameType,
    name: activity.gameName,
    roomCode: activity.roomCode,
    duration: activity.duration,
    scheduledEvent: activity.scheduledEvent,
    playedAt: activity.createdAt.toISOString(),
    details: JSON.parse(activity.details || "{}"),
  };
}

// ============================================
// API функции
// ============================================

/**
 * Получить полный профиль пользователя
 */
async function getFullProfile(targetUserId, currentUserId) {
  // Сначала резолвим targetUserId — может быть visitorId
  let resolvedUserId = targetUserId;
  
  // Проверяем, существует ли пользователь с таким id
  let userCheck = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  
  if (!userCheck) {
    // Пробуем найти по visitorId
    userCheck = await prisma.user.findFirst({
      where: { visitorId: targetUserId },
      select: { id: true },
    });
    if (userCheck) {
      resolvedUserId = userCheck.id;
    } else {
      return { success: false, error: "Пользователь не найден" };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: resolvedUserId },
    include: {
      customization: true,
      subscription: true,
      profileGames: {
        orderBy: { sortOrder: "asc" },
      },
      profileWidgets: {
        orderBy: { sortOrder: "asc" },
      },
      gameStats: true,
      achievements: {
        include: { achievement: true },
        orderBy: [
          { isFeatured: "desc" },
          { unlockedAt: "desc" },
        ],
      },
    },
  });

  if (!user) {
    return { success: false, error: "Пользователь не найден" };
  }

  // Получаем заметку текущего пользователя о целевом (если есть)
  let userNote = null;
  if (currentUserId && currentUserId !== resolvedUserId) {
    const note = await prisma.userNote.findUnique({
      where: {
        userId_targetUserId: {
          userId: currentUserId,
          targetUserId: resolvedUserId,
        },
      },
    });
    userNote = note?.note || null;
  }

  // Получаем статус дружбы (если есть currentUserId)
  let friendStatus = "none";
  let friendRequestId = null;
  if (currentUserId && currentUserId !== resolvedUserId) {
    const statusResult = await getFriendshipStatus(prisma, currentUserId, resolvedUserId);
    friendStatus = statusResult?.status || "none";
    friendRequestId = statusResult?.requestId || null;
  }

  // Проверяем игнорирование (если есть currentUserId)
  let isIgnored = false;
  if (currentUserId && currentUserId !== resolvedUserId) {
    const ignored = await prisma.ignoredUser.findUnique({
      where: {
        userId_ignoredId: {
          userId: currentUserId,
          ignoredId: resolvedUserId,
        },
      },
    });
    isIgnored = !!ignored;
  }

  // Группируем игры по типам
  const favoriteGames = user.profileGames.filter(g => g.listType === "favorite");
  const currentGames = user.profileGames.filter(g => g.listType === "current");
  const wishlistGames = user.profileGames.filter(g => g.listType === "wishlist");
  const featuredGames = user.profileGames.filter(g => g.listType === "featured");

  // Получаем текущую активность (если пользователь в игре)
  let currentActivity = null;
  if (user.currentGameType && user.currentRoomCode) {
    currentActivity = {
      type: "playing",
      gameType: user.currentGameType,
      roomCode: user.currentRoomCode,
      isLive: user.onlineStatus === "in_game",
    };
  }

  // Получаем недавнюю активность
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ACTIVITY_DAYS_LIMIT);

  const recentActivities = await prisma.userActivity.findMany({
    where: {
      userId: resolvedUserId,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Форматируем ответ
  return {
    success: true,
    profile: {
      id: user.id,
      userId: user.id, // Явно для ActivityTab
      nickname: user.nickname,
      tag: user.tag,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      biography: user.biography,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      onlineStatus: user.onlineStatus,
      lastSeenAt: user.lastSeenAt?.toISOString(),
      memberSince: user.createdAt.toISOString(),
      
      // Уровень и XP
      level: user.level,
      xp: user.xp,
      
      // Подписка
      subscription: user.subscription ? {
        tier: user.subscription.tier,
        status: user.subscription.status,
        startDate: user.subscription.startDate?.toISOString(),
        endDate: user.subscription.endDate?.toISOString(),
      } : null,
      
      // Кастомизация
      customization: user.customization ? {
        frameSlug: user.customization.frameAll,
        nicknameColorType: user.customization.nicknameColorType,
        nicknameCustomColor: user.customization.nicknameCustomColor,
        nicknameGradientId: user.customization.nicknameGradientId,
        nicknameGlowId: user.customization.nicknameGlowId,
        nicknameEffectId: user.customization.nicknameEffectId,
      } : null,
      
      // Игры
      favoriteGames: formatProfileGames(favoriteGames),
      currentGames: formatProfileGames(currentGames),
      wishlistGames: formatProfileGames(wishlistGames),
      favoriteGame: featuredGames.length > 0 ? formatProfileGames(featuredGames)[0] : null,
      
      // Виджеты
      widgets: user.profileWidgets.map(w => ({
        type: w.widgetType,
        isVisible: w.isVisible,
        sortOrder: w.sortOrder,
        settings: JSON.parse(w.settings || "{}"),
      })),
      
      // Активность
      currentActivity,
      recentActivities: recentActivities.map(formatActivity),
      
      // Достижения (формат как в getPublicProfile)
      achievements: {
        total: user.achievements.length,
        featured: user.achievements.filter(ua => ua.isFeatured).map(ua => ({
          id: ua.achievement.id,
          slug: ua.achievement.slug,
          name: ua.achievement.name,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          rarity: ua.achievement.rarity,
          level: ua.level || 1,
          unlockedAt: ua.unlockedAt?.toISOString(),
        })),
        all: user.achievements.map(ua => ({
          id: ua.achievement.id,
          slug: ua.achievement.slug,
          name: ua.achievement.name,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          rarity: ua.achievement.rarity,
          level: ua.level || 1,
          unlockedAt: ua.unlockedAt?.toISOString(),
        })),
      },
      
      // Статистика (формат как в getPublicProfile)
      stats: {
        totals: user.gameStats.reduce(
          (acc, gs) => ({
            gamesPlayed: acc.gamesPlayed + gs.gamesPlayed,
            gamesWon: acc.gamesWon + gs.gamesWon,
            timePlayed: acc.timePlayed + gs.timePlayed,
          }),
          { gamesPlayed: 0, gamesWon: 0, timePlayed: 0 }
        ),
        byGame: user.gameStats.map(gs => ({
          gameType: gs.gameType,
          gamesPlayed: gs.gamesPlayed,
          gamesWon: gs.gamesWon,
          playTimeMinutes: Math.floor((gs.timePlayed || 0) / 60),
          timePlayed: gs.timePlayed,
        })),
      },
      
      // Также оставляем gameStats для обратной совместимости
      gameStats: user.gameStats.map(gs => ({
        gameType: gs.gameType,
        gamesPlayed: gs.gamesPlayed,
        gamesWon: gs.gamesWon,
        timePlayed: gs.timePlayed,
      })),
      
      // Приватная заметка (только для текущего пользователя)
      userNote,
      
      // Статус дружбы (для FriendshipBadge)
      friendStatus,
      friendRequestId, // ID заявки для pending_sent/pending_received
      
      // Игнорирование (для MoreMenuButton)
      isIgnored,
    },
  };
}

/**
 * Обновить игры в профиле
 */
async function updateProfileGames(userId, listType, games) {
  // Валидация
  const maxGames = {
    favorite: MAX_FAVORITE_GAMES,
    current: MAX_CURRENT_GAMES,
    wishlist: MAX_WISHLIST_GAMES,
    featured: 1, // Одна любимая игра
  }[listType];

  if (!maxGames) {
    return { success: false, error: "Неверный тип списка" };
  }

  // Проверка на массив
  if (!Array.isArray(games)) {
    games = games ? [games] : [];
  }

  if (games.length > maxGames) {
    return { success: false, error: `Максимум ${maxGames} игр в списке "${listType}"` };
  }

  try {
    // Удаляем старые записи
    await prisma.userProfileGame.deleteMany({
      where: { userId, listType },
    });

    // Создаём новые
    if (games.length > 0) {
      await prisma.userProfileGame.createMany({
        data: games.map((game, index) => ({
          userId,
          gameId: String(game.id),
          name: game.name,
          coverUrl: game.coverUrl || null,
          listType,
          sortOrder: index,
          experienceTag: game.gameTags?.experience || null,
          ratingTag: Array.isArray(game.gameTags?.rating) 
            ? JSON.stringify(game.gameTags.rating) 
            : (game.gameTags?.rating || null),
          searchTags: JSON.stringify(game.gameTags?.search || []),
          extraData: JSON.stringify({ icon: game.icon, color: game.color }),
          comment: game.comment || null, // Комментарий для featured игры
        })),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[profile:games:update] Error:", error);
    return { success: false, error: "Ошибка сохранения" };
  }
}

/**
 * Обновить виджеты профиля
 */
async function updateProfileWidgets(userId, widgets) {
  try {
    // Удаляем старые виджеты
    await prisma.userProfileWidget.deleteMany({
      where: { userId },
    });

    // Создаём новые
    if (widgets.length > 0) {
      await prisma.userProfileWidget.createMany({
        data: widgets.map((widget, index) => ({
          userId,
          widgetType: widget.type,
          isVisible: widget.isVisible !== false,
          sortOrder: index,
          settings: JSON.stringify(widget.settings || {}),
        })),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[profile:widgets:update] Error:", error);
    return { success: false, error: "Ошибка сохранения" };
  }
}

/**
 * Установить заметку о пользователе
 */
async function setUserNote(userId, targetUserId, note) {
  if (userId === targetUserId) {
    return { success: false, error: "Нельзя создать заметку о себе" };
  }

  try {
    if (!note || note.trim() === "") {
      // Удаляем заметку
      await prisma.userNote.deleteMany({
        where: { userId, targetUserId },
      });
    } else {
      // Создаём или обновляем
      await prisma.userNote.upsert({
        where: {
          userId_targetUserId: { userId, targetUserId },
        },
        update: { note: note.trim() },
        create: {
          userId,
          targetUserId,
          note: note.trim(),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[profile:note:set] Error:", error);
    return { success: false, error: "Ошибка сохранения" };
  }
}

/**
 * Получить историю активности
 */
async function getActivityHistory(targetUserId, limit = 20) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ACTIVITY_DAYS_LIMIT);

  try {
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, MAX_ACTIVITIES),
    });

    return {
      success: true,
      activities: activities.map(formatActivity),
    };
  } catch (error) {
    console.error("[profile:activity:get] Error:", error);
    return { success: false, error: "Ошибка загрузки" };
  }
}

/**
 * Записать активность пользователя
 * (вызывается из игровых модулей)
 */
async function recordActivity(userId, data) {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        activityType: data.activityType,
        gameType: data.gameType,
        gameName: data.gameName,
        roomCode: data.roomCode,
        duration: data.duration,
        scheduledEvent: data.scheduledEvent,
        details: JSON.stringify(data.details || {}),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[profile:activity:record] Error:", error);
    return { success: false };
  }
}

// ============================================
// Socket.IO обработчики
// ============================================

/**
 * Регистрация обработчиков Socket.IO
 */
function registerProfileHandlers(socket, io) {
  // Используем socket.data.userId как в остальном коде сервера
  const getUserId = () => socket.data?.userId || socket.userId;

  // Получить полный профиль
  socket.on("profile:get", async ({ targetUserId }, ack) => {
    const userId = getUserId();
    const result = await getFullProfile(targetUserId, userId);
    if (typeof ack === "function") ack(result);
  });

  // Обновить игры в профиле
  socket.on("profile:games:update", async ({ type, games }, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") ack({ success: false, error: "Не авторизован" });
      return;
    }

    const result = await updateProfileGames(userId, type, games);
    if (typeof ack === "function") ack(result);
  });

  // Обновить виджеты
  socket.on("profile:widgets:update", async ({ widgets }, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") ack({ success: false, error: "Не авторизован" });
      return;
    }

    const result = await updateProfileWidgets(userId, widgets);
    if (typeof ack === "function") ack(result);
  });

  // Установить заметку о пользователе
  socket.on("profile:note:set", async ({ targetUserId, note }, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") ack({ success: false, error: "Не авторизован" });
      return;
    }

    const result = await setUserNote(userId, targetUserId, note);
    if (typeof ack === "function") ack(result);
  });

  // DEPRECATED: История активности теперь обрабатывается в activity.js (registerActivityHandlers)
  // socket.on("profile:activity:get", ...) удалён, используется новая реализация с currentActivity, stats, etc.

  // Установить биографию профиля
  socket.on("social:biography:set", async ({ biography }, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") ack({ success: false, error: "Not authenticated" });
      return;
    }

    try {
      // Ограничение длины биографии
      const trimmedBio = (biography || "").trim().slice(0, 500);
      
      await prisma.user.update({
        where: { id: userId },
        data: { biography: trimmedBio },
      });

      if (typeof ack === "function") ack({ success: true, biography: trimmedBio });
    } catch (error) {
      console.error("[social:biography:set] Error:", error);
      if (typeof ack === "function") ack({ success: false, error: "Ошибка сохранения биографии" });
    }
  });
}

module.exports = {
  registerProfileHandlers,
  getFullProfile,
  updateProfileGames,
  updateProfileWidgets,
  setUserNote,
  getActivityHistory,
  recordActivity,
};
