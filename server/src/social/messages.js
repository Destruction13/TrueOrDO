/**
 * Messages Module
 * Handles private messaging between users
 */

const { toPublicUser } = require("./userPublic");

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ИЛИ СОЗДАНИЕ ДИАЛОГА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить или создать диалог между двумя пользователями
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId1 - ID первого пользователя
 * @param {string} userId2 - ID второго пользователя
 * @returns {Promise<{success: boolean, conversation?: object, error?: string}>}
 */
async function getOrCreateConversation(prisma, userId1, userId2) {
  try {
    // Проверяем блокировку
    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { userId: userId1, blockedId: userId2 },
          { userId: userId2, blockedId: userId1 },
        ],
      },
    });

    if (blocked) {
      return { success: false, error: "Невозможно начать диалог с этим пользователем" };
    }

    // Ищем существующий диалог
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId1, participant2Id: userId2 },
          { participant1Id: userId2, participant2Id: userId1 },
        ],
      },
      include: {
        participant1: {
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
          },
        },
        participant2: {
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
          },
        },
      },
    });

    // Если нет — создаём
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: userId1,
          participant2Id: userId2,
        },
        include: {
          participant1: {
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
            },
          },
          participant2: {
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
            },
          },
        },
      });
    }

    // frameSlug compatibility
    conversation.participant1 = toPublicUser(conversation.participant1);
    conversation.participant2 = toPublicUser(conversation.participant2);

    return { success: true, conversation };
  } catch (error) {
    console.error("[messages] getOrCreateConversation error:", error);
    return { success: false, error: "Ошибка при создании диалога" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТПРАВКА СООБЩЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отправить сообщение
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} senderId - ID отправителя
 * @param {string} receiverId - ID получателя
 * @param {string} content - Текст сообщения
 * @param {string} type - Тип сообщения: "text" | "game_invite" | "system"
 * @param {object} metadata - Дополнительные данные (для game_invite)
 * @returns {Promise<{success: boolean, message?: object, error?: string}>}
 */
async function sendMessage(prisma, senderId, receiverId, content, type = "text", metadata = null) {
  try {
    // Валидация
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Сообщение не может быть пустым" };
    }

    if (content.length > 2000) {
      return { success: false, error: "Сообщение слишком длинное (макс. 2000 символов)" };
    }

    if (senderId === receiverId) {
      return { success: false, error: "Нельзя отправить сообщение самому себе" };
    }

    // Проверяем блокировку
    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { userId: senderId, blockedId: receiverId },
          { userId: receiverId, blockedId: senderId },
        ],
      },
    });

    if (blocked) {
      // Проверяем, кто заблокировал
      if (blocked.userId === receiverId) {
        return { success: false, error: "Пользователь внёс тебя в чёрный список. Ты не можешь ему написать" };
      } else {
        return { success: false, error: "Невозможно отправить сообщение заблокированному пользователю" };
      }
    }

    // Получаем или создаём диалог
    const convResult = await getOrCreateConversation(prisma, senderId, receiverId);
    if (!convResult.success) {
      return convResult;
    }

    // Создаём сообщение и обновляем диалог в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Вычисляем следующий seq для данного диалога
      const maxSeqResult = await tx.message.aggregate({
        where: { conversationId: convResult.conversation.id },
        _max: { seq: true },
      });
      const nextSeq = (maxSeqResult._max.seq || 0) + 1;

      // Создаём сообщение с seq
      const message = await tx.message.create({
        data: {
          conversationId: convResult.conversation.id,
          senderId,
          content: content.trim(),
          type,
          metadata: metadata ? JSON.stringify(metadata) : null,
          seq: nextSeq,
        },
        include: {
          sender: {
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
            },
          },
        },
      });

      // Обновляем lastMessageAt в диалоге
      await tx.conversation.update({
        where: { id: convResult.conversation.id },
        data: { lastMessageAt: new Date() },
      });

      return message;
    });

    return {
      success: true,
      message: {
        ...result,
        sender: toPublicUser(result.sender),
        metadata: result.metadata ? JSON.parse(result.metadata) : null,
      },
      conversationId: convResult.conversation.id,
      receiverId,
    };
  } catch (error) {
    console.error("[messages] sendMessage error:", error);
    return { success: false, error: "Ошибка при отправке сообщения" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ИСТОРИИ СООБЩЕНИЙ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить историю сообщений диалога
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID текущего пользователя
 * @param {string} conversationId - ID диалога
 * @param {object} options - Опции пагинации
 * @param {number} options.limit - Количество сообщений (по умолчанию 50)
 * @param {string} options.before - ID сообщения, до которого загружать (для пагинации)
 * @param {string} options.after - ID сообщения, после которого загружать
 * @returns {Promise<{success: boolean, messages?: Array, hasMore?: boolean, error?: string}>}
 */
async function getMessages(prisma, userId, conversationId, options = {}) {
  try {
    const { limit = 50, before = null, after = null } = options;

    // Проверяем, что пользователь участник диалога
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Диалог не найден" };
    }

    // Получаем ID собеседника
    const partnerId = conversation.participant1Id === userId 
      ? conversation.participant2Id 
      : conversation.participant1Id;

    // Проверяем, игнорируется ли собеседник
    const isPartnerIgnored = await prisma.ignoredUser.findUnique({
      where: { userId_ignoredId: { userId, ignoredId: partnerId } }
    });

    // Формируем условия запроса
    const whereClause = {
      conversationId,
    };

    if (before) {
      const beforeMsg = await prisma.message.findUnique({ where: { id: before } });
      if (beforeMsg) {
        whereClause.createdAt = { lt: beforeMsg.createdAt };
      }
    } else if (after) {
      const afterMsg = await prisma.message.findUnique({ where: { id: after } });
      if (afterMsg) {
        whereClause.createdAt = { gt: afterMsg.createdAt };
      }
    }

    // Получаем сообщения (+1 для проверки hasMore)
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    // Переворачиваем для правильного порядка (старые сверху)
    messages.reverse();

    // Парсим metadata и добавляем флаг игнорирования
    const parsedMessages = messages.map((m) => ({
      ...m,
      sender: toPublicUser(m.sender),
      metadata: m.metadata ? JSON.parse(m.metadata) : null,
      isIgnored: isPartnerIgnored && m.senderId === partnerId,
    }));

    return { success: true, messages: parsedMessages, hasMore };
  } catch (error) {
    console.error("[messages] getMessages error:", error);
    return { success: false, error: "Ошибка при загрузке сообщений" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ СООБЩЕНИЙ ПО ID СОБЕСЕДНИКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить историю сообщений с конкретным пользователем
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID текущего пользователя
 * @param {string} partnerId - ID собеседника
 * @param {object} options - Опции пагинации
 * @returns {Promise<{success: boolean, messages?: Array, conversationId?: string, hasMore?: boolean, error?: string}>}
 */
async function getMessagesByPartner(prisma, userId, partnerId, options = {}) {
  try {
    // Ищем диалог
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: partnerId },
          { participant1Id: partnerId, participant2Id: userId },
        ],
      },
    });

    if (!conversation) {
      return { success: true, messages: [], conversationId: null, hasMore: false, isBlocked: false };
    }

    // Проверяем блокировку
    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { userId: userId, blockedId: partnerId },
          { userId: partnerId, blockedId: userId },
        ],
      },
    });

    const isBlocked = !!blocked;

    const result = await getMessages(prisma, userId, conversation.id, options);
    return { ...result, conversationId: conversation.id, isBlocked };
  } catch (error) {
    console.error("[messages] getMessagesByPartner error:", error);
    return { success: false, error: "Ошибка при загрузке сообщений" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТМЕТИТЬ СООБЩЕНИЯ КАК ПРОЧИТАННЫЕ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отметить сообщения как прочитанные
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID текущего пользователя
 * @param {string} conversationId - ID диалога
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
async function markAsRead(prisma, userId, conversationId) {
  try {
    // Проверяем, что пользователь участник диалога
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Диалог не найден" };
    }

    // Отмечаем непрочитанные сообщения от собеседника как прочитанные
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("[messages] markAsRead error:", error);
    return { success: false, error: "Ошибка при отметке сообщений" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ СПИСКА ДИАЛОГОВ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список диалогов пользователя
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {object} options - Опции
 * @param {number} options.limit - Количество диалогов
 * @param {number} options.offset - Смещение для пагинации
 * @returns {Promise<{success: boolean, conversations?: Array, error?: string}>}
 */
async function getConversations(prisma, userId, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    // Получаем список игнорируемых пользователей
    const ignoredUsers = await prisma.ignoredUser.findMany({
      where: { userId },
      select: { ignoredId: true }
    });
    const ignoredIds = ignoredUsers.map(i => i.ignoredId);

    // Получаем диалоги с последним сообщением
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        participant1: {
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
            lastSeenAt: true,
          },
        },
        participant2: {
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
            lastSeenAt: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip: offset,
      take: limit,
    });

    // Подсчитываем непрочитанные сообщения для каждого диалога
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        // Определяем собеседника
        const partner = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        
        // Проверяем, игнорируется ли собеседник
        const isIgnored = ignoredIds.includes(partner.id);

        // Проверяем, заблокирован ли собеседник
        const blocked = await prisma.blockedUser.findFirst({
          where: {
            OR: [
              { userId: userId, blockedId: partner.id },
              { userId: partner.id, blockedId: userId },
            ],
          },
        });
        const isBlocked = !!blocked;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });

        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          partner: toPublicUser(partner),
          lastMessage: lastMessage
            ? {
              id: lastMessage.id,
              content: lastMessage.content,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              senderNickname: lastMessage.sender.nickname,
              createdAt: lastMessage.createdAt,
              isOwn: lastMessage.senderId === userId,
            }
            : null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
          isIgnored,
          isBlocked,
        };
      })
    );

    return { success: true, conversations: conversationsWithUnread };
  } catch (error) {
    console.error("[messages] getConversations error:", error);
    return { success: false, error: "Ошибка при получении диалогов" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ КОЛИЧЕСТВА НЕПРОЧИТАННЫХ СООБЩЕНИЙ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить общее количество непрочитанных сообщений
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<number>}
 */
async function getUnreadCount(prisma, userId) {
  try {
    // Получаем список игнорируемых пользователей
    const ignoredUsers = await prisma.ignoredUser.findMany({
      where: { userId },
      select: { ignoredId: true }
    });
    const ignoredIds = ignoredUsers.map(i => i.ignoredId);

    // Получаем ID всех диалогов пользователя
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      select: { 
        id: true,
        participant1Id: true,
        participant2Id: true
      },
    });

    // Фильтруем диалоги, исключая игнорируемых пользователей
    const conversationIds = conversations
      .filter(conv => {
        const partnerId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        return !ignoredIds.includes(partnerId);
      })
      .map(c => c.id);

    if (conversationIds.length === 0) {
      return 0;
    }

    // Считаем непрочитанные сообщения
    const count = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
    });

    return count;
  } catch (error) {
    console.error("[messages] getUnreadCount error:", error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// УДАЛЕНИЕ ДИАЛОГА (ДЛЯ ПОЛЬЗОВАТЕЛЯ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Удалить диалог (скрыть для пользователя, не удаляя данные)
 * Примечание: в текущей реализации просто очищаем диалог
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} conversationId - ID диалога
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteConversation(prisma, userId, conversationId) {
  try {
    // Проверяем, что пользователь участник диалога
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Диалог не найден" };
    }

    // Удаляем все сообщения и диалог
    await prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({
        where: { conversationId },
      });

      await tx.conversation.delete({
        where: { id: conversationId },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("[messages] deleteConversation error:", error);
    return { success: false, error: "Ошибка при удалении диалога" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТПРАВКА ПРИГЛАШЕНИЯ В ИГРУ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отправить приглашение в игру через сообщение
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} senderId - ID отправителя
 * @param {string} receiverId - ID получателя
 * @param {string} gameType - Тип игры (tod/alias/emotional/codenames)
 * @param {string} roomCode - Код комнаты
 * @returns {Promise<{success: boolean, message?: object, error?: string}>}
 */
async function sendGameInvite(prisma, senderId, receiverId, gameType, roomCode) {
  const gameNames = {
    tod: "Правда или Действие",
    alias: "Alias",
    emotional: "Крокодил Эмоций",
    codenames: "Codenames",
  };

  const gameName = gameNames[gameType] || gameType;
  const content = `Приглашает тебя в игру "${gameName}"`;

  return sendMessage(prisma, senderId, receiverId, content, "game_invite", {
    gameType,
    roomCode,
    gameName,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ЧАСТИЧНОЕ ПРОЧТЕНИЕ (TELEGRAM-LIKE PARTIAL READ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отметить сообщения как прочитанные до указанного seq (partial read)
 * @param {PrismaClient} prisma
 * @param {string} userId - ID читателя
 * @param {string} conversationId - ID диалога
 * @param {number} seq - seq-курсор (прочитано до этого включительно)
 * @returns {Promise<{success, conversationId, unreadCount, cursorApplied, count, error?}>}
 */
async function readUpTo(prisma, userId, conversationId, seq) {
  try {
    if (!conversationId || typeof seq !== "number" || seq < 0) {
      return { success: false, error: "conversationId и корректный seq обязательны" };
    }

    // Проверяем участие пользователя в диалоге
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Диалог не найден" };
    }

    // Определяем, какое поле readSeq обновлять
    const isParticipant1 = conversation.participant1Id === userId;
    const currentReadSeq = isParticipant1
      ? conversation.readSeqParticipant1
      : conversation.readSeqParticipant2;

    // Удалено раннее прекращение, чтобы старые сообщения (seq=0) также помечались прочитанными
    // Транзакция: помечаем сообщения прочитанными + обновляем readSeq
    const result = await prisma.$transaction(async (tx) => {
      // Помечаем readAt для входящих сообщений с seq <= seq и readAt IS NULL
      const updated = await tx.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          seq: { lte: seq },
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      // Обновляем readSeq в Conversation только если курсор вырос
      if (seq > currentReadSeq) {
        const updateData = isParticipant1
          ? { readSeqParticipant1: seq }
          : { readSeqParticipant2: seq };

        await tx.conversation.update({
          where: { id: conversationId },
          data: updateData,
        });
      }

      // Считаем оставшиеся непрочитанные
      const unreadCount = await tx.message.count({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
        },
      });

      return { count: updated.count, unreadCount };
    });

    return {
      success: true,
      conversationId,
      unreadCount: result.unreadCount,
      cursorApplied: Math.max(seq, currentReadSeq),
      count: result.count,
    };
  } catch (error) {
    console.error("[messages] readUpTo error:", error);
    return { success: false, error: "Ошибка при частичном прочтении" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Диалоги
  getOrCreateConversation,
  getConversations,
  deleteConversation,

  // Сообщения
  sendMessage,
  getMessages,
  getMessagesByPartner,
  markAsRead,
  readUpTo,
  getUnreadCount,

  // Приглашения в игру
  sendGameInvite,
};
"" 
