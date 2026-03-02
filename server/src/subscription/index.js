/**
 * Модуль управления подписками
 * 
 * Текущий режим: разовая покупка (бессрочный доступ)
 * Платёжная система: Трибьют
 */

import { PrismaClient } from '@prisma/client';
import { PAYMENT_CONFIG, PRICING, getPrice, hasAccess } from '../config/payment.js';

const prisma = new PrismaClient();

/**
 * Получить статус подписки пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<object>}
 */
export async function getSubscriptionStatus(userId) {
  if (!userId) {
    return { hasSubscription: false, subscription: null };
  }

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

  if (!subscription || subscription.status !== 'ACTIVE') {
    return { hasSubscription: false, subscription: null };
  }

  // Для разовой покупки — бессрочный доступ
  const isPermanent = subscription.billingPeriod === 'ONE_TIME';
  
  // Проверить истечение (для подписок)
  if (!isPermanent && subscription.endDate) {
    const now = new Date();
    if (subscription.endDate < now) {
      // Подписка истекла — обновить статус
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' }
      });
      return { hasSubscription: false, subscription: null };
    }
  }

  return {
    hasSubscription: true,
    subscription: {
      tier: subscription.tier,
      status: subscription.status,
      billingPeriod: subscription.billingPeriod,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      autoRenew: subscription.autoRenew,
      isPermanent,
      daysRemaining: isPermanent ? null : calculateDaysRemaining(subscription.endDate)
    }
  };
}

/**
 * Создать платёж для покупки подписки
 * @param {string} userId - ID пользователя
 * @param {string} tier - 'VIP' | 'PRO'
 * @returns {Promise<object>}
 */
export async function createPayment(userId, tier) {
  if (!userId) {
    throw new Error('Требуется авторизация');
  }

  if (!['VIP', 'PRO'].includes(tier)) {
    throw new Error('Неверный тариф');
  }

  // Проверить, нет ли уже активной подписки такого же или выше уровня
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId }
  });

  if (existingSubscription?.status === 'ACTIVE') {
    if (existingSubscription.tier === tier) {
      throw new Error('У вас уже есть активная подписка этого уровня');
    }
    if (existingSubscription.tier === 'PRO' && tier === 'VIP') {
      throw new Error('У вас уже есть подписка PRO, которая включает все преимущества VIP');
    }
  }

  // Получить цену
  const priceInfo = getPrice(tier, 'ONE_TIME');

  // Создать запись о платеже
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: priceInfo.amount,
      currency: priceInfo.currency,
      status: 'PENDING',
      tier,
      billingPeriod: 'ONE_TIME',
      description: `Покупка ${tier} (бессрочный доступ)`
    }
  });

  // TODO: Интеграция с Трибьют API
  // const tributeResponse = await createTributePayment(payment);
  // return { paymentId: payment.id, paymentUrl: tributeResponse.paymentUrl, ... };

  return {
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    tier: payment.tier,
    type: 'one_time',
    // paymentUrl будет добавлен после интеграции с Трибьют
    paymentUrl: null,
    message: 'Платёж создан. Интеграция с Трибьют в процессе.'
  };
}

/**
 * Обработать успешный платёж (вызывается из webhook)
 * @param {string} paymentId - ID платежа
 * @param {object} providerData - Данные от платёжной системы
 * @returns {Promise<object>}
 */
export async function handlePaymentSuccess(paymentId, providerData = {}) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw new Error('Платёж не найден');
  }

  if (payment.status === 'SUCCESS') {
    return { success: true, message: 'Платёж уже обработан' };
  }

  // Транзакция: обновить платёж + создать/обновить подписку
  const result = await prisma.$transaction(async (tx) => {
    // Обновить статус платежа
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        paidAt: new Date(),
        externalId: providerData.externalId,
        paymentMethod: providerData.paymentMethod
      }
    });

    // Создать или обновить подписку
    const subscription = await tx.subscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        tier: payment.tier,
        status: 'ACTIVE',
        billingPeriod: payment.billingPeriod,
        startDate: new Date(),
        endDate: null, // бессрочно для ONE_TIME
        autoRenew: false
      },
      update: {
        tier: payment.tier,
        status: 'ACTIVE',
        billingPeriod: payment.billingPeriod,
        startDate: new Date(),
        endDate: null,
        autoRenew: false,
        cancelledAt: null
      }
    });

    // Связать платёж с подпиской
    await tx.payment.update({
      where: { id: paymentId },
      data: { subscriptionId: subscription.id }
    });

    return subscription;
  });

  return {
    success: true,
    subscription: {
      tier: result.tier,
      status: result.status,
      isPermanent: true
    }
  };
}

/**
 * Обработать неудачный платёж
 * @param {string} paymentId - ID платежа
 * @param {string} reason - Причина ошибки
 * @returns {Promise<object>}
 */
export async function handlePaymentFailure(paymentId, reason) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      failureReason: reason
    }
  });

  return { success: false, message: reason };
}

/**
 * Получить историю платежей пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<array>}
 */
export async function getPaymentHistory(userId) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
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
}

/**
 * Отменить подписку (для будущего режима подписок)
 * @param {string} userId - ID пользователя
 * @returns {Promise<object>}
 */
export async function cancelSubscription(userId) {
  // В режиме разовой покупки отменять нечего
  if (!PAYMENT_CONFIG.ENABLE_SUBSCRIPTIONS) {
    throw new Error('Разовая покупка не может быть отменена');
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId }
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    throw new Error('Активная подписка не найдена');
  }

  if (subscription.billingPeriod === 'ONE_TIME') {
    throw new Error('Разовая покупка не может быть отменена');
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELLED',
      autoRenew: false,
      cancelledAt: new Date()
    }
  });

  return {
    success: true,
    message: `Автопродление отменено. Подписка будет активна до ${subscription.endDate?.toLocaleDateString('ru-RU')}`
  };
}

/**
 * Вспомогательная функция: вычислить оставшиеся дни
 */
function calculateDaysRemaining(endDate) {
  if (!endDate) return null;
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default {
  getSubscriptionStatus,
  createPayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  getPaymentHistory,
  cancelSubscription,
  hasAccess
};
