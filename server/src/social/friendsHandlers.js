/**
 * Friends Socket.IO Handlers
 * Обработчики Socket.IO событий для управления друзьями
 */

const { PrismaClient } = require("@prisma/client");
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
  blockUser,
  unblockUser,
  getBlockedUsers,
  searchUsers,
  getFriendshipStatus,
} = require("./friends");
const { toPublicUser } = require("./userPublic");

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

const rateLimitMap = new Map();

/**
 * Проверка rate limit для Socket.IO событий
 * @param {string} userId - ID пользователя
 * @param {string} action - Действие (например, "friends:send")
 * @param {number} limit - Максимальное количество запросов
 * @param {number} windowMs - Временное окно в миллисекундах
 * @returns {boolean} - true если лимит не превышен
 */
function checkRateLimit(userId, action, limit = 10, windowMs = 60000) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  
  const timestamps = rateLimitMap.get(key);
  
  // Удаляем старые записи
  const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (recentTimestamps.length >= limit) {
    return false;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(key, recentTimestamps);
  
  return true;
}

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  const maxAge = 60000; // 1 минута
  
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(ts => now - ts < maxAge);
    if (recent.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recent);
    }
  }
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Логирование событий безопасности
 * @param {string} action - Действие
 * @param {string} userId - ID пользователя
 * @param {object} details - Детали события
 */
function auditLog(action, userId, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId,
    ...details,
  };
  
  // Логируем в консоль (в продакшене можно отправлять в БД или внешний сервис)
  console.log(`[AUDIT] ${timestamp} | ${action} | User: ${userId}`, details);
  
  // TODO: В будущем можно добавить запись в БД:
  // await prisma.auditLog.create({ data: logEntry });
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCKET.IO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Регистрация обработчиков Socket.IO для друзей
 * @param {Socket} socket - Socket.IO socket
 * @param {Server} io - Socket.IO server instance
 * @param {PrismaClient} prisma - Prisma client
 */
function registerFriendsHandlers(socket, io, prisma) {
  const getUserId = () => socket.data?.userId || socket.userId;
  
  /**
   * Вспомогательная функция для отправки события пользователю
   */
  const emitToUser = (targetUserId, event, data) => {
    const targetSockets = Array.from(io.sockets.sockets.values())
      .filter(s => (s.data?.userId || s.userId) === targetUserId);
    
    targetSockets.forEach(s => s.emit(event, data));
  };

  // ───────────────────────────────────────────────────────────────────────
  // social:friends:send - Отправить заявку в друзья
  // ───────────────────────────────────────────────────────────────────────
  socket.on("social:friends:send", async (payload, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не авторизован" });
      }
      return;
    }

    // Rate limiting: 10 заявок в минуту
    if (!checkRateLimit(userId, "friends:send", 10, 60000)) {
      auditLog("RATE_LIMIT_EXCEEDED", userId, { action: "friends:send" });
      if (typeof ack === "function") {
        ack({ success: false, error: "Слишком много запросов. Попробуйте позже." });
      }
      return;
    }

    const { receiverId, friendId } = payload || {};
    const targetId = receiverId || friendId;
    
    if (!targetId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не указан ID пользователя" });
      }
      return;
    }

    try {
      const result = await sendFriendRequest(prisma, userId, targetId);

      if (result.success && result.request) {
        // Audit log
        auditLog("FRIEND_REQUEST_SENT", userId, {
          receiverId: targetId,
          requestId: result.request.id,
        });

        // Уведомляем получателя о новой заявке
        emitToUser(targetId, "social:friends:request:received", {
          request: {
            id: result.request.id,
            sender: result.request.sender,
            createdAt: result.request.createdAt,
          },
        });
      }

      if (typeof ack === "function") {
        ack(result);
      }
    } catch (error) {
      console.error("[social:friends:send] Error:", error);
      if (typeof ack === "function") {
        ack({ success: false, error: "Ошибка при отправке заявки" });
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // social:friends:accept - Принять заявку в друзья
  // ───────────────────────────────────────────────────────────────────────
  socket.on("social:friends:accept", async (payload, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не авторизован" });
      }
      return;
    }

    // Rate limiting: 10 действий в минуту
    if (!checkRateLimit(userId, "friends:accept", 10, 60000)) {
      auditLog("RATE_LIMIT_EXCEEDED", userId, { action: "friends:accept" });
      if (typeof ack === "function") {
        ack({ success: false, error: "Слишком много запросов. Попробуйте позже." });
      }
      return;
    }

    const { requestId } = payload || {};
    
    if (!requestId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не указан ID заявки" });
      }
      return;
    }

    try {
      const result = await acceptFriendRequest(prisma, userId, requestId);

      if (result.success && result.friend) {
        // Audit log
        auditLog("FRIEND_REQUEST_ACCEPTED", userId, {
          requestId,
          friendId: result.friend.id,
        });

        // Получаем данные текущего пользователя для отправки другу
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

        // Уведомляем отправителя заявки о принятии
        emitToUser(result.friend.id, "social:friends:request:accepted", {
          friend: toPublicUser(currentUser),
        });

        // Обновляем статус дружбы для обоих пользователей
        emitToUser(result.friend.id, "social:friends:updated", {
          friendId: userId,
          status: "friends",
        });
        
        socket.emit("social:friends:updated", {
          friendId: result.friend.id,
          status: "friends",
        });
      }

      if (typeof ack === "function") {
        ack(result);
      }
    } catch (error) {
      console.error("[social:friends:accept] Error:", error);
      if (typeof ack === "function") {
        ack({ success: false, error: "Ошибка при принятии заявки" });
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // social:friends:reject - Отклонить заявку в друзья
  // ───────────────────────────────────────────────────────────────────────
  socket.on("social:friends:reject", async (payload, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не авторизован" });
      }
      return;
    }

    // Rate limiting: 10 действий в минуту
    if (!checkRateLimit(userId, "friends:reject", 10, 60000)) {
      auditLog("RATE_LIMIT_EXCEEDED", userId, { action: "friends:reject" });
      if (typeof ack === "function") {
        ack({ success: false, error: "Слишком много запросов. Попробуйте позже." });
      }
      return;
    }

    const { requestId } = payload || {};
    
    if (!requestId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не указан ID заявки" });
      }
      return;
    }

    try {
      // Получаем информацию о заявке перед отклонением
      const request = await prisma.friendRequest.findUnique({
        where: { id: requestId },
        select: { senderId: true, receiverId: true },
      });

      const result = await rejectFriendRequest(prisma, userId, requestId);

      if (result.success && request) {
        // Audit log
        auditLog("FRIEND_REQUEST_REJECTED", userId, {
          requestId,
          senderId: request.senderId,
        });

        // Уведомляем отправителя об отклонении
        emitToUser(request.senderId, "social:friends:updated", {
          friendId: userId,
          status: "none",
        });
      }

      if (typeof ack === "function") {
        ack(result);
      }
    } catch (error) {
      console.error("[social:friends:reject] Error:", error);
      if (typeof ack === "function") {
        ack({ success: false, error: "Ошибка при отклонении заявки" });
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // social:friends:cancel - Отменить отправленную заявку
  // ───────────────────────────────────────────────────────────────────────
  socket.on("social:friends:cancel", async (payload, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не авторизован" });
      }
      return;
    }

    // Rate limiting: 10 действий в минуту
    if (!checkRateLimit(userId, "friends:cancel", 10, 60000)) {
      auditLog("RATE_LIMIT_EXCEEDED", userId, { action: "friends:cancel" });
      if (typeof ack === "function") {
        ack({ success: false, error: "Слишком много запросов. Попробуйте позже." });
      }
      return;
    }

    const { requestId } = payload || {};
    
    if (!requestId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не указан ID заявки" });
      }
      return;
    }

    try {
      // Получаем информацию о заявке перед отменой
      const request = await prisma.friendRequest.findUnique({
        where: { id: requestId },
        select: { senderId: true, receiverId: true },
      });

      const result = await cancelFriendRequest(prisma, userId, requestId);

      if (result.success && request) {
        // Audit log
        auditLog("FRIEND_REQUEST_CANCELLED", userId, {
          requestId,
          receiverId: request.receiverId,
        });

        // Уведомляем получателя об отмене заявки
        emitToUser(request.receiverId, "social:friends:updated", {
          friendId: userId,
          status: "none",
        });
      }

      if (typeof ack === "function") {
        ack(result);
      }
    } catch (error) {
      console.error("[social:friends:cancel] Error:", error);
      if (typeof ack === "function") {
        ack({ success: false, error: "Ошибка при отмене заявки" });
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // social:friends:remove - Удалить из друзей
  // ───────────────────────────────────────────────────────────────────────
  socket.on("social:friends:remove", async (payload, ack) => {
    const userId = getUserId();
    if (!userId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не авторизован" });
      }
      return;
    }

    // Rate limiting: 10 действий в минуту
    if (!checkRateLimit(userId, "friends:remove", 10, 60000)) {
      auditLog("RATE_LIMIT_EXCEEDED", userId, { action: "friends:remove" });
      if (typeof ack === "function") {
        ack({ success: false, error: "Слишком много запросов. Попробуйте позже." });
      }
      return;
    }

    const { friendId } = payload || {};
    
    if (!friendId) {
      if (typeof ack === "function") {
        ack({ success: false, error: "Не указан ID друга" });
      }
      return;
    }

    try {
      const result = await removeFriend(prisma, userId, friendId);

      if (result.success) {
        // Audit log
        auditLog("FRIEND_REMOVED", userId, { friendId });

        // Уведомляем обоих пользователей об удалении из друзей
        emitToUser(friendId, "social:friends:removed", { byUserId: userId });
        emitToUser(friendId, "social:friends:updated", {
          friendId: userId,
          status: "none",
        });
        
        socket.emit("social:friends:updated", {
          friendId,
          status: "none",
        });
      }

      if (typeof ack === "function") {
        ack(result);
      }
    } catch (error) {
      console.error("[social:friends:remove] Error:", error);
      if (typeof ack === "function") {
        ack({ success: false, error: "Ошибка при удалении из друзей" });
      }
    }
  });
}

module.exports = {
  registerFriendsHandlers,
  checkRateLimit,
  auditLog,
};
