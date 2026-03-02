/**
 * Friends Management Module
 * Handles all friend-related operations: requests, acceptance, removal, blocking
 */

const { PrismaClient } = require("@prisma/client");

// ═══════════════════════════════════════════════════════════════════════════
// ОТПРАВКА ЗАЯВКИ В ДРУЗЬЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отправить заявку в друзья
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} senderId - ID отправителя
 * @param {string} receiverId - ID получателя
 * @returns {Promise<{success: boolean, request?: object, error?: string}>}
 */
async function sendFriendRequest(prisma, senderId, receiverId) {
  try {
    // Нельзя добавить себя
    if (senderId === receiverId) {
      return { success: false, error: "Нельзя добавить себя в друзья" };
    }

    // Проверяем, не заблокирован ли пользователь
    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { userId: senderId, blockedId: receiverId },
          { userId: receiverId, blockedId: senderId },
        ],
      },
    });

    if (blocked) {
      return { success: false, error: "Невозможно отправить заявку" };
    }

    // Проверяем, не друзья ли уже
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId },
        ],
      },
    });

    if (existingFriendship) {
      return { success: false, error: "Вы уже друзья" };
    }

    // Проверяем существующие заявки
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: "pending" },
          { senderId: receiverId, receiverId: senderId, status: "pending" },
        ],
      },
    });

    if (existingRequest) {
      // Если есть встречная заявка — автоматически принимаем
      if (existingRequest.senderId === receiverId) {
        return acceptFriendRequest(prisma, senderId, existingRequest.id);
      }
      return { success: false, error: "Заявка уже отправлена" };
    }

    // Создаём заявку
    const request = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            frameSlug: true,
            nicknameStyle: true,
            onlineStatus: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            frameSlug: true,
            nicknameStyle: true,
            onlineStatus: true,
          },
        },
      },
    });

    return { success: true, request };
  } catch (error) {
    console.error("[friends] sendFriendRequest error:", error);
    return { success: false, error: "Ошибка при отправке заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПРИНЯТИЕ ЗАЯВКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Принять заявку в друзья
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя, принимающего заявку
 * @param {string} requestId - ID заявки
 * @returns {Promise<{success: boolean, friendship?: object, error?: string}>}
 */
async function acceptFriendRequest(prisma, userId, requestId) {
  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Заявка не найдена" };
    }

    if (request.receiverId !== userId) {
      return { success: false, error: "Нет прав для принятия этой заявки" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Заявка уже обработана" };
    }

    // Транзакция: обновляем заявку и создаём дружбу
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем статус заявки
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted" },
      });

      // Создаём взаимную дружбу (две записи для быстрого поиска)
      const friendship1 = await tx.friendship.create({
        data: {
          userId: request.senderId,
          friendId: request.receiverId,
        },
      });

      const friendship2 = await tx.friendship.create({
        data: {
          userId: request.receiverId,
          friendId: request.senderId,
        },
      });

      // Получаем данные о друге для возврата
      const friend = await tx.user.findUnique({
        where: { id: request.senderId },
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          frameSlug: true,
          nicknameStyle: true,
          onlineStatus: true,
          lastSeenAt: true,
          currentGameType: true,
          currentRoomCode: true,
        },
      });

      return { friendship: friendship1, friend };
    });

    return { success: true, friendship: result.friendship, friend: result.friend };
  } catch (error) {
    console.error("[friends] acceptFriendRequest error:", error);
    return { success: false, error: "Ошибка при принятии заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТКЛОНЕНИЕ ЗАЯВКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отклонить заявку в друзья
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя, отклоняющего заявку
 * @param {string} requestId - ID заявки
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function rejectFriendRequest(prisma, userId, requestId) {
  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Заявка не найдена" };
    }

    if (request.receiverId !== userId) {
      return { success: false, error: "Нет прав для отклонения этой заявки" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Заявка уже обработана" };
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
    });

    return { success: true };
  } catch (error) {
    console.error("[friends] rejectFriendRequest error:", error);
    return { success: false, error: "Ошибка при отклонении заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТМЕНА ИСХОДЯЩЕЙ ЗАЯВКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отменить исходящую заявку в друзья
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя, отменяющего заявку
 * @param {string} requestId - ID заявки
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function cancelFriendRequest(prisma, userId, requestId) {
  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Заявка не найдена" };
    }

    if (request.senderId !== userId) {
      return { success: false, error: "Нет прав для отмены этой заявки" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Заявка уже обработана" };
    }

    await prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return { success: true };
  } catch (error) {
    console.error("[friends] cancelFriendRequest error:", error);
    return { success: false, error: "Ошибка при отмене заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// УДАЛЕНИЕ ИЗ ДРУЗЕЙ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Удалить из друзей
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} friendId - ID друга для удаления
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function removeFriend(prisma, userId, friendId) {
  try {
    // Удаляем обе записи дружбы
    const result = await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Дружба не найдена" };
    }

    // Также удаляем принятую заявку (опционально, для чистоты)
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId, status: "accepted" },
          { senderId: friendId, receiverId: userId, status: "accepted" },
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[friends] removeFriend error:", error);
    return { success: false, error: "Ошибка при удалении из друзей" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ СПИСКА ДРУЗЕЙ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список друзей пользователя
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {object} options - Опции фильтрации
 * @param {string} options.filter - Фильтр: "all" | "online" | "in_game" | "offline"
 * @param {string} options.search - Поиск по имени
 * @returns {Promise<{success: boolean, friends?: Array, error?: string}>}
 */
async function getFriends(prisma, userId, options = {}) {
  try {
    const { filter = "all", search = "" } = options;

    // Базовый запрос
    const whereClause = {
      userId,
      friend: search
        ? {
            nickname: {
              contains: search,
              mode: "insensitive",
            },
          }
        : undefined,
    };

    const friendships = await prisma.friendship.findMany({
      where: whereClause,
      include: {
        friend: {
          select: {
            id: true,
            visitorId: true,
            nickname: true,
            avatarUrl: true,
            frameSlug: true,
            nicknameStyle: true,
            onlineStatus: true,
            lastSeenAt: true,
            currentGameType: true,
            currentRoomCode: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Преобразуем в удобный формат
    let friends = friendships.map((f) => ({
      friendshipId: f.id,
      ...f.friend,
      friendsSince: f.createdAt,
    }));

    // Применяем фильтр по статусу
    if (filter === "online") {
      friends = friends.filter((f) => f.onlineStatus === "online" || f.onlineStatus === "idle");
    } else if (filter === "in_game") {
      friends = friends.filter((f) => f.onlineStatus === "in_game");
    } else if (filter === "offline") {
      friends = friends.filter((f) => f.onlineStatus === "offline" || !f.onlineStatus);
    }

    // Сортировка: сначала в игре, потом онлайн, потом остальные
    friends.sort((a, b) => {
      const statusOrder = { in_game: 0, online: 1, idle: 2, offline: 3 };
      const aOrder = statusOrder[a.onlineStatus] ?? 3;
      const bOrder = statusOrder[b.onlineStatus] ?? 3;
      return aOrder - bOrder;
    });

    return { success: true, friends };
  } catch (error) {
    console.error("[friends] getFriends error:", error);
    return { success: false, error: "Ошибка при получении списка друзей" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ВХОДЯЩИХ ЗАЯВОК
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить входящие заявки в друзья
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<{success: boolean, requests?: Array, error?: string}>}
 */
async function getPendingRequests(prisma, userId) {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            visitorId: true,
            nickname: true,
            avatarUrl: true,
            frameSlug: true,
            nicknameStyle: true,
            onlineStatus: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        sender: r.sender,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    console.error("[friends] getPendingRequests error:", error);
    return { success: false, error: "Ошибка при получении заявок" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ИСХОДЯЩИХ ЗАЯВОК
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить исходящие заявки в друзья
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<{success: boolean, requests?: Array, error?: string}>}
 */
async function getSentRequests(prisma, userId) {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "pending",
      },
      include: {
        receiver: {
          select: {
            id: true,
            visitorId: true,
            nickname: true,
            avatarUrl: true,
            frameSlug: true,
            nicknameStyle: true,
            onlineStatus: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        receiver: r.receiver,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    console.error("[friends] getSentRequests error:", error);
    return { success: false, error: "Ошибка при получении исходящих заявок" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// БЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заблокировать пользователя
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} blockerId - ID блокирующего
 * @param {string} blockedId - ID блокируемого
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function blockUser(prisma, blockerId, blockedId) {
  try {
    if (blockerId === blockedId) {
      return { success: false, error: "Нельзя заблокировать себя" };
    }

    // Проверяем, не заблокирован ли уже
    const existing = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedId: { userId: blockerId, blockedId },
      },
    });

    if (existing) {
      return { success: false, error: "Пользователь уже заблокирован" };
    }

    // Транзакция: блокируем и удаляем дружбу
    await prisma.$transaction(async (tx) => {
      // Создаём блокировку
      await tx.blockedUser.create({
        data: { userId: blockerId, blockedId },
      });

      // Удаляем дружбу, если была
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId: blockerId, friendId: blockedId },
            { userId: blockedId, friendId: blockerId },
          ],
        },
      });

      // Удаляем pending заявки
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId, status: "pending" },
            { senderId: blockedId, receiverId: blockerId, status: "pending" },
          ],
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("[friends] blockUser error:", error);
    return { success: false, error: "Ошибка при блокировке пользователя" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// РАЗБЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Разблокировать пользователя
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} blockerId - ID блокирующего
 * @param {string} blockedId - ID блокируемого
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function unblockUser(prisma, blockerId, blockedId) {
  try {
    const result = await prisma.blockedUser.deleteMany({
      where: { userId: blockerId, blockedId },
    });

    if (result.count === 0) {
      return { success: false, error: "Пользователь не заблокирован" };
    }

    return { success: true };
  } catch (error) {
    console.error("[friends] unblockUser error:", error);
    return { success: false, error: "Ошибка при разблокировке" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ СПИСКА ЗАБЛОКИРОВАННЫХ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список заблокированных пользователей
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<{success: boolean, blocked?: Array, error?: string}>}
 */
async function getBlockedUsers(prisma, userId) {
  try {
    const blocked = await prisma.blockedUser.findMany({
      where: { userId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      blocked: blocked.map((b) => ({
        id: b.id,
        user: b.blocked,
        blockedAt: b.createdAt,
      })),
    };
  } catch (error) {
    console.error("[friends] getBlockedUsers error:", error);
    return { success: false, error: "Ошибка при получении списка" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПРОВЕРКА СТАТУСА ДРУЖБЫ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить статус отношений между пользователями
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID текущего пользователя
 * @param {string} targetId - ID проверяемого пользователя
 * @returns {Promise<{status: string, requestId?: string}>}
 * status: "none" | "friends" | "pending_sent" | "pending_received" | "blocked" | "blocked_by"
 */
async function getFriendshipStatus(prisma, userId, targetId) {
  try {
    if (userId === targetId) {
      return { status: "self" };
    }

    // Проверяем блокировку
    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { userId: userId, blockedId: targetId },
          { userId: targetId, blockedId: userId },
        ],
      },
    });

    if (blocked) {
      return {
        status: blocked.userId === userId ? "blocked" : "blocked_by",
      };
    }

    // Проверяем дружбу
    const friendship = await prisma.friendship.findFirst({
      where: { userId, friendId: targetId },
    });

    if (friendship) {
      return { status: "friends", friendshipId: friendship.id };
    }

    // Проверяем заявки
    const request = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetId, status: "pending" },
          { senderId: targetId, receiverId: userId, status: "pending" },
        ],
      },
    });

    if (request) {
      return {
        status: request.senderId === userId ? "pending_sent" : "pending_received",
        requestId: request.id,
      };
    }

    return { status: "none" };
  } catch (error) {
    console.error("[friends] getFriendshipStatus error:", error);
    return { status: "none" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОИСК ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ДОБАВЛЕНИЯ В ДРУЗЬЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Поиск пользователей по никнейму
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID текущего пользователя
 * @param {string} query - Поисковый запрос
 * @param {number} limit - Максимальное количество результатов
 * @returns {Promise<{success: boolean, users?: Array, error?: string}>}
 */
async function searchUsers(prisma, userId, query, limit = 20) {
  try {
    if (!query || query.length < 2) {
      return { success: false, error: "Введите минимум 2 символа" };
    }

    // Получаем заблокированных пользователей
    const blockedUsers = await prisma.blockedUser.findMany({
      where: {
        OR: [{ userId: userId }, { blockedId: userId }],
      },
      select: { userId: true, blockedId: true },
    });

    const blockedIds = new Set(
      blockedUsers.flatMap((b) => [b.userId, b.blockedId])
    );
    blockedIds.delete(userId);

    // Поиск пользователей
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { id: { notIn: Array.from(blockedIds) } },
          {
            nickname: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        frameSlug: true,
        nicknameStyle: true,
        onlineStatus: true,
        level: true,
      },
      take: limit,
    });

    // Добавляем статус дружбы для каждого
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const status = await getFriendshipStatus(prisma, userId, user.id);
        return { ...user, friendshipStatus: status.status, requestId: status.requestId };
      })
    );

    return { success: true, users: usersWithStatus };
  } catch (error) {
    console.error("[friends] searchUsers error:", error);
    return { success: false, error: "Ошибка при поиске" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ КОЛИЧЕСТВА НЕПРОЧИТАННЫХ ЗАЯВОК
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить количество непрочитанных входящих заявок
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<number>}
 */
async function getPendingRequestsCount(prisma, userId) {
  try {
    return await prisma.friendRequest.count({
      where: {
        receiverId: userId,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[friends] getPendingRequestsCount error:", error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ПУБЛИЧНОГО ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить публичный профиль пользователя
 * Включает: базовую информацию, статистику, достижения, общих друзей
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} viewerId - ID просматривающего пользователя (может быть null для гостей)
 * @param {string} targetId - ID профиля для просмотра (userId или visitorId)
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
async function getPublicProfile(prisma, viewerId, targetId) {
  try {
    // Сначала пробуем найти по userId, если не найден — по visitorId
    let targetUserId = targetId;
    let user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });

    if (!user) {
      // Пробуем найти по visitorId
      user = await prisma.user.findFirst({
        where: { visitorId: targetId },
        select: { id: true },
      });
      if (user) {
        targetUserId = user.id;
      } else {
        return { success: false, error: "Пользователь не зарегистрирован" };
      }
    }

    // Проверяем блокировку (только если viewerId есть)
    if (viewerId) {
      const blocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { userId: viewerId, blockedId: targetUserId },
            { userId: targetUserId, blockedId: viewerId },
          ],
        },
      });

      if (blocked) {
        return { success: false, error: "Профиль недоступен" };
      }
    }

    // Получаем пользователя с кастомизацией
    user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        nickname: true,
        tag: true,
        avatarUrl: true,
        bio: true,
        biography: true,
        discordId: true,
        discordUsername: true,
        onlineStatus: true,
        lastSeenAt: true,
        currentGameType: true,
        currentRoomCode: true,
        createdAt: true,
        xp: true,
        level: true,
        loginStreak: true,
        customization: {
          select: {
            frameAll: true,
            nicknameColorType: true,
            nicknameCustomColor: true,
            nicknameGradient: {
              select: { cssValue: true },
            },
            nicknameGlow: {
              select: { cssValue: true },
            },
            nicknameEffect: {
              select: { component: true, config: true },
            },
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Пользователь не найден" };
    }

    // Получаем статистику по играм
    const gameStats = await prisma.userGameStats.findMany({
      where: { userId: targetUserId },
      select: {
        gameType: true,
        gamesPlayed: true,
        gamesWon: true,
        timePlayed: true,
        customStats: true,
        lastPlayedAt: true,
      },
    });

    // Считаем общую статистику
    const totals = gameStats.reduce(
      (acc, stat) => ({
        gamesPlayed: acc.gamesPlayed + stat.gamesPlayed,
        gamesWon: acc.gamesWon + stat.gamesWon,
        timePlayed: acc.timePlayed + stat.timePlayed,
      }),
      { gamesPlayed: 0, gamesWon: 0, timePlayed: 0 }
    );

    // Получаем достижения пользователя (только разблокированные)
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: targetUserId },
      select: {
        id: true,
        level: true,
        unlockedAt: true,
        isFeatured: true,
        featuredOrder: true,
        achievement: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            icon: true,
            category: true,
            gameType: true,
            rarity: true,
            unlockCondition: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { featuredOrder: "asc" },
        { unlockedAt: "desc" },
      ],
    });

    // Избранные достижения (для витрины профиля)
    // Дедуплицируем по названию достижения, оставляя версию с лучшей редкостью/уровнем
    const RARITY_ORDER = { common: 0, rare: 1, epic: 2, heroic: 3, legendary: 4, secret: 5 };
    const featuredMap = new Map();
    const featuredRaw = achievements.filter((a) => a.isFeatured);
    
    featuredRaw.forEach((a) => {
      const name = a.achievement.name;
      const existing = featuredMap.get(name);
      if (!existing) {
        featuredMap.set(name, a);
      } else {
        // Сравниваем по редкости, затем по уровню
        const existingRarity = RARITY_ORDER[existing.achievement.rarity] || 0;
        const newRarity = RARITY_ORDER[a.achievement.rarity] || 0;
        if (newRarity > existingRarity || (newRarity === existingRarity && (a.level || 1) > (existing.level || 1))) {
          featuredMap.set(name, a);
        }
      }
    });
    const featuredAchievements = Array.from(featuredMap.values())
      .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0))
      .slice(0, 6);

    // Получаем информацию о клане целевого пользователя
    const targetClanMember = await prisma.clanMember.findFirst({
      where: { userId: targetUserId },
      include: {
        clan: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const targetClan = targetClanMember
      ? {
          id: targetClanMember.clan.id,
          name: targetClanMember.clan.name,
          avatarUrl: targetClanMember.clan.avatarUrl,
          role: targetClanMember.role,
        }
      : null;

    // Проверяем, может ли viewer пригласить target в свой клан
    let canInviteToClan = false;
    let viewerClanId = null;

    if (viewerId && viewerId !== targetUserId && !targetClan) {
      // Проверяем, является ли viewer лидером или модератором клана
      const viewerClanMember = await prisma.clanMember.findFirst({
        where: {
          userId: viewerId,
          role: { in: ["leader", "moderator"] },
        },
        select: { clanId: true, role: true },
      });

      if (viewerClanMember) {
        viewerClanId = viewerClanMember.clanId;
        // Проверяем, нет ли уже pending приглашения
        const existingInvite = await prisma.clanInvite.findFirst({
          where: {
            clanId: viewerClanMember.clanId,
            inviteeId: targetUserId,
            status: "pending",
          },
        });
        canInviteToClan = !existingInvite;
      }
    }

    // Проверяем, игнорирует ли viewer этого пользователя
    let isIgnored = false;
    if (viewerId && viewerId !== targetUserId) {
      const ignoredRecord = await prisma.ignoredUser.findUnique({
        where: {
          userId_ignoredId: { userId: viewerId, ignoredId: targetUserId },
        },
      });
      isIgnored = !!ignoredRecord;
    }

    // Получаем статус дружбы и общих друзей (только если viewerId есть)
    let friendshipStatus = { status: "none" };
    let mutualFriends = [];

    if (viewerId && viewerId !== targetUserId) {
      friendshipStatus = await getFriendshipStatus(prisma, viewerId, targetUserId);

      // Получаем общих друзей
      const viewerFriends = await prisma.friendship.findMany({
        where: { userId: viewerId },
        select: { friendId: true },
      });
      const viewerFriendIds = new Set(viewerFriends.map((f) => f.friendId));

      const targetFriends = await prisma.friendship.findMany({
        where: { userId: targetUserId },
        include: {
          friend: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              onlineStatus: true,
              customization: {
                select: { frameAll: true },
              },
            },
          },
        },
      });

      mutualFriends = targetFriends
        .filter((f) => viewerFriendIds.has(f.friendId))
        .map((f) => ({
          id: f.friend.id,
          nickname: f.friend.nickname,
          avatarUrl: f.friend.avatarUrl,
          onlineStatus: f.friend.onlineStatus,
          frameSlug: f.friend.customization?.frameAll,
        }))
        .slice(0, 10); // Максимум 10 общих друзей
    }

    // Формируем стиль никнейма
    const nicknameStyle = user.customization
      ? {
          nicknameColorType: user.customization.nicknameColorType,
          nicknameCustomColor: user.customization.nicknameCustomColor,
          nicknameGradient: user.customization.nicknameGradient,
          nicknameGlow: user.customization.nicknameGlow,
          nicknameEffect: user.customization.nicknameEffect,
        }
      : null;

    // Определяем любимую игру (по количеству сыгранных)
    const favoriteGame = gameStats.length > 0
      ? gameStats.reduce((prev, curr) =>
          curr.gamesPlayed > prev.gamesPlayed ? curr : prev
        )
      : null;

    return {
      success: true,
      profile: {
        // Базовая информация
        id: user.id,
        nickname: user.nickname,
        tag: user.tag,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        biography: user.biography,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        frameSlug: user.customization?.frameAll,
        nicknameStyle,

        // Статус
        onlineStatus: user.onlineStatus,
        lastSeenAt: user.lastSeenAt,
        currentGameType: user.currentGameType,
        currentRoomCode: user.currentRoomCode,

        // Уровень и XP
        level: user.level,
        xp: user.xp,
        loginStreak: user.loginStreak,

        // Дата регистрации
        memberSince: user.createdAt,

        // Статистика
        stats: {
          totals,
          byGame: gameStats.map(stat => ({
            gameType: stat.gameType,
            gamesPlayed: stat.gamesPlayed,
            gamesWon: stat.gamesWon,
            playTimeMinutes: Math.floor((stat.timePlayed || 0) / 60),
            lastPlayedAt: stat.lastPlayedAt,
          })),
          favoriteGame: favoriteGame?.gameType,
        },

        // Достижения
        achievements: {
          total: achievements.length,
          featured: featuredAchievements.map((a) => {
            const level = a.level || 1;
            
            // Вычисляем редкость на основе уровня для прогрессивных достижений
            let rarity = a.achievement.rarity;
            let condition = null;
            try {
              condition = JSON.parse(a.achievement.unlockCondition || "{}");
              if (condition.levels && Array.isArray(condition.levels)) {
                // Прогрессивное достижение - редкость зависит от уровня
                const rarityByLevel = ['common', 'rare', 'epic', 'heroic', 'legendary'];
                rarity = rarityByLevel[Math.min(level - 1, 4)] || 'common';
              }
            } catch (e) {}
            
            // Формируем динамическое описание
            let description = a.achievement.description || "";
            if (condition && condition.levels && level <= condition.levels.length) {
              const target = condition.levels[level - 1];
              // Заменяем плейсхолдеры в описании
              description = description.replace(/\{value\}/g, target);
              description = description.replace(/\{target\}/g, target);
            } else if (condition && condition.value) {
              description = description.replace(/\{value\}/g, condition.value);
              description = description.replace(/\{target\}/g, condition.value);
            }
            
            return {
              id: a.achievement.id,
              slug: a.achievement.slug,
              name: a.achievement.name,
              description: description,
              icon: a.achievement.icon,
              category: a.achievement.category,
              gameType: a.achievement.gameType,
              rarity: rarity,
              isProgressive: !!(condition && condition.levels),
              level: level,
              unlockedAt: a.unlockedAt,
            };
          }),
        },

        // Клан
        clan: targetClan,

        // Социальное
        friendshipStatus: friendshipStatus.status,
        friendshipRequestId: friendshipStatus.requestId,
        mutualFriends,
        mutualFriendsCount: mutualFriends.length,

        // Права текущего пользователя
        canInviteToClan,
        viewerClanId,
        isIgnored,
        
        // Флаг "свой профиль"
        isSelf: viewerId && viewerId === targetUserId,
      },
    };
  } catch (error) {
    console.error("[friends] getPublicProfile error:", error);
    return { success: false, error: "Ошибка при загрузке профиля" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Заявки в друзья
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  
  // Управление друзьями
  removeFriend,
  getFriends,
  
  // Входящие/исходящие заявки
  getPendingRequests,
  getSentRequests,
  getPendingRequestsCount,
  
  // Блокировка
  blockUser,
  unblockUser,
  getBlockedUsers,
  
  // Утилиты
  getFriendshipStatus,
  searchUsers,
  
  // Профиль
  getPublicProfile,
};
