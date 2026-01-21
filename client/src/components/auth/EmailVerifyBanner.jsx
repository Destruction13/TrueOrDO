import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./EmailVerifyBanner.css";

export default function EmailVerifyBanner() {
  const { user, resendVerification, isEmailVerified } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Не показываем если не авторизован, email уже подтверждён или баннер закрыт
  if (!user || isEmailVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await resendVerification();
      setMessage("✓ Письмо отправлено!");
    } catch (err) {
      setMessage("✕ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-verify-banner">
      <span className="email-verify-banner__icon">⚠️</span>
      <span className="email-verify-banner__text">
        Подтвердите email для полного доступа
      </span>
      <button
        className="email-verify-banner__button"
        onClick={handleResend}
        disabled={loading}
      >
        {loading ? "Отправка..." : "Отправить письмо"}
      </button>
      {message && (
        <span className="email-verify-banner__message">{message}</span>
      )}
      <button
        className="email-verify-banner__close"
        onClick={() => setDismissed(true)}
        title="Закрыть"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
