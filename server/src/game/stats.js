/**
 * Модуль статистики и достижений
 * Обновляет UserGameStats и проверяет разблокировку достижений
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ============================================
// ОТСЛЕЖИВАНИЕ ВРЕМЕНИ В ИГРЕ
// ============================================

// Map для хранения времени входа игроков: { visitorId_gameType -> joinedAt timestamp }
const playerJoinTimes = new Map();

/**
 * Запомнить время входа игрока в комнату и обновить streak
 * @param {string} visitorId - ID посетителя
 * @param {string} gameType - Тип игры (tod, alias, emotional, codenames)
 */
function recordPlayerJoin(visitorId, gameType) {
  if (!visitorId) return;
  const key = `${visitorId}_${gameType}`;
  if (!playerJoinTimes.has(key)) {
    playerJoinTimes.set(key, Date.now());
    console.log(`[Stats] Player joined ${gameType}:`, visitorId);
    // Обновляем streak при входе в игру
    updateLoginStreak(visitorId);
  }
}

/**
 * Обновить streak (дни подряд) для пользователя при входе в игру
 * @param {string} visitorId - ID посетителя
 */
async function updateLoginStreak(visitorId) {
  if (!visitorId) return;
  
  try {
    // Находим пользователя по visitorId
    const user = await prisma.user.findFirst({
      where: { visitorId },
      select: { id: true, lastLoginDate: true, loginStreak: true }
    });
    
    if (!user) return;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    
    if (lastLogin) {
      const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      const diffDays = Math.floor((today - lastLoginDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Уже был вход сегодня — не меняем streak
        return;
      } else if (diffDays === 1) {
        // Вход на следующий день — увеличиваем streak
        const newStreak = (user.loginStreak || 0) + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            loginStreak: newStreak,
            lastLoginDate: now
          }
        });
        console.log(`[Stats] Login streak updated for user ${user.id}: ${newStreak} days`);
      } else {
        // Пропущен день — сбрасываем streak на 1
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            loginStreak: 1,
            lastLoginDate: now
          }
        });
        console.log(`[Stats] Login streak reset for user ${user.id}: 1 day`);
      }
    } else {
      // Первый вход
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          loginStreak: 1,
          lastLoginDate: now
        }
      });
      console.log(`[Stats] First login streak for user ${user.id}: 1 day`);
    }
  } catch (error) {
    console.error("[Stats] Login streak update error:", error);
  }
}

/**
 * Записать время игры при выходе игрока из комнаты
 * @param {string} visitorId - ID посетителя
 * @param {string} gameType - Тип игры (tod, alias, emotional, codenames)
 * @param {Object} io - Socket.IO инстанс (опционально)
 * @param {number} gameStartedAt - Время начала игры из комнаты (fallback для переподключений)
 */
async function recordPlayerLeave(visitorId, gameType, io = null, gameStartedAt = null) {
  if (!visitorId) return;
  
  const key = `${visitorId}_${gameType}`;
  let joinedAt = playerJoinTimes.get(key);
  
  // Fallback: если нет записи в Map (после перезапуска сервера или переподключения),
  // используем gameStartedAt из комнаты как время начала отсчёта
  if (!joinedAt && gameStartedAt) {
    joinedAt = gameStartedAt;
    console.log(`[Stats] Player leave - using gameStartedAt as fallback for ${gameType}:`, visitorId);
  }
  
  if (!joinedAt) {
    console.log(`[Stats] Player leave - no join time found for ${gameType}:`, visitorId);
    return;
  }
  
  const timePlayed = Math.floor((Date.now() - joinedAt) / 1000); // в секундах
  playerJoinTimes.delete(key);
  
  console.log(`[Stats] Player left ${gameType}:`, visitorId, `- timePlayed: ${timePlayed}s`);
  
  if (timePlayed < 5) {
    // Игнорируем очень короткие сессии (менее 5 секунд)
    return;
  }
  
  try {
    await updateUserStats(visitorId, gameType, { timePlayed }, io);
  } catch (e) {
    console.error(`[Stats] Error recording time for ${gameType}:`, e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОБНОВЛЕНИЕ СТАТИСТИКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обновить статистику пользователя после события в игре
 * @param {string} visitorId - ID посетителя (visitorId игрока)
 * @param {string} gameType - Тип игры: "tod" | "alias" | "codenames" | "emotional"
 * @param {Object} updates - Обновления статистики
 * @param {number} [updates.gamesPlayed] - Количество сыгранных игр (инкремент)
 * @param {number} [updates.gamesWon] - Количество побед (инкремент)
 * @param {number} [updates.timePlayed] - Время игры в секундах (инкремент)
 * @param {Object} [updates.customStats] - Кастомные метрики для игры
 * @param {Object} io - Socket.IO инстанс для уведомлений
 * @returns {Promise<{stats: Object, newAchievements: Array}>}
 */
async function updateUserStats(visitorId, gameType, updates, io) {
  if (!visitorId) {
    console.log("[Stats] No visitorId provided, skipping");
    return { stats: null, newAchievements: [] };
  }

  try {
    // Ищем пользователя напрямую по visitorId
    const user = await prisma.user.findFirst({
      where: { visitorId },
      select: { id: true }
    });

    if (!user) {
      // Пользователь не авторизован или не привязан к visitorId — статистика не сохраняется
      console.log("[Stats] User not found for visitorId:", visitorId);
      return { stats: null, newAchievements: [] };
    }

    const userId = user.id;
    console.log("[Stats] Found user:", userId, "for visitorId:", visitorId);

    // Получаем или создаём запись статистики
    let stats = await prisma.userGameStats.findUnique({
      where: {
        userId_gameType: { userId, gameType }
      }
    });

    const currentCustomStats = stats ? JSON.parse(stats.customStats || "{}") : {};
    const mergedCustomStats = { ...currentCustomStats };

    // Мержим кастомные статы
    if (updates.customStats) {
      for (const [key, value] of Object.entries(updates.customStats)) {
        if (typeof value === "number") {
          mergedCustomStats[key] = (mergedCustomStats[key] || 0) + value;
        } else {
          mergedCustomStats[key] = value;
        }
      }
    }

    if (stats) {
      // Обновляем существующую запись
      stats = await prisma.userGameStats.update({
        where: { id: stats.id },
        data: {
          gamesPlayed: stats.gamesPlayed + (updates.gamesPlayed || 0),
          gamesWon: stats.gamesWon + (updates.gamesWon || 0),
          timePlayed: stats.timePlayed + (updates.timePlayed || 0),
          customStats: JSON.stringify(mergedCustomStats),
          lastPlayedAt: new Date()
        }
      });
    } else {
      // Создаём новую запись
      stats = await prisma.userGameStats.create({
        data: {
          userId,
          gameType,
          gamesPlayed: updates.gamesPlayed || 0,
          gamesWon: updates.gamesWon || 0,
          timePlayed: updates.timePlayed || 0,
          customStats: JSON.stringify(mergedCustomStats),
          lastPlayedAt: new Date()
        }
      });
    }

    // Проверяем достижения
    const newAchievements = await checkAndUnlockAchievements(userId, gameType, stats, mergedCustomStats, io, updates.currentTurn);

    return { stats, newAchievements };
  } catch (error) {
    console.error("[Stats] Error updating user stats:", error);
    return { stats: null, newAchievements: [] };
  }
}

/**
 * Обновить статистику по playerId из Player или AliasPlayer модели
 * Ищет связанного User напрямую по visitorId в User
 */
async function updateStatsForPlayer(playerId, gameType, updates, io) {
  try {
    // Сначала пробуем найти Player (ToD)
    let player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { visitorId: true }
    });

    let visitorId = player?.visitorId;

    // Если не нашли Player, пробуем AliasPlayer
    if (!player) {
      const aliasPlayer = await prisma.aliasPlayer.findUnique({
        where: { id: playerId },
        select: { visitorId: true }
      });
      visitorId = aliasPlayer?.visitorId;
    }

    if (!visitorId) {
      console.log("[Stats] No visitorId for player:", playerId);
      return { stats: null, newAchievements: [] };
    }

    // Пробуем найти пользователя по точному совпадению visitorId
    let user = await prisma.user.findFirst({
      where: { visitorId },
      select: { id: true }
    });

    // Если не нашли, пробуем найти по глобальному visitorId
    // (игроки Alias используют av_ prefix, а User хранит u_ prefix)
    // Ищем сессию с этим visitorId в data
    if (!user) {
      // Попробуем найти пользователя через сессию, содержащую этот visitorId
      const session = await prisma.session.findFirst({
        where: {
          data: { contains: visitorId }
        },
        select: { userId: true },
        orderBy: { createdAt: "desc" }
      });
      
      if (session?.userId) {
        user = { id: session.userId };
        console.log("[Stats] Found user via session for visitorId:", visitorId);
      }
    }

    if (!user) {
      console.log("[Stats] User not found for visitorId:", visitorId);
      return { stats: null, newAchievements: [] };
    }

    // Используем updateUserStatsById напрямую (включая currentTurn)
    return await updateUserStatsById(user.id, gameType, updates, io);
  } catch (error) {
    console.error("[Stats] Error updating stats for player:", error);
    return { stats: null, newAchievements: [] };
  }
}

/**
 * Обновить статистику пользователя по userId напрямую
 */
async function updateUserStatsById(userId, gameType, updates, io) {
  if (!userId) {
    return { stats: null, newAchievements: [] };
  }

  try {
    console.log("[Stats] Updating stats for userId:", userId, "gameType:", gameType, "updates:", JSON.stringify(updates));

    // Получаем или создаём запись статистики
    let stats = await prisma.userGameStats.findUnique({
      where: {
        userId_gameType: { userId, gameType }
      }
    });

    const currentCustomStats = stats ? JSON.parse(stats.customStats || "{}") : {};
    const mergedCustomStats = { ...currentCustomStats };

    console.log("[Stats] Before merge - current:", currentCustomStats, "incoming:", updates.customStats);

    // Мержим кастомные статы
    if (updates.customStats) {
      for (const [key, value] of Object.entries(updates.customStats)) {
        if (typeof value === "number") {
          mergedCustomStats[key] = (mergedCustomStats[key] || 0) + value;
        } else {
          mergedCustomStats[key] = value;
        }
      }
    }

    console.log("[Stats] After merge:", mergedCustomStats);

    if (stats) {
      // Обновляем существующую запись
      stats = await prisma.userGameStats.update({
        where: { id: stats.id },
        data: {
          gamesPlayed: stats.gamesPlayed + (updates.gamesPlayed || 0),
          gamesWon: stats.gamesWon + (updates.gamesWon || 0),
          timePlayed: stats.timePlayed + (updates.timePlayed || 0),
          customStats: JSON.stringify(mergedCustomStats),
          lastPlayedAt: new Date()
        }
      });
    } else {
      // Создаём новую запись
      stats = await prisma.userGameStats.create({
        data: {
          userId,
          gameType,
          gamesPlayed: updates.gamesPlayed || 0,
          gamesWon: updates.gamesWon || 0,
          timePlayed: updates.timePlayed || 0,
          customStats: JSON.stringify(mergedCustomStats),
          lastPlayedAt: new Date()
        }
      });
    }

    console.log("[Stats] Stats updated:", { gamesPlayed: stats.gamesPlayed, customStats: mergedCustomStats });

    // Проверяем достижения
    const newAchievements = await checkAndUnlockAchievements(userId, gameType, stats, mergedCustomStats, io, updates.currentTurn);

    return { stats, newAchievements };
  } catch (error) {
    console.error("[Stats] Error updating user stats by id:", error);
    return { stats: null, newAchievements: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПРОВЕРКА И РАЗБЛОКИРОВКА ДОСТИЖЕНИЙ (с поддержкой уровней)
// ═══════════════════════════════════════════════════════════════════════════

// Редкость по уровням: 1=common, 2=rare, 3=epic, 4=epic, 5=legendary
const LEVEL_RARITY = ["common", "rare", "epic", "epic", "legendary"];
const LEVEL_XP_MULTIPLIER = [1, 1.5, 2, 2.5, 3]; // Множитель XP по уровням

/**
 * Проверить и разблокировать/повысить уровень достижений для пользователя
 */
async function checkAndUnlockAchievements(userId, gameType, stats, customStats, io, currentTurn = null) {
  const newAchievements = []; // { achievement, level, isLevelUp }

  try {
    // Получаем все достижения пользователя с уровнями
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, level: true }
    });
    const userAchievementMap = new Map(userAchievements.map(ua => [ua.achievementId, ua.level]));

    const achievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        OR: [
          { gameType: null },
          { gameType: gameType }
        ]
      }
    });

    // Получаем общую статистику пользователя
    const allStats = await prisma.userGameStats.findMany({
      where: { userId }
    });
    const totalGamesPlayed = allStats.reduce((sum, s) => sum + s.gamesPlayed, 0);
    const totalGamesWon = allStats.reduce((sum, s) => sum + s.gamesWon, 0);

    // Получаем данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginStreak: true, xp: true, level: true }
    });

    // Проверяем каждое достижение
    for (const achievement of achievements) {
      const currentLevel = userAchievementMap.get(achievement.id) || 0;
      const condition = JSON.parse(achievement.unlockCondition || "{}");
      
      // Проверяем, есть ли уровни у достижения
      const isProgressive = condition.levels && Array.isArray(condition.levels);
      const maxLevel = isProgressive ? Math.min(condition.levels.length, 5) : 1;
      
      // Пропускаем если уже максимальный уровень
      if (currentLevel >= maxLevel) continue;

      // Определяем целевой уровень для проверки
      const targetLevel = currentLevel + 1;
      
      const context = {
        stats,
        customStats,
        totalGamesPlayed,
        totalGamesWon,
        gameType,
        user,
        currentTurn,
        targetLevel // Для прогрессивных достижений
      };

      const isUnlocked = checkCondition(condition, context);

      if (isUnlocked) {
        const isLevelUp = currentLevel > 0;
        const newLevel = targetLevel;
        
        // Вычисляем редкость и XP для уровня
        const effectiveRarity = isProgressive ? LEVEL_RARITY[newLevel - 1] : achievement.rarity;
        const xpMultiplier = isProgressive ? LEVEL_XP_MULTIPLIER[newLevel - 1] : 1;
        const xpReward = Math.round(achievement.xpReward * xpMultiplier);

        if (isLevelUp) {
          // Повышаем уровень существующего достижения
          await prisma.userAchievement.updateMany({
            where: { userId, achievementId: achievement.id },
            data: { 
              level: newLevel,
              leveledUpAt: new Date()
            }
          });
          console.log(`[Achievements] User ${userId} leveled up ${achievement.name} to level ${newLevel}`);
        } else {
          // Разблокируем новое достижение
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              level: newLevel
            }
          });
          console.log(`[Achievements] User ${userId} unlocked: ${achievement.name} (level ${newLevel})`);
        }

        // Начисляем XP
        await prisma.user.update({
          where: { id: userId },
          data: {
            xp: { increment: xpReward }
          }
        });

        // Проверяем и обновляем уровень пользователя
        await checkAndUpdateLevel(userId);

        newAchievements.push({ 
          achievement, 
          level: newLevel, 
          isLevelUp,
          effectiveRarity,
          xpReward 
        });
        
        // Обновляем карту для проверки следующего уровня в этом же цикле
        userAchievementMap.set(achievement.id, newLevel);
      }
    }

    // Отправляем уведомления о новых достижениях/повышениях
    if (newAchievements.length > 0 && io) {
      // Отправляем каждое достижение с задержкой
      for (let i = 0; i < newAchievements.length; i++) {
        const { achievement, level, isLevelUp, effectiveRarity, xpReward } = newAchievements[i];
        
        // Форматируем описание для прогрессивных достижений
        let description = achievement.description;
        try {
          const condition = JSON.parse(achievement.unlockCondition || "{}");
          if (condition.levels && Array.isArray(condition.levels) && level > 0) {
            const targetValue = condition.levels[level - 1];
            description = description.replace("{value}", targetValue);
          } else if (condition.value) {
            description = description.replace("{value}", condition.value);
          }
        } catch (e) {}
        
        setTimeout(() => {
          io.emit("achievement:unlocked", {
            visitorId: null,
            achievement: {
              id: achievement.id,
              slug: achievement.slug,
              name: achievement.name,
              description: description,
              icon: achievement.icon,
              rarity: effectiveRarity,
              xpReward: xpReward,
              level: level,
              isLevelUp: isLevelUp
            }
          });
        }, i * 2000);
      }
    }

    return newAchievements;
  } catch (error) {
    console.error("[Achievements] Error checking achievements:", error);
    return [];
  }
}

/**
 * Проверить условие разблокировки достижения
 * Поддерживает многоуровневые достижения через condition.levels
 */
function checkCondition(condition, context) {
  const { stats, customStats, totalGamesPlayed, totalGamesWon, gameType, user, currentTurn, targetLevel } = context;

  // Получаем целевое значение для уровня (если есть levels)
  const getTargetValue = () => {
    if (condition.levels && Array.isArray(condition.levels) && targetLevel) {
      return condition.levels[targetLevel - 1] || condition.value || 0;
    }
    return condition.value || 0;
  };

  switch (condition.type) {
    case "count": {
      // Проверка счётчика
      const field = condition.field;
      let value = 0;

      // Проверяем в customStats
      if (customStats && customStats[field] !== undefined) {
        value = customStats[field];
      }
      // Проверяем в stats
      else if (stats && stats[field] !== undefined) {
        value = stats[field];
      }
      // Специальные поля
      else if (field === "gamesPlayed") {
        value = condition.gameType ? stats?.gamesPlayed || 0 : totalGamesPlayed;
      }
      else if (field === "gamesWon") {
        value = condition.gameType ? stats?.gamesWon || 0 : totalGamesWon;
      }

      return value >= getTargetValue();
    }

    case "single_round": {
      // Проверка достижения за один раунд/ход
      if (!currentTurn) return false;
      const field = condition.field;
      const value = currentTurn[field] || 0;
      return value >= getTargetValue();
    }

    case "streak": {
      // Проверка стрика
      if (condition.field === "loginDays" && user) {
        return user.loginStreak >= getTargetValue();
      }
      return false;
    }

    case "subscription": {
      // Проверка подписки — обрабатывается отдельно при покупке
      return false;
    }

    case "event": {
      // Проверка события — обрабатывается при регистрации
      return false;
    }

    case "time": {
      // Проверка времени суток
      const hour = new Date().getHours();
      return hour === condition.hour;
    }

    default:
      return false;
  }
}

/**
 * Проверить и обновить уровень пользователя
 */
async function checkAndUpdateLevel(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });

    if (!user) return;

    // Формула уровня: каждые 100 XP = новый уровень
    const newLevel = Math.floor(user.xp / 100) + 1;

    if (newLevel > user.level) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel }
      });
      console.log(`[Level] User ${userId} leveled up to ${newLevel}`);
    }
  } catch (error) {
    console.error("[Level] Error updating level:", error);
  }
}

/**
 * Разблокировать достижение по событию (регистрация, подписка и т.д.)
 */
async function unlockAchievementByEvent(userId, eventType, eventData, io) {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true }
    });

    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true }
    });
    const unlockedSet = new Set(unlockedIds.map(ua => ua.achievementId));

    const newAchievements = [];

    for (const achievement of achievements) {
      if (unlockedSet.has(achievement.id)) continue;

      const condition = JSON.parse(achievement.unlockCondition || "{}");

      let shouldUnlock = false;

      if (condition.type === "event" && condition.event === eventType) {
        shouldUnlock = true;
      }

      if (condition.type === "subscription" && eventType === "subscription") {
        if (eventData?.tier === condition.tier) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id }
        });

        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: achievement.xpReward } }
        });

        await checkAndUpdateLevel(userId);
        newAchievements.push(achievement);

        console.log(`[Achievements] User ${userId} unlocked by event: ${achievement.name}`);
      }
    }

    // Отправляем уведомления
    if (newAchievements.length > 0 && io) {
      for (const achievement of newAchievements) {
        // Форматируем описание
        let description = achievement.description;
        try {
          const condition = JSON.parse(achievement.unlockCondition || "{}");
          if (condition.value) {
            description = description.replace("{value}", condition.value);
          }
        } catch (e) {}
        
        io.emit("achievement:unlocked", {
          userId,
          achievement: {
            id: achievement.id,
            slug: achievement.slug,
            name: achievement.name,
            description: description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            xpReward: achievement.xpReward
          }
        });
      }
    }

    return newAchievements;
  } catch (error) {
    console.error("[Achievements] Error unlocking by event:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ХЕЛПЕРЫ ДЛЯ ИГР
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Записать завершение раунда Truth or Dare
 * @param {string} playerId - ID игрока
 * @param {string} mode - "truth" или "dare"
 * @param {boolean} wasApproved - было ли задание одобрено
 * @param {Object} io - Socket.IO инстанс
 * @param {number} [roundDuration] - длительность раунда в секундах (опционально)
 */
async function recordTodRoundComplete(playerId, mode, wasApproved, io, roundDuration = 0) {
  console.log("[Stats] recordTodRoundComplete called:", { playerId, mode, wasApproved, roundDuration });
  
  const updates = {
    customStats: {
      roundsCompleted: 1 // Общее количество раундов для "Легенда вечеринки"
    },
    timePlayed: roundDuration // Добавляем время раунда к общему времени
  };

  if (mode === "truth") {
    updates.customStats.truthsCompleted = wasApproved ? 1 : 0;
    updates.customStats.truthsTotal = 1;
  } else if (mode === "dare") {
    updates.customStats.daresCompleted = wasApproved ? 1 : 0;
    updates.customStats.daresTotal = 1;
  }

  // Считаем "идеальные раунды" (без отказа) для "Абсолютный чемпион"
  if (wasApproved) {
    updates.customStats.perfectRounds = 1;
  }

  return await updateStatsForPlayer(playerId, "tod", updates, io);
}

/**
 * Записать завершение игры Truth or Dare
 * @param {string} playerId - ID игрока
 * @param {Object} io - Socket.IO инстанс
 * @param {number} [timePlayed] - время игры в секундах (опционально)
 */
async function recordTodGameComplete(playerId, io, timePlayed = 0) {
  return await updateStatsForPlayer(playerId, "tod", {
    gamesPlayed: 1,
    timePlayed: timePlayed
  }, io);
}

/**
 * Записать выход из режима "Хаос" в Truth or Dare
 */
async function recordTodChaosEscape(playerId, io) {
  return await updateStatsForPlayer(playerId, "tod", {
    customStats: {
      chaosEscapes: 1
    }
  }, io);
}

/**
 * Записать снятие статуса "Позор" в Truth or Dare
 */
async function recordTodRedemption(playerId, io) {
  return await updateStatsForPlayer(playerId, "tod", {
    customStats: {
      redemptions: 1
    }
  }, io);
}

/**
 * Записать ход в Alias
 */
async function recordAliasTurnComplete(playerId, wordsGuessed, wordsSkipped, io) {
  // Сначала получаем текущую статистику для обновления bestRound
  const result = await updateStatsForPlayer(playerId, "alias", {
    customStats: {
      wordsGuessed,
      wordsSkipped,
      turnsPlayed: 1
    },
    // Передаём данные о текущем ходе для проверки single_round достижений
    currentTurn: {
      wordsGuessed,
      wordsSkipped
    }
  }, io);
  
  // Обновляем bestRound если текущий результат лучше
  if (result.stats) {
    const currentCustomStats = JSON.parse(result.stats.customStats || "{}");
    const currentBest = currentCustomStats.bestRound || 0;
    if (wordsGuessed > currentBest) {
      // Обновляем bestRound напрямую (не инкремент)
      await updateBestRound(playerId, wordsGuessed);
    }
  }
  
  return result;
}

/**
 * Обновить лучший результат за раунд в Alias
 */
async function updateBestRound(playerId, wordsGuessed) {
  try {
    // Находим игрока и его userId
    let player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { visitorId: true }
    });
    let visitorId = player?.visitorId;
    
    if (!player) {
      const aliasPlayer = await prisma.aliasPlayer.findUnique({
        where: { id: playerId },
        select: { visitorId: true }
      });
      visitorId = aliasPlayer?.visitorId;
    }
    
    if (!visitorId) return;
    
    const user = await prisma.user.findFirst({
      where: { visitorId },
      select: { id: true }
    });
    
    if (!user) return;
    
    // Получаем статистику
    const stats = await prisma.userGameStats.findUnique({
      where: {
        userId_gameType: { userId: user.id, gameType: "alias" }
      }
    });
    
    if (stats) {
      const customStats = JSON.parse(stats.customStats || "{}");
      customStats.bestRound = wordsGuessed;
      
      await prisma.userGameStats.update({
        where: { id: stats.id },
        data: { customStats: JSON.stringify(customStats) }
      });
      
      console.log("[Stats] Updated bestRound to", wordsGuessed);
    }
  } catch (error) {
    console.error("[Stats] Error updating bestRound:", error);
  }
}

/**
 * Записать победу в Alias
 * @param {string} playerId - ID игрока
 * @param {boolean} won - выиграл ли игрок
 * @param {Object} io - Socket.IO инстанс
 * @param {number} [timePlayed] - время игры в секундах (опционально)
 */
async function recordAliasGameComplete(playerId, won, io, timePlayed = 0) {
  console.log("[Stats] recordAliasGameComplete called:", { playerId, won, timePlayed });
  return await updateStatsForPlayer(playerId, "alias", {
    gamesPlayed: 1,
    gamesWon: won ? 1 : 0,
    timePlayed: timePlayed
  }, io);
}

/**
 * Записать раунд в Emotional (угадывание эмоции)
 */
async function recordEmotionalRoundComplete(visitorId, guessedCorrectly, io) {
  return await updateUserStats(visitorId, "emotional", {
    customStats: {
      roundsPlayed: 1,
      correctGuesses: guessedCorrectly ? 1 : 0
    }
  }, io);
}

/**
 * Записать завершение игры Emotional
 * @param {string} visitorId - ID посетителя
 * @param {boolean} won - выиграл ли игрок
 * @param {Object} io - Socket.IO инстанс
 * @param {number} [timePlayed] - время игры в секундах (опционально)
 */
async function recordEmotionalGameComplete(visitorId, won, io, timePlayed = 0) {
  console.log("[Stats] recordEmotionalGameComplete called:", { visitorId, won, timePlayed });
  return await updateUserStats(visitorId, "emotional", {
    gamesPlayed: 1,
    gamesWon: won ? 1 : 0,
    timePlayed: timePlayed
  }, io);
}

/**
 * Записать ход в Codenames (подсказка капитана или угадывание)
 */
async function recordCodenamesRoundComplete(visitorId, role, wordsGuessed, io) {
  const customStats = {};
  
  if (role === "captain") {
    customStats.hintsGiven = 1;
  } else {
    customStats.wordsGuessed = wordsGuessed || 0;
  }
  
  return await updateUserStats(visitorId, "codenames", {
    customStats
  }, io);
}

/**
 * Записать завершение игры Codenames
 * @param {string} visitorId - ID посетителя
 * @param {boolean} won - выиграл ли игрок
 * @param {Object} io - Socket.IO инстанс
 * @param {number} [timePlayed] - время игры в секундах (опционально)
 */
async function recordCodenamesGameComplete(visitorId, won, io, timePlayed = 0) {
  return await updateUserStats(visitorId, "codenames", {
    gamesPlayed: 1,
    gamesWon: won ? 1 : 0,
    timePlayed: timePlayed
  }, io);
}

module.exports = {
  updateUserStats,
  updateUserStatsById,
  updateStatsForPlayer,
  checkAndUnlockAchievements,
  unlockAchievementByEvent,
  // Отслеживание времени в игре (вход/выход)
  recordPlayerJoin,
  recordPlayerLeave,
  updateLoginStreak,
  // Truth or Dare
  recordTodRoundComplete,
  recordTodGameComplete,
  recordTodChaosEscape,
  recordTodRedemption,
  // Alias
  recordAliasTurnComplete,
  recordAliasGameComplete,
  // Emotional
  recordEmotionalRoundComplete,
  recordEmotionalGameComplete,
  // Codenames
  recordCodenamesRoundComplete,
  recordCodenamesGameComplete
};
