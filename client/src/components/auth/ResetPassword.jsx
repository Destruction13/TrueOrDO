import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import "./ResetPassword.css";

export default function ResetPassword({ token, onSuccess, onBack }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть минимум 8 символов");
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-password">
        <div className="reset-password__card glass-card">
          <div className="reset-password__icon reset-password__icon--success">✓</div>
          <h2>Пароль изменён!</h2>
          <p>Теперь вы можете войти с новым паролем</p>
          <Button variant="primary" size="md" onClick={onSuccess}>
            Войти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password">
      <div className="reset-password__card glass-card">
        <h2>Новый пароль</h2>
        <p>Введите новый пароль для вашего аккаунта</p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Новый пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Подтвердите пароль</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {error && <div className="reset-password__error">{error}</div>}

          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            fullWidth
          >
            Сохранить пароль
          </Button>

          <button
            type="button"
            className="reset-password__back"
            onClick={onBack}
          >
            ← Вернуться к входу
          </button>
        </form>
      </div>
    </div>
  );
}
