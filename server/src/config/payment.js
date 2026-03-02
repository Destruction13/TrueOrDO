/**
 * Конфигурация платёжной системы
 * 
 * Текущий режим: разовая покупка (ONE_TIME)
 * Платёжная система: Трибьют
 */

export const PAYMENT_CONFIG = {
  // Провайдер платежей
  provider: 'tribute',
  
  // Режим работы: 'one_time' | 'subscription'
  // Подписки подготовлены, но пока отключены
  mode: 'one_time',
  
  // Флаг для включения подписок в будущем
  ENABLE_SUBSCRIPTIONS: false,
  
  // API настройки Трибьют (из env)
  tribute: {
    apiUrl: process.env.TRIBUTE_API_URL || 'https://api.tribute.tg',
    apiKey: process.env.TRIBUTE_API_KEY,
    shopId: process.env.TRIBUTE_SHOP_ID,
    webhookSecret: process.env.TRIBUTE_WEBHOOK_SECRET
  }
};

/**
 * Конфигурация цен
 */
export const PRICING = {
  // Текущий режим
  mode: 'one_time', // 'one_time' | 'subscription'
  
  // Валюта
  currency: 'RUB',
  
  // Разовые покупки (активно)
  oneTime: {
    VIP: 39900,  // 399 ₽ в копейках
    PRO: 69900   // 699 ₽ в копейках
  },
  
  // Подписки (подготовлено, но отключено)
  subscription: {
    VIP: {
      monthly: 19900,   // 199 ₽
      yearly: 178800    // 1788 ₽ (149 ₽/мес)
    },
    PRO: {
      monthly: 39900,   // 399 ₽
      yearly: 358800    // 3588 ₽ (299 ₽/мес)
    }
  }
};

/**
 * Описания тарифов для UI и платежей
 */
export const TIER_INFO = {
  VIP: {
    name: 'VIP',
    description: 'Эксклюзивные рамки, эффекты никнейма, без рекламы',
    features: [
      'Эксклюзивные рамки аватара',
      'Анимированные эффекты никнейма',
      'Отключение рекламы',
      'Особые цвета никнейма',
      'Расширенная статистика'
    ]
  },
  PRO: {
    name: 'PRO',
    description: 'Все преимущества VIP + создание комнат и приоритет',
    features: [
      'Все преимущества VIP',
      'Создание приватных комнат',
      'Роль "Хост" в играх',
      'Приоритетный подбор игроков',
      'Кастомные эмодзи',
      'Особый значок в лидербордах',
      'Приоритетная поддержка'
    ]
  }
};

/**
 * Получить цену для тарифа
 * @param {string} tier - 'VIP' | 'PRO'
 * @param {string} billingPeriod - 'ONE_TIME' | 'MONTHLY' | 'YEARLY'
 * @returns {{ amount: number, type: string }}
 */
export function getPrice(tier, billingPeriod = 'ONE_TIME') {
  const { mode, oneTime, subscription } = PRICING;
  
  // Если режим разовой покупки или запрошена разовая покупка
  if (mode === 'one_time' || billingPeriod === 'ONE_TIME') {
    return { 
      amount: oneTime[tier], 
      type: 'one_time',
      currency: PRICING.currency
    };
  }
  
  // Для будущей подписочной модели
  const period = billingPeriod === 'YEARLY' ? 'yearly' : 'monthly';
  return {
    amount: subscription[tier][period],
    type: 'subscription',
    period: billingPeriod,
    currency: PRICING.currency
  };
}

/**
 * Форматировать цену для отображения
 * @param {number} amountInKopeks - Сумма в копейках
 * @returns {string} - Форматированная строка (например, "399 ₽")
 */
export function formatPrice(amountInKopeks) {
  const rubles = amountInKopeks / 100;
  return `${rubles.toLocaleString('ru-RU')} ₽`;
}

/**
 * Проверить, имеет ли пользователь доступ к функции по тарифу
 * @param {string} userTier - Текущий тариф пользователя (null | 'VIP' | 'PRO')
 * @param {string} requiredTier - Требуемый тариф ('VIP' | 'PRO')
 * @returns {boolean}
 */
export function hasAccess(userTier, requiredTier) {
  if (!userTier) return false;
  if (requiredTier === 'VIP') return userTier === 'VIP' || userTier === 'PRO';
  if (requiredTier === 'PRO') return userTier === 'PRO';
  return false;
}

export default {
  PAYMENT_CONFIG,
  PRICING,
  TIER_INFO,
  getPrice,
  formatPrice,
  hasAccess
};
