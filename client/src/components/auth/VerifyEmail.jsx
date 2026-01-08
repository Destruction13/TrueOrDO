import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import "./VerifyEmail.css";

export default function VerifyEmail({ token, onSuccess, onBack }) {
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");
  const { verifyEmail } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Токен не указан");
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail(token);
        setStatus("success");
        setMessage("Email успешно подтверждён!");
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Ошибка подтверждения");
      }
    };

    verify();
  }, [token, verifyEmail]);

  return (
    <div className="verify-email">
      <div className="verify-email__card glass-card">
        {status === "verifying" && (
          <>
            <div className="verify-email__icon">⏳</div>
            <h2>Подтверждение email...</h2>
            <p>Пожалуйста, подождите</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verify-email__icon verify-email__icon--success">✓</div>
            <h2>Готово!</h2>
            <p>{message}</p>
            <Button variant="primary" size="md" onClick={onSuccess}>
              Продолжить
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verify-email__icon verify-email__icon--error">✕</div>
            <h2>Ошибка</h2>
            <p>{message}</p>
            <Button variant="ghost" size="md" onClick={onBack}>
              Вернуться
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
