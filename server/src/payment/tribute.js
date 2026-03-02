/**
 * Модуль интеграции с Трибьют (Tribute) API
 * 
 * Документация: https://tribute.tg/
 * 
 * Трибьют — платёжная система через Telegram
 */

const TRIBUTE_API_KEY = process.env.TRIBUTE_API_KEY;
const TRIBUTE_WEBHOOK_URL = process.env.TRIBUTE_WEBHOOK_URL;

// Базовый URL API Трибьют (уточнить по документации)
const TRIBUTE_API_BASE = 'https://api.tribute.tg';

/**
 * Проверить, настроен ли Трибьют
 */
function isTributeConfigured() {
  return Boolean(TRIBUTE_API_KEY && TRIBUTE_API_KEY !== 'your-tribute-api-key-here');
}

/**
 * Выполнить запрос к API Трибьют
 */
async function tributeRequest(endpoint, options = {}) {
  if (!isTributeConfigured()) {
    throw new Error('Трибьют не настроен. Добавьте TRIBUTE_API_KEY в .env');
  }

  const url = `${TRIBUTE_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TRIBUTE_API_KEY}`,
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Ошибка Трибьют API');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Создать платёж в Трибьют
 * 
 * @param {object} params
 * @param {string} params.paymentId - Внутренний ID платежа
 * @param {number} params.amount - Сумма в копейках (39900 = 399 ₽)
 * @param {string} params.currency - Валюта (RUB)
 * @param {string} params.description - Описание платежа
 * @param {string} params.successUrl - URL для редиректа после успешной оплаты
 * @param {string} params.cancelUrl - URL для редиректа при отмене
 * @returns {Promise<{paymentUrl: string, externalId: string}>}
 */
async function createTributePayment({
  paymentId,
  amount,
  currency = 'RUB',
  description,
  successUrl,
  cancelUrl
}) {
  if (!isTributeConfigured()) {
    console.warn('[Tribute] API ключ не настроен, возвращаем заглушку');
    return {
      paymentUrl: null,
      externalId: null,
      configured: false,
      message: 'Трибьют не настроен. Добавьте TRIBUTE_API_KEY в .env'
    };
  }

  try {
    // Формат запроса зависит от документации Трибьют
    // Это примерная структура, уточнить по реальной документации
    const payload = {
      amount: amount / 100, // Трибьют может принимать в рублях, не копейках
      currency,
      description,
      metadata: {
        internal_payment_id: paymentId
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      webhook_url: TRIBUTE_WEBHOOK_URL
    };

    console.log('[Tribute] Создаём платёж:', { paymentId, amount, description });

    const result = await tributeRequest('/v1/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log('[Tribute] Платёж создан:', result);

    return {
      paymentUrl: result.payment_url || result.url,
      externalId: result.id || result.payment_id,
      configured: true
    };
  } catch (error) {
    console.error('[Tribute] Ошибка создания платежа:', error);
    throw error;
  }
}

/**
 * Проверить статус платежа в Трибьют
 * 
 * @param {string} externalId - ID платежа в Трибьют
 * @returns {Promise<{status: string, paidAt: Date|null}>}
 */
async function getTributePaymentStatus(externalId) {
  if (!isTributeConfigured()) {
    throw new Error('Трибьют не настроен');
  }

  try {
    const result = await tributeRequest(`/v1/payments/${externalId}`, {
      method: 'GET'
    });

    return {
      status: result.status, // 'pending', 'succeeded', 'failed', 'cancelled'
      paidAt: result.paid_at ? new Date(result.paid_at) : null,
      paymentMethod: result.payment_method
    };
  } catch (error) {
    console.error('[Tribute] Ошибка получения статуса:', error);
    throw error;
  }
}

/**
 * Верифицировать webhook подпись от Трибьют
 * 
 * @param {string} payload - Тело запроса (raw)
 * @param {string} signature - Подпись из заголовка
 * @returns {boolean}
 */
function verifyTributeWebhook(payload, signature) {
  // TODO: Реализовать проверку подписи по документации Трибьют
  // Обычно это HMAC-SHA256 от payload с использованием секретного ключа
  
  if (!signature) {
    console.warn('[Tribute] Webhook без подписи');
    return false;
  }

  // Пока пропускаем все запросы (для разработки)
  // В продакшене ОБЯЗАТЕЛЬНО проверять подпись!
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Tribute] DEV MODE: пропускаем проверку подписи');
    return true;
  }

  // Пример проверки (уточнить по документации):
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', TRIBUTE_WEBHOOK_SECRET)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;

  return true; // TODO: заменить на реальную проверку
}

/**
 * Парсить webhook событие от Трибьют
 * 
 * @param {object} body - Тело webhook запроса
 * @returns {object} - Нормализованное событие
 */
function parseTributeWebhook(body) {
  // Формат зависит от документации Трибьют
  // Это примерная структура
  
  const event = body.event || body.type;
  const payment = body.data || body.payment || body;
  
  return {
    event, // 'payment.succeeded', 'payment.failed', etc.
    externalId: payment.id || payment.payment_id,
    internalPaymentId: payment.metadata?.internal_payment_id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    paidAt: payment.paid_at ? new Date(payment.paid_at) : null,
    paymentMethod: payment.payment_method,
    failureReason: payment.failure_reason || payment.error
  };
}

module.exports = {
  isTributeConfigured,
  createTributePayment,
  getTributePaymentStatus,
  verifyTributeWebhook,
  parseTributeWebhook
};
