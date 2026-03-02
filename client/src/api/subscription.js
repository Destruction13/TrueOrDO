/**
 * API клиент для подписок и платежей
 * Все запросы делаются с credentials: "include" для передачи cookies
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}/api/subscription${endpoint}`;
  
  const config = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    const error = new Error("Нет соединения с сервером. Проверьте интернет.");
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  // Пробуем распарсить JSON
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (parseError) {
      const error = new Error("Ошибка сервера. Попробуйте позже.");
      error.status = response.status;
      error.isParseError = true;
      throw error;
    }
  } else {
    const error = new Error(
      response.status === 502 || response.status === 504
        ? "Сервер временно недоступен. Попробуйте позже."
        : "Ошибка сервера. Попробуйте позже."
    );
    error.status = response.status;
    error.isServerError = true;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data.error || "Ошибка запроса");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список доступных тарифов и цен
 * @returns {Promise<{mode: string, currency: string, tiers: Array}>}
 */
export async function getPlans() {
  return request("/plans");
}

/**
 * Получить статус подписки текущего пользователя
 * @returns {Promise<{hasSubscription: boolean, subscription: object|null}>}
 */
export async function getSubscriptionStatus() {
  return request("/status");
}

/**
 * Создать платёж для покупки подписки
 * @param {string} tier - 'VIP' | 'PRO'
 * @returns {Promise<{paymentId: string, paymentUrl: string, amount: number, ...}>}
 */
export async function createPayment(tier) {
  return request("/payments/create", {
    method: "POST",
    body: { tier }
  });
}

/**
 * Получить историю платежей
 * @returns {Promise<{payments: Array}>}
 */
export async function getPaymentHistory() {
  return request("/payments/history");
}

/**
 * Отменить подписку (для будущего режима подписок)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function cancelSubscription() {
  return request("/cancel", {
    method: "POST"
  });
}

export default {
  getPlans,
  getSubscriptionStatus,
  createPayment,
  getPaymentHistory,
  cancelSubscription
};
