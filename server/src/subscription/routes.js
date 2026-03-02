const express = require("express");
const rateLimit = require("express-rate-limit");
const { 
  isTributeConfigured, 
  createTributePayment, 
  verifyTributeWebhook,
  parseTributeWebhook 
} = require("../payment/tribute");

/**
 * API роуты для подписок и платежей
 * 
 * Текущий режим: разовая покупка
 * Платёжная система: Трибьют
 */

// Rate limiter для платежей
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20, // 20 запросов
  message: { error: "Слишком много запросов. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false
});

// Map для отслеживания сокетов авторизованных пользователей
// userId -> Set<socketId>
const userSockets = new Map();

/**
 * Зарегистрировать сокет пользователя (вызывается из index.js при подключении)
 */
function registerUserSocket(userId, socketId) {
  if (!userId) return;
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
}

/**
 * Удалить сокет пользователя (вызывается при отключении)
 */
function unregisterUserSocket(userId, socketId) {
  if (!userId || !userSockets.has(userId)) return;
  userSockets.get(userId).delete(socketId);
  if (userSockets.get(userId).size === 0) {
    userSockets.delete(userId);
  }
}

/**
 * Отправить событие пользователю по userId
 */
function emitToUser(io, userId, event, data) {
  if (!io || !userId) return;
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }
}

/**
 * Создать роутер для подписок
 * @param {PrismaClient} prisma - Prisma клиент
 * @param {Server} io - Socket.IO сервер
 * @returns {Router}
 */
function createSubscriptionRouter(prisma, io) {
  const router = express.Router();

  // Middleware: проверка авторизации
  const requireAuth = (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    next();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ПУБЛИЧНЫЕ ЭНДПОИНТЫ
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/subscription/plans
   * Получить список доступных тарифов и цен
   */
  router.get("/plans", (req, res) => {
    // Цены в копейках
    const plans = {
      mode: "one_time", // Текущий режим
      currency: "RUB",
      tiers: [
        {
          id: "VIP",
          name: "VIP",
          price: 39900, // 399 ₽
          priceFormatted: "399 ₽",
          description: "Эксклюзивные рамки, эффекты никнейма, без рекламы",
          features: [
            "Эксклюзивные рамки аватара",
            "Анимированные эффекты никнейма",
            "Отключение рекламы",
            "Особые цвета никнейма",
            "Расширенная статистика"
          ],
          isPermanent: true
        },
        {
          id: "PRO",
          name: "PRO",
          price: 69900, // 699 ₽
          priceFormatted: "699 ₽",
          description: "Все преимущества VIP + создание комнат и приоритет",
          features: [
            "Все преимущества VIP",
            "Создание приватных комнат",
            'Роль "Хост" в играх',
            "Приоритетный подбор игроков",
            "Кастомные эмодзи",
            "Особый значок в лидербордах",
            "Приоритетная поддержка"
          ],
          isPermanent: true,
          isRecommended: true
        }
      ]
    };

    res.json(plans);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ЗАЩИЩЁННЫЕ ЭНДПОИНТЫ (требуют авторизации)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/subscription/status
   * Получить текущий статус подписки пользователя
   */
  router.get("/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: {
          id: true,
          tier: true,
          status: true,
          billingPeriod: true,
          startDate: true,
          endDate: true,
          autoRenew: true,
          createdAt: true
        }
      });

      if (!subscription || subscription.status !== "ACTIVE") {
        return res.json({ hasSubscription: false, subscription: null });
      }

      // Для разовой покупки — бессрочный доступ
      const isPermanent = subscription.billingPeriod === "ONE_TIME";

      // Проверить истечение (для подписок)
      if (!isPermanent && subscription.endDate) {
        const now = new Date();
        if (subscription.endDate < now) {
          // Подписка истекла — обновить статус
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "EXPIRED" }
          });
          return res.json({ hasSubscription: false, subscription: null });
        }
      }

      res.json({
        hasSubscription: true,
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          billingPeriod: subscription.billingPeriod,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
          isPermanent
        }
      });
    } catch (error) {
      console.error("[Subscription] Ошибка получения статуса:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  /**
   * POST /api/payments/create
   * Создать платёж для покупки подписки
   */
  router.post("/payments/create", requireAuth, paymentLimiter, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { tier } = req.body;

      // Валидация тарифа
      if (!["VIP", "PRO"].includes(tier)) {
        return res.status(400).json({ error: "Неверный тариф" });
      }

      // Проверить существующую подписку
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (existingSubscription?.status === "ACTIVE") {
        if (existingSubscription.tier === tier) {
          return res.status(400).json({ 
            error: "У вас уже есть активная подписка этого уровня" 
          });
        }
        if (existingSubscription.tier === "PRO" && tier === "VIP") {
          return res.status(400).json({ 
            error: "У вас уже есть подписка PRO, которая включает все преимущества VIP" 
          });
        }
      }

      // Получить цену
      const prices = { VIP: 39900, PRO: 69900 };
      const amount = prices[tier];

      // Формируем URLs для редиректа
      const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
      const successUrl = `${baseUrl}/pricing?payment=success`;
      const cancelUrl = `${baseUrl}/pricing?payment=cancelled`;

      // Создать запись о платеже
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency: "RUB",
          status: "PENDING",
          tier,
          billingPeriod: "ONE_TIME",
          description: `Покупка ${tier} (бессрочный доступ)`
        }
      });

      // Интеграция с Трибьют
      let paymentUrl = null;
      let tributeConfigured = false;

      try {
        const tributeResult = await createTributePayment({
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          description: payment.description,
          successUrl,
          cancelUrl
        });

        paymentUrl = tributeResult.paymentUrl;
        tributeConfigured = tributeResult.configured;

        // Сохраняем externalId от Трибьют
        if (tributeResult.externalId) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { externalId: tributeResult.externalId }
          });
        }
      } catch (tributeError) {
        console.error("[Payment] Ошибка Трибьют:", tributeError);
        // Не прерываем — возвращаем платёж без URL
      }

      res.json({
        paymentId: payment.id,
        amount: payment.amount,
        amountFormatted: `${amount / 100} ₽`,
        currency: payment.currency,
        tier: payment.tier,
        type: "one_time",
        paymentUrl,
        configured: tributeConfigured,
        status: paymentUrl ? "ready" : "pending_configuration",
        message: paymentUrl 
          ? "Перейдите по ссылке для оплаты" 
          : "Платёж создан. Настройте TRIBUTE_API_KEY в .env для получения ссылки на оплату."
      });
    } catch (error) {
      console.error("[Payment] Ошибка создания платежа:", error);
      res.status(500).json({ error: "Ошибка создания платежа" });
    }
  });

  /**
   * POST /api/payments/webhook
   * Webhook от платёжной системы (Трибьют)
   */
  router.post("/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const rawBody = req.body.toString();
      const signature = req.headers['x-tribute-signature'] || req.headers['x-webhook-signature'];

      // Проверка подписи от Трибьют
      if (!verifyTributeWebhook(rawBody, signature)) {
        console.warn("[Webhook] Неверная подпись");
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Парсим webhook через модуль Трибьют
      const payload = JSON.parse(rawBody);
      const webhookData = parseTributeWebhook(payload);

      console.log("[Webhook] Получен webhook:", webhookData.event, webhookData.internalPaymentId);

      // Находим платёж по внутреннему ID или external ID
      let payment = null;
      
      if (webhookData.internalPaymentId) {
        payment = await prisma.payment.findUnique({
          where: { id: webhookData.internalPaymentId }
        });
      }
      
      if (!payment && webhookData.externalId) {
        payment = await prisma.payment.findFirst({
          where: { externalId: webhookData.externalId }
        });
      }

      if (!payment) {
        console.warn("[Webhook] Платёж не найден:", webhookData);
        return res.status(404).json({ error: "Платёж не найден" });
      }

      // Обработка успешного платежа
      if (webhookData.event === "payment.succeeded" || 
          webhookData.event === "payment.success" ||
          webhookData.status === "succeeded") {
        
        if (payment.status === "SUCCESS") {
          return res.json({ success: true, message: "Платёж уже обработан" });
        }

        // Транзакция: обновить платёж + создать подписку
        await prisma.$transaction(async (tx) => {
          // Обновить платёж
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCESS",
              paidAt: webhookData.paidAt || new Date(),
              externalId: webhookData.externalId,
              paymentMethod: webhookData.paymentMethod
            }
          });

          // Создать/обновить подписку
          const subscription = await tx.subscription.upsert({
            where: { userId: payment.userId },
            create: {
              userId: payment.userId,
              tier: payment.tier,
              status: "ACTIVE",
              billingPeriod: "ONE_TIME",
              startDate: new Date(),
              endDate: null,
              autoRenew: false
            },
            update: {
              tier: payment.tier,
              status: "ACTIVE",
              billingPeriod: "ONE_TIME",
              startDate: new Date(),
              endDate: null,
              autoRenew: false,
              cancelledAt: null
            }
          });

          // Связать платёж с подпиской
          await tx.payment.update({
            where: { id: payment.id },
            data: { subscriptionId: subscription.id }
          });
        });

        console.log("[Webhook] Подписка активирована для пользователя:", payment.userId);

        // Отправляем real-time уведомление пользователю
        emitToUser(io, payment.userId, "subscription:activated", {
          tier: payment.tier,
          status: "ACTIVE",
          isPermanent: true
        });
      }

      // Обработка неудачного платежа
      if (webhookData.event === "payment.failed" || 
          webhookData.event === "payment.cancelled" ||
          webhookData.status === "failed" ||
          webhookData.status === "cancelled") {
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureReason: webhookData.failureReason || "Ошибка оплаты"
          }
        });

        console.log("[Webhook] Платёж не удался:", payment.id, webhookData.failureReason);

        // Уведомляем пользователя об ошибке
        emitToUser(io, payment.userId, "subscription:payment_failed", {
          paymentId: payment.id,
          tier: payment.tier,
          reason: webhookData.failureReason
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Webhook] Ошибка обработки:", error);
      res.status(500).json({ error: "Ошибка обработки webhook" });
    }
  });

  /**
   * GET /api/payments/history
   * История платежей пользователя
   */
  router.get("/payments/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;

      const payments = await prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          tier: true,
          billingPeriod: true,
          paidAt: true,
          createdAt: true
        }
      });

      res.json({
        payments: payments.map(p => ({
          ...p,
          amountFormatted: `${p.amount / 100} ₽`
        }))
      });
    } catch (error) {
      console.error("[Payment] Ошибка получения истории:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  /**
   * POST /api/subscription/cancel
   * Отменить подписку (для будущего режима подписок)
   */
  router.post("/cancel", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;

      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription || subscription.status !== "ACTIVE") {
        return res.status(404).json({ error: "Активная подписка не найдена" });
      }

      // В режиме разовой покупки отменять нечего
      if (subscription.billingPeriod === "ONE_TIME") {
        return res.status(400).json({ 
          error: "Разовая покупка не может быть отменена. Это бессрочный доступ." 
        });
      }

      // Для будущего режима подписок
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: "CANCELLED",
          autoRenew: false,
          cancelledAt: new Date()
        }
      });

      res.json({
        success: true,
        message: `Автопродление отменено. Подписка будет активна до ${subscription.endDate?.toLocaleDateString("ru-RU")}`
      });
    } catch (error) {
      console.error("[Subscription] Ошибка отмены:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  return router;
}

module.exports = { 
  createSubscriptionRouter,
  registerUserSocket,
  unregisterUserSocket
};
