import { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import "./ProfileScreen.css";

export default function ProfileScreen({ onBack }) {
  const { user, updateProfile, uploadAvatar, resendVerification, logout } = useAuth();
  
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({ nickname: nickname || null, bio });
      setSuccess("Профиль обновлён!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация на клиенте
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setError("Разрешены только JPG, PNG, GIF, WebP");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Максимальный размер файла 10MB");
      return;
    }

    setAvatarLoading(true);
    setError(null);

    try {
      await uploadAvatar(file);
      setSuccess("Аватар обновлён!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarLoading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage(null);

    try {
      await resendVerification();
      setResendMessage("Письмо отправлено!");
    } catch (err) {
      setResendMessage(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onBack?.();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-screen">
      <div className="profile-card glass-card">
        <div className="profile-header">
          <button className="profile-back" onClick={onBack} type="button">
            ← Назад
          </button>
          <h2>Профиль</h2>
        </div>

        {/* Email Verification Banner */}
        {!user.emailVerified && (
          <div className="profile-verify-banner">
            <span>⚠️ Email не подтверждён</span>
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              type="button"
            >
              {resendLoading ? "Отправка..." : "Отправить письмо"}
            </button>
            {resendMessage && <span className="banner-message">{resendMessage}</span>}
          </div>
        )}

        {/* Avatar */}
        <div className="profile-avatar-section">
          <button
            className="profile-avatar"
            onClick={handleAvatarClick}
            disabled={avatarLoading}
            type="button"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" />
            ) : (
              <span className="profile-avatar__placeholder">
                {(user.nickname || user.email)?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="profile-avatar__overlay">
              {avatarLoading ? "⏳" : "📷"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarChange}
            hidden
          />
          <span className="profile-avatar-hint">Нажмите для загрузки</span>
        </div>

        {/* Form */}
        <form className="profile-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={user.email}
              disabled
              className="field-disabled"
            />
          </label>

          <label className="field">
            <span>Никнейм</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ваш игровой ник"
              maxLength={30}
              title="1-30 символов"
            />
          </label>

          <label className="field">
            <span>О себе</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе..."
              maxLength={500}
              rows={3}
            />
          </label>

          {error && <div className="profile-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            fullWidth
          >
            Сохранить
          </Button>
        </form>

        <div className="profile-footer">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Выйти из аккаунта
          </Button>
        </div>
      </div>
    </div>
  );
}
