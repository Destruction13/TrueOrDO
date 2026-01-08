import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./EmailVerifyBanner.css";

export default function EmailVerifyBanner() {
  const { user, resendVerification, isEmailVerified } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Не показываем если не авторизован или email уже подтверждён
  if (!user || isEmailVerified) {
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
    </div>
  );
}
