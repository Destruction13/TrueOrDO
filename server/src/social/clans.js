/**
 * Clans Management Module
 * Handles clan creation, management, membership, and chat
 */

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТЫ
// ═══════════════════════════════════════════════════════════════════════════

const { toPublicUser } = require("./userPublic");

const MAX_CLAN_NAME_LENGTH = 30;
const MIN_CLAN_NAME_LENGTH = 3;
const MAX_CLAN_DESCRIPTION_LENGTH = 500;
const MAX_CLAN_TAG_LENGTH = 5;
const MIN_CLAN_TAG_LENGTH = 2;

// Запрещённые слова (базовый список, можно расширить)
const BANNED_WORDS = [
  // Добавить запрещённые слова
];

// Разрешённые домены для ссылок
const ALLOWED_LINK_DOMAINS = [
  "discord.gg",
  "t.me",
  "vk.com",
  "youtube.com",
  "youtu.be",
  "twitch.tv",
];

// ═══════════════════════════════════════════════════════════════════════════
// МОДЕРАЦИЯ КОНТЕНТА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Проверить текст на запрещённые слова
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true если текст чистый
 */
function isContentClean(text) {
  if (!text) return true;
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some((word) => lowerText.includes(word.toLowerCase()));
}

/**
 * Проверить ссылки в тексте на разрешённые домены
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true если все ссылки разрешены
 */
function areLinksAllowed(text) {
  if (!text) return true;
  
  // Регулярка для поиска URL
  const urlRegex = /https?:\/\/([^\s\/]+)/gi;
  const matches = text.match(urlRegex);
  
  if (!matches) return true;
  
  for (const url of matches) {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      const isAllowed = ALLOWED_LINK_DOMAINS.some(
        (allowed) => domain === allowed || domain.endsWith("." + allowed)
      );
      if (!isAllowed) return false;
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * Валидация контента клана
 * @param {string} name - Название
 * @param {string} description - Описание
 * @param {string} tag - Тег
 * @returns {{valid: boolean, error?: string}}
 */
function validateClanContent(name, description, tag) {
  // Проверка названия
  if (!name || name.trim().length < MIN_CLAN_NAME_LENGTH) {
    return { valid: false, error: `Название должно быть минимум ${MIN_CLAN_NAME_LENGTH} символа` };
  }
  if (name.length > MAX_CLAN_NAME_LENGTH) {
    return { valid: false, error: `Название не должно превышать ${MAX_CLAN_NAME_LENGTH} символов` };
  }
  if (!isContentClean(name)) {
    return { valid: false, error: "Название содержит запрещённые слова" };
  }

  // Проверка тега
  if (tag) {
    if (tag.length < MIN_CLAN_TAG_LENGTH || tag.length > MAX_CLAN_TAG_LENGTH) {
      return { valid: false, error: `Тег должен быть от ${MIN_CLAN_TAG_LENGTH} до ${MAX_CLAN_TAG_LENGTH} символов` };
    }
    if (!/^[A-Za-z0-9]+$/.test(tag)) {
      return { valid: false, error: "Тег может содержать только буквы и цифры" };
    }
  }

  // Проверка описания
  if (description) {
    if (description.length > MAX_CLAN_DESCRIPTION_LENGTH) {
      return { valid: false, error: `Описание не должно превышать ${MAX_CLAN_DESCRIPTION_LENGTH} символов` };
    }
    if (!isContentClean(description)) {
      return { valid: false, error: "Описание содержит запрещённые слова" };
    }
    if (!areLinksAllowed(description)) {
      return { valid: false, error: "Описание содержит недопустимые ссылки" };
    }
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// СОЗДАНИЕ КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Создать клан (только для VIP/PRO пользователей)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID создателя
 * @param {object} data - Данные клана
 * @param {string} data.name - Название
 * @param {string} data.tag - Тег (короткое название)
 * @param {string} data.description - Описание
 * @param {string} data.type - Тип: "open" | "closed"
 * @returns {Promise<{success: boolean, clan?: object, error?: string}>}
 */
async function createClan(prisma, userId, data) {
  try {
    const { name, tag, description = "", type = "open" } = data;

    // Проверяем подписку пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        clanMemberships: {
          where: { role: "leader" },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Пользователь не найден" };
    }

    // Проверяем VIP/PRO статус
    const hasActiveSubscription =
      user.subscription &&
      user.subscription.status === "active" &&
      new Date(user.subscription.expiresAt) > new Date();

    if (!hasActiveSubscription) {
      return { success: false, error: "Создание клана доступно только для VIP/PRO пользователей" };
    }

    // Проверяем, не является ли уже лидером другого клана
    if (user.clanMemberships.length > 0) {
      return { success: false, error: "Вы уже являетесь лидером другого клана" };
    }

    // Валидация контента
    const validation = validateClanContent(name, description, tag);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Проверяем уникальность названия и тега
    const existing = await prisma.clan.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim() } },
          tag ? { tag: { equals: tag.toUpperCase() } } : {},
        ],
      },
    });

    if (existing) {
      return { success: false, error: "Клан с таким названием или тегом уже существует" };
    }

    // Создаём клан и добавляем создателя как лидера
    const clan = await prisma.$transaction(async (tx) => {
      const newClan = await tx.clan.create({
        data: {
          name: name.trim(),
          tag: tag ? tag.toUpperCase() : null,
          description: description.trim(),
          type,
          leaderId: userId,
        },
      });

      // Добавляем создателя как участника с ролью лидера
      await tx.clanMember.create({
        data: {
          clanId: newClan.id,
          userId,
          role: "leader",
        },
      });

      return newClan;
    });

    // Возвращаем клан с данными
    const fullClan = await prisma.clan.findUnique({
      where: { id: clan.id },
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return { success: true, clan: fullClan };
  } catch (error) {
    console.error("[clans] createClan error:", error);
    return { success: false, error: "Ошибка при создании клана" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// УДАЛЕНИЕ КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Удалить клан (только лидер)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} clanId - ID клана
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteClan(prisma, userId, clanId) {
  try {
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) {
      return { success: false, error: "Клан не найден" };
    }

    if (clan.leaderId !== userId) {
      return { success: false, error: "Только лидер может удалить клан" };
    }

    // Удаляем всё связанное с кланом
    await prisma.$transaction(async (tx) => {
      // Удаляем сообщения
      await tx.clanMessage.deleteMany({ where: { clanId } });
      // Удаляем заявки
      await tx.clanRequest.deleteMany({ where: { clanId } });
      // Удаляем жалобы
      await tx.clanReport.deleteMany({ where: { clanId } });
      // Удаляем участников
      await tx.clanMember.deleteMany({ where: { clanId } });
      // Удаляем клан
      await tx.clan.delete({ where: { id: clanId } });
    });

    return { success: true };
  } catch (error) {
    console.error("[clans] deleteClan error:", error);
    return { success: false, error: "Ошибка при удалении клана" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕДАКТИРОВАНИЕ КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Редактировать клан (лидер или модератор)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} clanId - ID клана
 * @param {object} data - Новые данные
 * @returns {Promise<{success: boolean, clan?: object, error?: string}>}
 */
async function updateClan(prisma, userId, clanId, data) {
  try {
    const { name, tag, description, type } = data;

    // Проверяем права
    const membership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId,
        role: { in: ["leader", "moderator"] },
      },
    });

    if (!membership) {
      return { success: false, error: "Нет прав для редактирования клана" };
    }

    // Только лидер может менять тип клана
    if (type !== undefined && membership.role !== "leader") {
      return { success: false, error: "Только лидер может изменить тип клана" };
    }

    // Валидация контента
    const validation = validateClanContent(
      name || "placeholder",
      description,
      tag
    );
    if (name && !validation.valid) {
      return { success: false, error: validation.error };
    }

    // Проверяем уникальность названия и тега (если меняются)
    if (name || tag) {
      const existing = await prisma.clan.findFirst({
        where: {
          id: { not: clanId },
          OR: [
            name ? { name: { equals: name.trim() } } : {},
            tag ? { tag: { equals: tag.toUpperCase() } } : {},
          ],
        },
      });

      if (existing) {
        return { success: false, error: "Клан с таким названием или тегом уже существует" };
      }
    }

    // Обновляем клан
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (tag !== undefined) updateData.tag = tag ? tag.toUpperCase() : null;
    if (description !== undefined) updateData.description = description.trim();
    if (type !== undefined) updateData.type = type;

    const clan = await prisma.clan.update({
      where: { id: clanId },
      data: updateData,
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return { success: true, clan };
  } catch (error) {
    console.error("[clans] updateClan error:", error);
    return { success: false, error: "Ошибка при обновлении клана" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАГРУЗКА АВАТАРА КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обновить URL аватара клана
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} clanId - ID клана
 * @param {string} avatarUrl - URL аватара
 * @returns {Promise<{success: boolean, clan?: object, error?: string}>}
 */
async function updateClanAvatar(prisma, userId, clanId, avatarUrl) {
  try {
    // Проверяем права (только лидер или модератор)
    const membership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId,
        role: { in: ["leader", "moderator"] },
      },
    });

    if (!membership) {
      return { success: false, error: "Нет прав для изменения аватара" };
    }

    const clan = await prisma.clan.update({
      where: { id: clanId },
      data: { avatarUrl },
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return { success: true, clan };
  } catch (error) {
    console.error("[clans] updateClanAvatar error:", error);
    return { success: false, error: "Ошибка при обновлении аватара" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ИНФОРМАЦИИ О КЛАНЕ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить информацию о клане
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} clanId - ID клана
 * @param {string} userId - ID запрашивающего пользователя (опционально)
 * @returns {Promise<{success: boolean, clan?: object, error?: string}>}
 */
async function getClan(prisma, clanId, userId = null) {
  try {
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        leader: {
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
        members: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                customization: { select: { frameAll: true } },
                onlineStatus: true,
                level: true,
              },
            },
          },
          orderBy: [
            { role: "asc" }, // leader first, then moderator, then member
            { joinedAt: "asc" },
          ],
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!clan) {
      return { success: false, error: "Клан не найден" };
    }

    // Определяем роль текущего пользователя
    let userRole = null;
    let userMembership = null;
    if (userId) {
      userMembership = clan.members.find((m) => m.userId === userId);
      userRole = userMembership?.role || null;
    }

    return {
      success: true,
      clan: {
        ...clan,
        userRole,
        isMember: !!userMembership,
      },
    };
  } catch (error) {
    console.error("[clans] getClan error:", error);
    return { success: false, error: "Ошибка при получении клана" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОИСК КЛАНОВ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Поиск кланов по названию
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} query - Поисковый запрос
 * @param {object} options - Опции
 * @param {number} options.limit - Лимит
 * @param {number} options.offset - Смещение
 * @returns {Promise<{success: boolean, clans?: Array, error?: string}>}
 */
async function searchClans(prisma, query, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    const whereClause = query
      ? {
          OR: [
            { name: { contains: query } },
            { tag: { contains: query } },
          ],
        }
      : {};

    const clans = await prisma.clan.findMany({
      where: whereClause,
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: [
        { members: { _count: "desc" } }, // Популярные сначала
        { createdAt: "desc" },
      ],
      skip: offset,
      take: limit,
    });

    return { success: true, clans };
  } catch (error) {
    console.error("[clans] searchClans error:", error);
    return { success: false, error: "Ошибка при поиске кланов" };
  }
}

/**
 * Получить популярные кланы
 * @param {PrismaClient} prisma - Prisma client
 * @param {number} limit - Лимит
 * @returns {Promise<{success: boolean, clans?: Array, error?: string}>}
 */
async function getPopularClans(prisma, limit = 10) {
  try {
    const clans = await prisma.clan.findMany({
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        members: { _count: "desc" },
      },
      take: limit,
    });

    return { success: true, clans };
  } catch (error) {
    console.error("[clans] getPopularClans error:", error);
    return { success: false, error: "Ошибка при получении кланов" };
  }
}

/**
 * Получить клан пользователя
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<{success: boolean, clan?: object, membership?: object, error?: string}>}
 */
async function getUserClan(prisma, userId) {
  try {
    const membership = await prisma.clanMember.findFirst({
      where: { userId },
      include: {
        clan: {
          include: {
            leader: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return { success: true, clan: null, membership: null };
    }

    return {
      success: true,
      clan: membership.clan,
      membership: {
        role: membership.role,
        joinedAt: membership.joinedAt,
      },
    };
  } catch (error) {
    console.error("[clans] getUserClan error:", error);
    return { success: false, error: "Ошибка при получении клана" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ВСТУПЛЕНИЕ В КЛАН
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Вступить в открытый клан
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} clanId - ID клана
 * @returns {Promise<{success: boolean, membership?: object, error?: string}>}
 */
async function joinClan(prisma, userId, clanId) {
  try {
    // Проверяем, не состоит ли уже в клане
    const existingMembership = await prisma.clanMember.findFirst({
      where: { userId },
    });

    if (existingMembership) {
      return { success: false, error: "Вы уже состоите в клане" };
    }

    // Получаем клан
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) {
      return { success: false, error: "Клан не найден" };
    }

    // Проверяем тип клана
    if (clan.type === "closed") {
      return { success: false, error: "Это закрытый клан. Подайте заявку на вступление." };
    }

    // Создаём членство
    const membership = await prisma.clanMember.create({
      data: {
        clanId,
        userId,
        role: "member",
      },
      include: {
        clan: {
          select: {
            id: true,
            name: true,
            tag: true,
            avatarUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    return { success: true, membership };
  } catch (error) {
    console.error("[clans] joinClan error:", error);
    return { success: false, error: "Ошибка при вступлении в клан" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОКИНУТЬ КЛАН
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Покинуть клан
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function leaveClan(prisma, userId) {
  try {
    const membership = await prisma.clanMember.findFirst({
      where: { userId },
      include: {
        clan: true,
      },
    });

    if (!membership) {
      return { success: false, error: "Вы не состоите в клане" };
    }

    // Лидер не может просто покинуть клан
    if (membership.role === "leader") {
      return { success: false, error: "Лидер не может покинуть клан. Передайте лидерство или удалите клан." };
    }

    await prisma.clanMember.delete({
      where: { id: membership.id },
    });

    return { success: true, clanId: membership.clanId };
  } catch (error) {
    console.error("[clans] leaveClan error:", error);
    return { success: false, error: "Ошибка при выходе из клана" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ИСКЛЮЧИТЬ УЧАСТНИКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Исключить участника из клана (лидер или модератор)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} actorId - ID исключающего
 * @param {string} targetUserId - ID исключаемого
 * @param {string} clanId - ID клана
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function kickMember(prisma, actorId, targetUserId, clanId) {
  try {
    if (actorId === targetUserId) {
      return { success: false, error: "Нельзя исключить себя" };
    }

    // Проверяем права исключающего
    const actorMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: actorId,
        role: { in: ["leader", "moderator"] },
      },
    });

    if (!actorMembership) {
      return { success: false, error: "Нет прав для исключения участников" };
    }

    // Получаем членство исключаемого
    const targetMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      return { success: false, error: "Участник не найден в клане" };
    }

    // Модератор не может исключить лидера или другого модератора
    if (actorMembership.role === "moderator") {
      if (targetMembership.role === "leader" || targetMembership.role === "moderator") {
        return { success: false, error: "Нет прав для исключения этого участника" };
      }
    }

    // Лидера нельзя исключить
    if (targetMembership.role === "leader") {
      return { success: false, error: "Нельзя исключить лидера клана" };
    }

    await prisma.clanMember.delete({
      where: { id: targetMembership.id },
    });

    return { success: true, kickedUserId: targetUserId };
  } catch (error) {
    console.error("[clans] kickMember error:", error);
    return { success: false, error: "Ошибка при исключении участника" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧИТЬ СПИСОК УЧАСТНИКОВ КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список участников клана
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} clanId - ID клана
 * @param {object} options - Опции
 * @param {number} options.limit - Лимит
 * @param {number} options.offset - Смещение
 * @returns {Promise<{success: boolean, members?: Array, total?: number, error?: string}>}
 */
async function getClanMembers(prisma, clanId, options = {}) {
  try {
    const { limit = 50, offset = 0 } = options;

    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) {
      return { success: false, error: "Клан не найден" };
    }

    const [members, total] = await Promise.all([
      prisma.clanMember.findMany({
        where: { clanId },
        include: {
          user: {
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
              level: true,
            },
          },
        },
        orderBy: [
          { role: "asc" }, // leader, moderator, member
          { joinedAt: "asc" },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.clanMember.count({ where: { clanId } }),
    ]);

    // Форматируем ответ
    const formattedMembers = members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));

    const mapped = formattedMembers.map((m) => ({ ...m, user: toPublicUser(m.user) }));
    return { success: true, members: mapped, total };
  } catch (error) {
    console.error("[clans] getClanMembers error:", error);
    return { success: false, error: "Ошибка при получении участников" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОДАТЬ ЗАЯВКУ В ЗАКРЫТЫЙ КЛАН
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Подать заявку в закрытый клан
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} clanId - ID клана
 * @param {string} message - Сообщение в заявке (опционально)
 * @returns {Promise<{success: boolean, request?: object, error?: string}>}
 */
async function requestJoinClan(prisma, userId, clanId, message = "") {
  try {
    // Проверяем, не состоит ли уже в клане
    const existingMembership = await prisma.clanMember.findFirst({
      where: { userId },
    });

    if (existingMembership) {
      return { success: false, error: "Вы уже состоите в клане" };
    }

    // Получаем клан
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) {
      return { success: false, error: "Клан не найден" };
    }

    // Если клан открытый — сразу вступаем
    if (clan.type === "open") {
      return joinClan(prisma, userId, clanId);
    }

    // Проверяем, нет ли уже pending заявки
    const existingRequest = await prisma.clanRequest.findFirst({
      where: {
        clanId,
        userId,
        status: "pending",
      },
    });

    if (existingRequest) {
      return { success: false, error: "Вы уже подали заявку в этот клан" };
    }

    // Создаём заявку
    const request = await prisma.clanRequest.create({
      data: {
        clanId,
        userId,
        message: message.trim().slice(0, 500),
        status: "pending",
      },
      include: {
        user: {
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
            level: true,
          },
        },
        clan: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
    });

    request.user = toPublicUser(request.user);
    return { success: true, request };
  } catch (error) {
    console.error("[clans] requestJoinClan error:", error);
    return { success: false, error: "Ошибка при подаче заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОДОБРИТЬ ЗАЯВКУ В КЛАН
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Одобрить заявку в клан (лидер или модератор)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} actorId - ID одобряющего
 * @param {string} requestId - ID заявки
 * @returns {Promise<{success: boolean, membership?: object, error?: string}>}
 */
async function acceptClanRequest(prisma, actorId, requestId) {
  try {
    // Получаем заявку
    const request = await prisma.clanRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!request) {
      return { success: false, error: "Заявка не найдена" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Заявка уже обработана" };
    }

    // Проверяем права одобряющего
    const actorMembership = await prisma.clanMember.findFirst({
      where: {
        clanId: request.clanId,
        userId: actorId,
        role: { in: ["leader", "moderator"] },
      },
    });

    if (!actorMembership) {
      return { success: false, error: "Нет прав для одобрения заявок" };
    }

    // Проверяем, не состоит ли пользователь уже в каком-то клане
    const existingMembership = await prisma.clanMember.findFirst({
      where: { userId: request.userId },
    });

    if (existingMembership) {
      // Отклоняем заявку, т.к. пользователь уже в клане
      await prisma.clanRequest.update({
        where: { id: requestId },
        data: { status: "rejected" },
      });
      return { success: false, error: "Пользователь уже состоит в другом клане" };
    }

    // Транзакция: обновляем заявку и создаём членство
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем статус заявки
      await tx.clanRequest.update({
        where: { id: requestId },
        data: { status: "accepted" },
      });

      // Создаём членство
      const membership = await tx.clanMember.create({
        data: {
          clanId: request.clanId,
          userId: request.userId,
          role: "member",
        },
        include: {
          user: {
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
          clan: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
        },
      });

      return membership;
    });

    result.user = toPublicUser(result.user);
    return { success: true, membership: result, userId: request.userId, clanId: request.clanId };
  } catch (error) {
    console.error("[clans] acceptClanRequest error:", error);
    return { success: false, error: "Ошибка при одобрении заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТКЛОНИТЬ ЗАЯВКУ В КЛАН
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отклонить заявку в клан (лидер или модератор)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} actorId - ID отклоняющего
 * @param {string} requestId - ID заявки
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function rejectClanRequest(prisma, actorId, requestId) {
  try {
    // Получаем заявку
    const request = await prisma.clanRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Заявка не найдена" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Заявка уже обработана" };
    }

    // Проверяем права отклоняющего
    const actorMembership = await prisma.clanMember.findFirst({
      where: {
        clanId: request.clanId,
        userId: actorId,
        role: { in: ["leader", "moderator"] },
      },
    });

    if (!actorMembership) {
      return { success: false, error: "Нет прав для отклонения заявок" };
    }

    await prisma.clanRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
    });

    return { success: true, userId: request.userId, clanId: request.clanId };
  } catch (error) {
    console.error("[clans] rejectClanRequest error:", error);
    return { success: false, error: "Ошибка при отклонении заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТМЕНИТЬ СВОЮ ЗАЯВКУ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отменить свою заявку в клан
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @param {string} requestId - ID заявки
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function cancelClanRequest(prisma, userId, requestId) {
  try {
    const request = await prisma.clanRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Заявка не найдена" };
    }

    if (request.userId !== userId) {
      return { success: false, error: "Нет прав для отмены этой заявки" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Заявка уже обработана" };
    }

    await prisma.clanRequest.delete({
      where: { id: requestId },
    });

    return { success: true };
  } catch (error) {
    console.error("[clans] cancelClanRequest error:", error);
    return { success: false, error: "Ошибка при отмене заявки" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧИТЬ СПИСОК ЗАЯВОК В КЛАН
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список заявок в клан (для лидера/модератора)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID запрашивающего
 * @param {string} clanId - ID клана
 * @param {object} options - Опции
 * @param {string} options.status - Фильтр по статусу: "pending" | "accepted" | "rejected" | "all"
 * @returns {Promise<{success: boolean, requests?: Array, error?: string}>}
 */
async function getClanRequests(prisma, userId, clanId, options = {}) {
  try {
    const { status = "pending" } = options;

    // Проверяем права
    const membership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId,
        role: { in: ["leader", "moderator"] },
      },
    });

    if (!membership) {
      return { success: false, error: "Нет прав для просмотра заявок" };
    }

    const whereClause = { clanId };
    if (status !== "all") {
      whereClause.status = status;
    }

    const requests = await prisma.clanRequest.findMany({
      where: whereClause,
      include: {
        user: {
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
            level: true,
            onlineStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, requests };
  } catch (error) {
    console.error("[clans] getClanRequests error:", error);
    return { success: false, error: "Ошибка при получении заявок" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧИТЬ СВОИ ИСХОДЯЩИЕ ЗАЯВКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить свои исходящие заявки в кланы
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID пользователя
 * @returns {Promise<{success: boolean, requests?: Array, error?: string}>}
 */
async function getMyClanRequests(prisma, userId) {
  try {
    const requests = await prisma.clanRequest.findMany({
      where: {
        userId,
        status: "pending",
      },
      include: {
        clan: {
          select: {
            id: true,
            name: true,
            tag: true,
            avatarUrl: true,
            type: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, requests };
  } catch (error) {
    console.error("[clans] getMyClanRequests error:", error);
    return { success: false, error: "Ошибка при получении заявок" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// НАЗНАЧИТЬ МОДЕРАТОРА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Назначить участника модератором (только лидер, требуется VIP/PRO)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} leaderId - ID лидера
 * @param {string} targetUserId - ID назначаемого
 * @param {string} clanId - ID клана
 * @returns {Promise<{success: boolean, member?: object, error?: string}>}
 */
async function promoteMember(prisma, leaderId, targetUserId, clanId) {
  try {
    if (leaderId === targetUserId) {
      return { success: false, error: "Нельзя назначить себя модератором" };
    }

    // Проверяем, что действующий — лидер
    const leaderMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: leaderId,
        role: "leader",
      },
    });

    if (!leaderMembership) {
      return { success: false, error: "Только лидер может назначать модераторов" };
    }

    // Проверяем VIP/PRO статус лидера
    const leader = await prisma.user.findUnique({
      where: { id: leaderId },
      include: { subscription: true },
    });

    const hasActiveSubscription =
      leader?.subscription &&
      leader.subscription.status === "active" &&
      new Date(leader.subscription.expiresAt) > new Date();

    if (!hasActiveSubscription) {
      return { success: false, error: "Назначение модераторов доступно только VIP/PRO пользователям" };
    }

    // Получаем членство назначаемого
    const targetMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      return { success: false, error: "Участник не найден в клане" };
    }

    if (targetMembership.role === "moderator") {
      return { success: false, error: "Участник уже является модератором" };
    }

    if (targetMembership.role === "leader") {
      return { success: false, error: "Нельзя изменить роль лидера" };
    }

    // Обновляем роль
    const updatedMember = await prisma.clanMember.update({
      where: { id: targetMembership.id },
      data: { role: "moderator" },
      include: {
        user: {
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

    updatedMember.user = toPublicUser(updatedMember.user);

    return { success: true, member: updatedMember };
  } catch (error) {
    console.error("[clans] promoteMember error:", error);
    return { success: false, error: "Ошибка при назначении модератора" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// СНЯТЬ МОДЕРАТОРА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Снять модератора (только лидер)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} leaderId - ID лидера
 * @param {string} targetUserId - ID снимаемого
 * @param {string} clanId - ID клана
 * @returns {Promise<{success: boolean, member?: object, error?: string}>}
 */
async function demoteMember(prisma, leaderId, targetUserId, clanId) {
  try {
    if (leaderId === targetUserId) {
      return { success: false, error: "Нельзя снять себя" };
    }

    // Проверяем, что действующий — лидер
    const leaderMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: leaderId,
        role: "leader",
      },
    });

    if (!leaderMembership) {
      return { success: false, error: "Только лидер может снимать модераторов" };
    }

    // Получаем членство снимаемого
    const targetMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      return { success: false, error: "Участник не найден в клане" };
    }

    if (targetMembership.role !== "moderator") {
      return { success: false, error: "Участник не является модератором" };
    }

    // Обновляем роль
    const updatedMember = await prisma.clanMember.update({
      where: { id: targetMembership.id },
      data: { role: "member" },
      include: {
        user: {
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

    updatedMember.user = toPublicUser(updatedMember.user);

    return { success: true, member: updatedMember };
  } catch (error) {
    console.error("[clans] demoteMember error:", error);
    return { success: false, error: "Ошибка при снятии модератора" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕДАТЬ ЛИДЕРСТВО
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Передать лидерство другому участнику (только лидер)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} currentLeaderId - ID текущего лидера
 * @param {string} newLeaderId - ID нового лидера
 * @param {string} clanId - ID клана
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function transferLeadership(prisma, currentLeaderId, newLeaderId, clanId) {
  try {
    if (currentLeaderId === newLeaderId) {
      return { success: false, error: "Нельзя передать лидерство себе" };
    }

    // Проверяем, что действующий — лидер
    const currentLeaderMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: currentLeaderId,
        role: "leader",
      },
    });

    if (!currentLeaderMembership) {
      return { success: false, error: "Только лидер может передать лидерство" };
    }

    // Получаем членство нового лидера
    const newLeaderMembership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId: newLeaderId,
      },
    });

    if (!newLeaderMembership) {
      return { success: false, error: "Участник не найден в клане" };
    }

    // Транзакция: меняем роли
    await prisma.$transaction(async (tx) => {
      // Текущий лидер становится участником
      await tx.clanMember.update({
        where: { id: currentLeaderMembership.id },
        data: { role: "member" },
      });

      // Новый лидер получает роль лидера
      await tx.clanMember.update({
        where: { id: newLeaderMembership.id },
        data: { role: "leader" },
      });

      // Обновляем leaderId в клане
      await tx.clan.update({
        where: { id: clanId },
        data: { leaderId: newLeaderId },
      });
    });

    return { success: true, newLeaderId };
  } catch (error) {
    console.error("[clans] transferLeadership error:", error);
    return { success: false, error: "Ошибка при передаче лидерства" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТПРАВИТЬ СООБЩЕНИЕ В ЧАТ КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отправить сообщение в чат клана
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID отправителя
 * @param {string} clanId - ID клана
 * @param {string} content - Текст сообщения
 * @returns {Promise<{success: boolean, message?: object, error?: string}>}
 */
async function sendClanMessage(prisma, userId, clanId, content) {
  try {
    // Валидация
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Сообщение не может быть пустым" };
    }

    if (content.length > 1000) {
      return { success: false, error: "Сообщение слишком длинное (макс. 1000 символов)" };
    }

    // Проверяем членство в клане
    const membership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId,
      },
    });

    if (!membership) {
      return { success: false, error: "Вы не являетесь участником клана" };
    }

    // Проверяем контент на запрещённые слова
    if (!isContentClean(content)) {
      return { success: false, error: "Сообщение содержит запрещённые слова" };
    }

    // Проверяем ссылки
    if (!areLinksAllowed(content)) {
      return { success: false, error: "Сообщение содержит недопустимые ссылки" };
    }

    // Создаём сообщение
    const message = await prisma.clanMessage.create({
      data: {
        clanId,
        senderId: userId,
        content: content.trim(),
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

    // Добавляем роль отправителя
    const messageWithRole = {
      ...message,
      senderRole: membership.role,
    };

    messageWithRole.sender = toPublicUser(messageWithRole.sender);
    return { success: true, message: messageWithRole };
  } catch (error) {
    console.error("[clans] sendClanMessage error:", error);
    return { success: false, error: "Ошибка при отправке сообщения" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧИТЬ ИСТОРИЮ СООБЩЕНИЙ КЛАНА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить историю сообщений клана
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID запрашивающего
 * @param {string} clanId - ID клана
 * @param {object} options - Опции пагинации
 * @param {number} options.limit - Количество сообщений (по умолчанию 50)
 * @param {string} options.before - ID сообщения, до которого загружать
 * @param {string} options.after - ID сообщения, после которого загружать
 * @returns {Promise<{success: boolean, messages?: Array, hasMore?: boolean, error?: string}>}
 */
async function getClanMessages(prisma, userId, clanId, options = {}) {
  try {
    const { limit = 50, before = null, after = null } = options;

    // Проверяем членство в клане
    const membership = await prisma.clanMember.findFirst({
      where: {
        clanId,
        userId,
      },
    });

    if (!membership) {
      return { success: false, error: "Вы не являетесь участником клана" };
    }

    // Формируем условия запроса
    const whereClause = { clanId };

    if (before) {
      const beforeMsg = await prisma.clanMessage.findUnique({ where: { id: before } });
      if (beforeMsg) {
        whereClause.createdAt = { lt: beforeMsg.createdAt };
      }
    } else if (after) {
      const afterMsg = await prisma.clanMessage.findUnique({ where: { id: after } });
      if (afterMsg) {
        whereClause.createdAt = { gt: afterMsg.createdAt };
      }
    }

    // Получаем сообщения (+1 для проверки hasMore)
    const messages = await prisma.clanMessage.findMany({
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

    // Получаем роли отправителей
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const memberships = await prisma.clanMember.findMany({
      where: {
        clanId,
        userId: { in: senderIds },
      },
      select: {
        userId: true,
        role: true,
      },
    });

    const roleMap = new Map(memberships.map((m) => [m.userId, m.role]));

    // Добавляем роли к сообщениям
    const messagesWithRoles = messages.map((m) => ({
      ...m,
      senderRole: roleMap.get(m.senderId) || "member",
    }));

    const mapped = messagesWithRoles.map((m) => ({ ...m, sender: toPublicUser(m.sender) }));
    return { success: true, messages: mapped, hasMore };
  } catch (error) {
    console.error("[clans] getClanMessages error:", error);
    return { success: false, error: "Ошибка при загрузке сообщений" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// УДАЛИТЬ СООБЩЕНИЕ В КЛАНЕ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Удалить сообщение в клане (автор, модератор или лидер)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - ID удаляющего
 * @param {string} messageId - ID сообщения
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteClanMessage(prisma, userId, messageId) {
  try {
    const message = await prisma.clanMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return { success: false, error: "Сообщение не найдено" };
    }

    // Проверяем права
    const membership = await prisma.clanMember.findFirst({
      where: {
        clanId: message.clanId,
        userId,
      },
    });

    if (!membership) {
      return { success: false, error: "Вы не являетесь участником клана" };
    }

    // Автор может удалить своё сообщение, модератор/лидер — любое
    const canDelete =
      message.senderId === userId ||
      membership.role === "leader" ||
      membership.role === "moderator";

    if (!canDelete) {
      return { success: false, error: "Нет прав для удаления сообщения" };
    }

    await prisma.clanMessage.delete({
      where: { id: messageId },
    });

    return { success: true, clanId: message.clanId };
  } catch (error) {
    console.error("[clans] deleteClanMessage error:", error);
    return { success: false, error: "Ошибка при удалении сообщения" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОТПРАВИТЬ ЖАЛОБУ НА КЛАН
// ═══════════════════════════════════════════════════════════════════════════

// Причины жалоб
const REPORT_REASONS = [
  "inappropriate_name",      // Неприемлемое название
  "inappropriate_content",   // Неприемлемый контент (описание/аватар)
  "spam",                    // Спам
  "harassment",              // Оскорбления/травля
  "hate_speech",             // Разжигание ненависти
  "scam",                    // Мошенничество
  "other",                   // Другое
];

/**
 * Отправить жалобу на клан
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} reporterId - ID жалующегося
 * @param {string} clanId - ID клана
 * @param {string} reason - Причина жалобы
 * @param {string} description - Описание жалобы
 * @returns {Promise<{success: boolean, report?: object, error?: string}>}
 */
async function reportClan(prisma, reporterId, clanId, reason, description = "") {
  try {
    // Валидация причины
    if (!REPORT_REASONS.includes(reason)) {
      return { success: false, error: "Недопустимая причина жалобы" };
    }

    // Проверяем, существует ли клан
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) {
      return { success: false, error: "Клан не найден" };
    }

    // Нельзя жаловаться на свой клан
    const membership = await prisma.clanMember.findFirst({
      where: { clanId, userId: reporterId },
    });

    if (membership) {
      return { success: false, error: "Нельзя отправить жалобу на свой клан" };
    }

    // Проверяем, не отправлял ли уже жалобу на этот клан (в течение 24 часов)
    const recentReport = await prisma.clanReport.findFirst({
      where: {
        clanId,
        reporterId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentReport) {
      return { success: false, error: "Вы уже отправляли жалобу на этот клан. Попробуйте позже." };
    }

    // Создаём жалобу
    const report = await prisma.clanReport.create({
      data: {
        clanId,
        reporterId,
        reason,
        description: description.trim().slice(0, 1000),
        status: "pending",
      },
      include: {
        clan: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
        reporter: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    return { success: true, report };
  } catch (error) {
    console.error("[clans] reportClan error:", error);
    return { success: false, error: "Ошибка при отправке жалобы" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОЛУЧИТЬ ЖАЛОБЫ НА КЛАНЫ (ДЛЯ АДМИНОВ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить жалобы на кланы (для администраторов)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} adminId - ID администратора
 * @param {object} options - Опции
 * @param {string} options.status - Фильтр по статусу: "pending" | "reviewed" | "resolved" | "dismissed" | "all"
 * @param {string} options.clanId - Фильтр по клану
 * @param {number} options.limit - Лимит
 * @param {number} options.offset - Смещение
 * @returns {Promise<{success: boolean, reports?: Array, total?: number, error?: string}>}
 */
async function getClanReports(prisma, adminId, options = {}) {
  try {
    const { status = "pending", clanId = null, limit = 50, offset = 0 } = options;

    // Проверяем права администратора
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Недостаточно прав" };
    }

    // Формируем условия запроса
    const whereClause = {};
    if (status !== "all") {
      whereClause.status = status;
    }
    if (clanId) {
      whereClause.clanId = clanId;
    }

    const [reports, total] = await Promise.all([
      prisma.clanReport.findMany({
        where: whereClause,
        include: {
          clan: {
            select: {
              id: true,
              name: true,
              tag: true,
              avatarUrl: true,
              description: true,
              leaderId: true,
              leader: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
            },
          },
          reporter: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.clanReport.count({ where: whereClause }),
    ]);

    return { success: true, reports, total };
  } catch (error) {
    console.error("[clans] getClanReports error:", error);
    return { success: false, error: "Ошибка при получении жалоб" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОБРАБОТАТЬ ЖАЛОБУ (ДЛЯ АДМИНОВ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обработать жалобу на клан (для администраторов)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} adminId - ID администратора
 * @param {string} reportId - ID жалобы
 * @param {string} newStatus - Новый статус: "reviewed" | "resolved" | "dismissed"
 * @param {string} adminNotes - Заметки администратора
 * @returns {Promise<{success: boolean, report?: object, error?: string}>}
 */
async function resolveReport(prisma, adminId, reportId, newStatus, adminNotes = "") {
  try {
    // Проверяем права администратора
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Недостаточно прав" };
    }

    const validStatuses = ["reviewed", "resolved", "dismissed"];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: "Недопустимый статус" };
    }

    const report = await prisma.clanReport.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        // Можно добавить поле adminNotes в схему если нужно
      },
      include: {
        clan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { success: true, report };
  } catch (error) {
    console.error("[clans] resolveReport error:", error);
    return { success: false, error: "Ошибка при обработке жалобы" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Управление кланом
  createClan,
  deleteClan,
  updateClan,
  updateClanAvatar,
  
  // Получение информации
  getClan,
  getUserClan,
  searchClans,
  getPopularClans,
  
  // Участники
  joinClan,
  leaveClan,
  kickMember,
  getClanMembers,
  
  // Заявки
  requestJoinClan,
  acceptClanRequest,
  rejectClanRequest,
  cancelClanRequest,
  getClanRequests,
  getMyClanRequests,
  
  // Роли
  promoteMember,
  demoteMember,
  transferLeadership,
  
  // Сообщения
  sendClanMessage,
  getClanMessages,
  deleteClanMessage,
  
  // Жалобы
  reportClan,
  getClanReports,
  resolveReport,
  REPORT_REASONS,
  
  // Валидация
  validateClanContent,
  isContentClean,
  areLinksAllowed,
  
  // Константы
  MAX_CLAN_NAME_LENGTH,
  MAX_CLAN_DESCRIPTION_LENGTH,
  MAX_CLAN_TAG_LENGTH,
  ALLOWED_LINK_DOMAINS,
};
