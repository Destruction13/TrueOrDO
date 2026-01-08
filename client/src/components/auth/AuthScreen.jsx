import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import PulseButton from "../ui/PulseButton";
import "./AuthScreen.css";

// OAuth URLs (относительные, пойдут через proxy)
const DISCORD_AUTH_URL = "/api/auth/discord";
const GOOGLE_AUTH_URL = "/api/auth/google";

// Иконки OAuth провайдеров
function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [oauthError, setOauthError] = useState(null);

  // Проверяем OAuth ошибки из URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      const errorMessages = {
        oauth_denied: "Авторизация отменена",
        oauth_failed: "Ошибка авторизации. Попробуйте ещё раз",
        oauth_not_configured: "OAuth не настроен на сервере",
        oauth_token_failed: "Не удалось получить токен",
        oauth_user_failed: "Не удалось получить данные пользователя",
        oauth_no_email: "Email не предоставлен провайдером",
        session_failed: "Ошибка создания сессии"
      };
      setOauthError(errorMessages[error] || "Произошла ошибка");
      // Убираем error из URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const { login, register, forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        await login({ email, password });
        onSuccess?.();
      } else if (mode === "register") {
        await register({ email, password, nickname: nickname || undefined });
        setMessage("Регистрация успешна! Проверьте email для подтверждения.");
        onSuccess?.();
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setMessage("Если email зарегистрирован, вы получите письмо для сброса пароля.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card glass-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => switchMode("login")}
            type="button"
          >
            Вход
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => switchMode("register")}
            type="button"
          >
            Регистрация
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "forgot" ? (
            <>
              <h2>Восстановление пароля</h2>
              <p className="auth-subtitle">
                Введите email, и мы отправим ссылку для сброса пароля
              </p>
            </>
          ) : mode === "register" ? (
            <h2>Создать аккаунт</h2>
          ) : (
            <h2>Войти в аккаунт</h2>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </label>

          {mode !== "forgot" && (
            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
                minLength={8}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </label>
          )}

          {mode === "register" && (
            <label className="field">
              <span>Никнейм (опционально)</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ваш игровой ник"
                pattern="^[a-zA-Z0-9_-]{3,30}$"
                title="3-30 символов: буквы, цифры, _, -"
              />
            </label>
          )}

          {(error || oauthError) && <div className="auth-error">{error || oauthError}</div>}
          {message && <div className="auth-message">{message}</div>}

          {mode === "forgot" ? (
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={loading}
              fullWidth
            >
              Отправить письмо
            </Button>
          ) : mode === "register" ? (
            <PulseButton
              size="lg"
              type="submit"
              loading={loading}
              fullWidth
            >
              Создать аккаунт
            </PulseButton>
          ) : (
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={loading}
              fullWidth
            >
              Войти
            </Button>
          )}

          <div className="auth-links">
            {mode === "login" && (
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("forgot")}
              >
                Забыли пароль?
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("login")}
              >
                ← Вернуться к входу
              </button>
            )}
          </div>

          {/* OAuth кнопки */}
          {mode !== "forgot" && (
            <div className="auth-oauth">
              <div className="auth-oauth__divider">
                <span>или</span>
              </div>
              <div className="auth-oauth__buttons">
                <a href={DISCORD_AUTH_URL} className="oauth-btn oauth-btn--discord">
                  <DiscordIcon />
                  <span>Discord</span>
                </a>
                <a href={GOOGLE_AUTH_URL} className="oauth-btn oauth-btn--google">
                  <GoogleIcon />
                  <span>Google</span>
                </a>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
