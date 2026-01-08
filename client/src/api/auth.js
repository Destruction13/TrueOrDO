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

  const response = await fetch(url, config);
  const data = await response.json();

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

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData
    // НЕ устанавливаем Content-Type — браузер сделает это автоматически с boundary
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "Ошибка загрузки");
    error.status = response.status;
    throw error;
  }

  return data;
}
