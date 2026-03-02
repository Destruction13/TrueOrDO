/**
 * API клиент для авторизации
 * Все запросы делаются с credentials: "include" для передачи cookies
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}/api${endpoint}`;
  
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

  // Пробуем распарсить JSON, но если сервер вернул HTML (ошибка nginx) — обрабатываем
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
    // Сервер вернул не JSON (скорее всего HTML-страницу ошибки от nginx)
    const error = new Error(
      response.status === 413 
        ? "Файл слишком большой" 
        : response.status === 502 || response.status === 504
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
// AUTH API
// ═══════════════════════════════════════════════════════════════════════════

export async function register({ email, password, nickname }) {
  return request("/auth/register", {
    method: "POST",
    body: { email, password, nickname }
  });
}

export async function login({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export async function logout() {
  return request("/auth/logout", {
    method: "POST"
  });
}

export async function getMe() {
  return request("/auth/me");
}

export async function verifyEmail(token) {
  return request(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification() {
  return request("/auth/resend-verification", {
    method: "POST"
  });
}

export async function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: { email }
  });
}

export async function resetPassword({ token, password }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: { token, password }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE API
// ═══════════════════════════════════════════════════════════════════════════

export async function getProfile() {
  return request("/me");
}

export async function updateProfile({ nickname, bio }) {
  return request("/me", {
    method: "PATCH",
    body: { nickname, bio }
  });
}

export async function uploadAvatar(file) {
  const url = `${API_BASE}/api/me/avatar`;
  const formData = new FormData();
  formData.append("avatar", file);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData
      // НЕ устанавливаем Content-Type — браузер сделает это автоматически с boundary
    });
  } catch (networkError) {
    const error = new Error("Нет соединения с сервером. Проверьте интернет.");
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  // Проверяем Content-Type ответа
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (parseError) {
      const error = new Error("Ошибка сервера при загрузке. Попробуйте позже.");
      error.status = response.status;
      error.isParseError = true;
      throw error;
    }
  } else {
    // Сервер вернул не JSON (HTML-страница ошибки от nginx)
    const error = new Error(
      response.status === 413 
        ? "Файл слишком большой. Максимум 10 МБ." 
        : response.status === 502 || response.status === 504
          ? "Сервер временно недоступен. Попробуйте позже."
          : "Ошибка загрузки. Попробуйте другое изображение или позже."
    );
    error.status = response.status;
    error.isServerError = true;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data.error || "Ошибка загрузки");
    error.status = response.status;
    throw error;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMIZATION API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить список доступных рамок
 * @param {string} [game] - Фильтр по игре (опционально)
 */
export async function getFrames(game) {
  const params = game ? `?game=${encodeURIComponent(game)}` : "";
  return request(`/frames${params}`);
}

/**
 * Получить список доступных градиентов для никнейма
 */
export async function getNicknameGradients() {
  return request("/nickname-gradients");
}

/**
 * Получить список доступных свечений для никнейма
 */
export async function getNicknameGlows() {
  return request("/nickname-glows");
}

/**
 * Получить список доступных анимированных эффектов для никнейма (PRO)
 */
export async function getNicknameEffects() {
  return request("/nickname-effects");
}

/**
 * Получить статистику текущего пользователя
 */
export async function getUserStats() {
  return request("/me/stats");
}

/**
 * Получить достижения текущего пользователя
 */
export async function getUserAchievements() {
  return request("/me/achievements");
}

/**
 * Получить список всех достижений
 */
export async function getAllAchievements() {
  return request("/achievements");
}

/**
 * Установить избранные достижения (витрина профиля)
 * @param {string[]} achievementIds - Массив ID достижений (максимум 6)
 */
export async function setFeaturedAchievements(achievementIds) {
  return request("/me/achievements/featured", {
    method: "PATCH",
    body: { achievementIds },
  });
}

/**
 * Получить текущие настройки кастомизации пользователя
 */
export async function getCustomization() {
  return request("/me/customization");
}

/**
 * Обновить настройки кастомизации
 * @param {Object} updates - Обновления (frameAll, frameCodenames, nicknameColorType, etc.)
 */
export async function updateCustomization(updates) {
  return request("/me/customization", {
    method: "PATCH",
    body: updates
  });
}
