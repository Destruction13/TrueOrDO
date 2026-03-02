import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { getUserStats, getUserAchievements, getAllAchievements } from "../../api/auth";
import Button from "../ui/Button";
import AvatarFrame from "../ui/AvatarFrame";
import NicknameCustomizer from "./NicknameCustomizer";
import GameStats from "./GameStats";
import Achievements from "./Achievements";
import "./ProfileScreen.css";

/**
 * Модальное окно с инструкцией по получению Discord ID
 */
function DiscordIdHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="discord-help-modal__overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="discord-help-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="discord-help-modal__close" onClick={onClose}>✕</button>
          
          <div className="discord-help-modal__header">
            <span className="discord-help-modal__icon">🎮</span>
            <h3>Как получить Discord ID?</h3>
          </div>
          
          <div className="discord-help-modal__content">
            <div className="discord-help-modal__section">
              <h4>Зачем это нужно?</h4>
              <p>
                Указав свой Discord ID, другие игроки смогут найти тебя в Discord, 
                добавить в друзья и приглашать играть вместе. Твой профиль Discord 
                будет отображаться в игровом профиле.
              </p>
            </div>
            
            <div className="discord-help-modal__section">
              <h4>Инструкция:</h4>
              <ol>
                <li>
                  <strong>Включи режим разработчика:</strong>
                  <br />
                  Discord → Настройки → Расширенные → включи "Режим разработчика"
                </li>
                <li>
                  <strong>Скопируй свой ID:</strong>
                  <br />
                  Нажми правой кнопкой мыши на свой аватар или никнейм → "Копировать ID пользователя"
                </li>
                <li>
                  <strong>Вставь ID в поле выше</strong>
                </li>
              </ol>
            </div>
            
            <div className="discord-help-modal__note">
              💡 Discord ID — это уникальный числовой идентификатор (17-19 цифр), 
              например: <code>123456789012345678</code>
            </div>
          </div>
          
          <button className="discord-help-modal__ok-btn" onClick={onClose}>
            Понятно!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ProfileScreen({ onBack }) {
  const { user, setUser, customization, updateProfile, uploadAvatar, resendVerification, logout, socket } = useAuth();
  
  // Никнейм теперь редактируется в NicknameCustomizer с debounce-сохранением
  const [bio, setBio] = useState(user?.bio || "");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  
  // Discord ID
  const [discordId, setDiscordId] = useState(user?.discordId || "");
  const [discordIdSaving, setDiscordIdSaving] = useState(false);
  const [discordIdError, setDiscordIdError] = useState(null);
  const [discordIdSuccess, setDiscordIdSuccess] = useState(false);
  const [discordIdEditing, setDiscordIdEditing] = useState(false);
  const [showDiscordHelp, setShowDiscordHelp] = useState(false);
  
  // Discord Username (логин)
  const [discordUsername, setDiscordUsername] = useState(user?.discordUsername || "");
  const [discordUsernameSaving, setDiscordUsernameSaving] = useState(false);
  const [discordUsernameEditing, setDiscordUsernameEditing] = useState(false);
  
  // Статистика и достижения
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [achievements, setAchievements] = useState(null);
  const [allAchievements, setAllAchievements] = useState(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  
  const fileInputRef = useRef(null);
  
  // Загружаем статистику и достижения
  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, achievementsData, allAchievementsData] = await Promise.all([
          getUserStats(),
          getUserAchievements(),
          getAllAchievements()
        ]);
        setStats(statsData);
        setAchievements(achievementsData);
        setAllAchievements(allAchievementsData.achievements);
      } catch (err) {
        console.error("Failed to load stats/achievements:", err);
      } finally {
        setStatsLoading(false);
        setAchievementsLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Сохраняем только bio (никнейм сохраняется отдельно в NicknameCustomizer)
      await updateProfile({ bio });
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

  // Сохранение Discord ID
  const handleSaveDiscordId = useCallback(() => {
    if (!socket) return;
    
    const trimmedId = discordId.trim();
    
    // Если пустое — очищаем
    if (!trimmedId) {
      setDiscordIdSaving(true);
      setDiscordIdError(null);
      socket.emit("social:discord:set", { discordId: "" }, (response) => {
        setDiscordIdSaving(false);
        if (response.success) {
          setUser(prev => prev ? { ...prev, discordId: null } : prev);
          setDiscordIdSuccess(false);
          setDiscordIdEditing(false);
        } else {
          setDiscordIdError(response.error);
        }
      });
      return;
    }
    
    // Валидация формата
    if (!/^\d{17,19}$/.test(trimmedId)) {
      setDiscordIdError("Discord ID должен содержать 17-19 цифр");
      return;
    }
    
    setDiscordIdSaving(true);
    setDiscordIdError(null);
    
    socket.emit("social:discord:set", { discordId: trimmedId }, (response) => {
      setDiscordIdSaving(false);
      if (response.success) {
        setUser(prev => prev ? { ...prev, discordId: trimmedId } : prev);
        setDiscordIdSuccess(true);
        setDiscordIdEditing(false);
        setTimeout(() => setDiscordIdSuccess(false), 5000);
      } else {
        setDiscordIdError(response.error);
      }
    });
  }, [socket, discordId, setUser]);

  // Сохранение Discord Username
  const handleSaveDiscordUsername = useCallback(() => {
    if (!socket) return;
    
    const trimmedUsername = discordUsername.trim().replace(/^@/, ''); // Убираем @ если есть
    
    setDiscordUsernameSaving(true);
    socket.emit("social:discord:set-username", { discordUsername: trimmedUsername }, (response) => {
      setDiscordUsernameSaving(false);
      if (response.success) {
        setUser(prev => prev ? { ...prev, discordUsername: trimmedUsername || null } : prev);
        setDiscordUsernameEditing(false);
      }
    });
  }, [socket, discordUsername, setUser]);

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

        {/* Avatar + Bio Section (Discord style) */}
        <div className="profile-hero-section">
          <div className="profile-avatar-wrapper">
            <button
              className="profile-avatar"
              onClick={handleAvatarClick}
              disabled={avatarLoading}
              type="button"
            >
              <AvatarFrame size="l" frameSlug={customization?.frameAll}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" />
                ) : (
                  <span className="profile-avatar__placeholder">
                    {(user.nickname || user.email)?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </AvatarFrame>
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
          
          <div className="profile-bio-card">
            <div className="profile-bio-header">
              <span className="profile-bio-label">О себе</span>
            </div>
            <textarea
              className="profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Коротко о себе..."
              maxLength={35}
              rows={2}
              onBlur={handleSubmit}
            />
          </div>
        </div>

        {/* Nickname Customizer */}
        <NicknameCustomizer />

        {/* Discord ID Section */}
        <div className="profile-discord-section">
          <div className="profile-discord-header">
            <span className="profile-discord-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </span>
            <span className="profile-discord-label">Discord</span>
            <button 
              className="profile-discord-help"
              onClick={() => setShowDiscordHelp(true)}
              title="Как получить Discord ID?"
            >
              ?
            </button>
          </div>
          
          {/* Успешное сохранение */}
          {discordIdSuccess && (
            <div className="profile-discord-success">
              ✓ Discord ID интегрирован! Теперь другие игроки смогут найти тебя в Discord.
            </div>
          )}
          
          {user.discordId && !discordIdEditing ? (
            <div className="profile-discord-linked">
              <div className="profile-discord-id-row">
                <span className="profile-discord-status">✓</span>
                <code className="profile-discord-id-value">{user.discordId}</code>
                <button
                  className="profile-discord-edit-btn"
                  onClick={() => {
                    setDiscordId(user.discordId);
                    setDiscordIdEditing(true);
                  }}
                  title="Изменить Discord ID"
                >
                  ✏️
                </button>
              </div>
              <a 
                href={`https://discord.com/users/${user.discordId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-discord-link"
              >
                Открыть профиль в Discord →
              </a>
            </div>
          ) : (
            <div className="profile-discord-input-wrapper">
              <input
                type="text"
                className="profile-discord-input"
                value={discordId}
                onChange={(e) => {
                  setDiscordId(e.target.value);
                  setDiscordIdError(null);
                }}
                placeholder="Введите свой Discord ID"
                maxLength={19}
              />
              <button
                className="profile-discord-save"
                onClick={handleSaveDiscordId}
                disabled={discordIdSaving || !discordId.trim()}
              >
                {discordIdSaving ? "..." : "Сохранить"}
              </button>
              {discordIdEditing && (
                <button
                  className="profile-discord-cancel"
                  onClick={() => {
                    setDiscordIdEditing(false);
                    setDiscordId(user.discordId || "");
                    setDiscordIdError(null);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
          
          {discordIdError && (
            <div className="profile-discord-error">{discordIdError}</div>
          )}
          
          {/* Discord Username (логин) */}
          <div className="profile-discord-username-section">
            <div className="profile-discord-username-label">
              Discord логин <span className="profile-discord-optional">(опционально)</span>
            </div>
            {user.discordUsername && !discordUsernameEditing ? (
              <div className="profile-discord-username-row">
                <span className="profile-discord-username-value">@{user.discordUsername}</span>
                <button
                  className="profile-discord-edit-btn"
                  onClick={() => {
                    setDiscordUsername(user.discordUsername);
                    setDiscordUsernameEditing(true);
                  }}
                  title="Изменить Discord логин"
                >
                  ✏️
                </button>
              </div>
            ) : (
              <div className="profile-discord-input-wrapper">
                <input
                  type="text"
                  className="profile-discord-input"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  placeholder="username (без @)"
                  maxLength={32}
                />
                <button
                  className="profile-discord-save"
                  onClick={handleSaveDiscordUsername}
                  disabled={discordUsernameSaving}
                >
                  {discordUsernameSaving ? "..." : "Сохранить"}
                </button>
                {discordUsernameEditing && (
                  <button
                    className="profile-discord-cancel"
                    onClick={() => {
                      setDiscordUsernameEditing(false);
                      setDiscordUsername(user.discordUsername || "");
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <div className="profile-discord-username-hint">
              Позволяет другим игрокам скопировать ваш логин для поиска в Discord
            </div>
          </div>
        </div>

        {/* Статистика игр */}
        <GameStats stats={stats} loading={statsLoading} achievementsData={achievements} />

        {/* Достижения */}
        <Achievements 
          data={achievements} 
          loading={achievementsLoading} 
          allAchievements={allAchievements}
          statsData={stats}
        />

        {/* Messages */}
        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}

        <div className="profile-footer">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Выйти из аккаунта
          </Button>
        </div>
      </div>
      
      {/* Discord Help Modal */}
      <DiscordIdHelpModal 
        isOpen={showDiscordHelp} 
        onClose={() => setShowDiscordHelp(false)} 
      />
    </div>
  );
}
