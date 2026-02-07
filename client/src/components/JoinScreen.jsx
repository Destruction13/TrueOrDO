import { useState, useEffect } from "react";
import Button from "./ui/Button";
import PulseButton from "./ui/PulseButton";
import BatteryModeButton from "./ui/BatteryModeButton";
import { GAME_IDS } from "../context/SettingsContext";
import TextShimmer from "./alias/TextShimmer";
import RulesModal from "./ui/RulesModal";

function JoinScreen({ connected, error, onCreate, onJoin, user, onProfile, onLogin, onClearError, initialCode, onBackToGames }) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Обновляем код если изменился initialCode
  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode);
    }
  }, [initialCode]);

  // Имя для создания: никнейм пользователя или введённое вручную
  const effectiveCreateName = user?.nickname || createName.trim();
  const effectiveJoinName = user?.nickname || joinName.trim();

  // Очищаем ошибку при любом вводе
  const handleInputChange = (setter) => (event) => {
    if (error && onClearError) {
      onClearError();
    }
    setter(event.target.value);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!effectiveCreateName) {
      return;
    }
    setLoading(true);
    await onCreate(effectiveCreateName, user?.avatarUrl);
    setLoading(false);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!effectiveJoinName || !joinCode.trim()) {
      return;
    }
    setLoading(true);
    await onJoin(effectiveJoinName, joinCode.trim().toUpperCase(), user?.avatarUrl);
    setLoading(false);
  };

  // Если есть код из URL — показываем упрощённый экран входа
  if (initialCode) {
    return (
      <div className="app-shell">
        <div className="hero">
          <button className="back-to-games-link" onClick={onBackToGames} type="button">
            ← Все игры
          </button>
          <div className="hero-tag">Truth or Dare</div>
          <div
            className="hero-title tod-hero-title"
            role="heading"
            aria-level={1}
            aria-label="Правда или Действие"
          >
            <TextShimmer
              as="h1"
              className="tod-title-shimmer"
              duration={3}
              spread={3}
            >
              Правда или Действие
            </TextShimmer>
          </div>
          <p>Вас пригласили в комнату <strong>{initialCode}</strong></p>
        </div>

        <div className="join-screen join-screen--single">
          <form className="glass-card" onSubmit={handleJoin}>
            <h2>Присоединиться</h2>
            
            {user?.nickname ? (
              <div className="field-info">
                <span>Играете как</span>
                <div className="field-user">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="field-user__avatar" />
                  ) : (
                    <span className="field-user__avatar-placeholder">
                      {user.nickname[0].toUpperCase()}
                    </span>
                  )}
                  <span className="field-user__name">{user.nickname}</span>
                </div>
              </div>
            ) : (
              <label className="field">
                <span>Твоё имя</span>
                <input
                  type="text"
                  value={joinName}
                  onChange={handleInputChange(setJoinName)}
                  placeholder="Введите имя"
                  autoFocus
                />
              </label>
            )}
            
            <PulseButton
              size="lg"
              type="submit"
              loading={loading}
              disabled={!connected || !effectiveJoinName}
              fullWidth
            >
              Войти в комнату
            </PulseButton>

            {!user && (
              <div className="invite-login-hint">
                <span>Есть аккаунт?</span>
                <Button variant="ghost" size="sm" onClick={onLogin}>
                  Войти
                </Button>
              </div>
            )}
          </form>
        </div>

        <div className="status-bar">
          <span>{connected ? "Сервер на связи" : "Нет соединения с сервером"}</span>
          {error ? <span className="error">{error}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* User header - фиксированный в правом верхнем углу */}
      <div className="user-header">
        {user ? (
          <button className="user-header__profile" onClick={onProfile} type="button">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="user-header__avatar" />
            ) : (
              <span className="user-header__avatar-placeholder">
                {(user.nickname || user.email)?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="user-header__name">{user.nickname || user.email}</span>
          </button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onLogin}>
            Войти
          </Button>
        )}

        <BatteryModeButton gameId={GAME_IDS.TRUTH_OR_DARE} />
        
        {/* Кнопка правил */}
        <button 
          className="rules-btn-header" 
          onClick={() => setShowRulesModal(true)}
          title="Правила игры"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Правила</span>
        </button>
      </div>

      <div className="hero">
        <button className="back-to-games-link" onClick={onBackToGames} type="button">
          ← Все игры
        </button>
        <div className="hero-tag">Truth or Dare</div>
        <div
          className="hero-title tod-hero-title"
          role="heading"
          aria-level={1}
          aria-label="Правда или Действие"
        >
          <TextShimmer
            as="h1"
            className="tod-title-shimmer"
            duration={3}
            spread={3}
          >
            Правда или Действие
          </TextShimmer>
        </div>
        <p>Создай комнату, поделись кодом и запускай раунды в реальном времени.</p>
      </div>

      <div className="join-screen">
        <form className="glass-card" onSubmit={handleCreate}>
          <h2>Создать комнату</h2>
          {user?.nickname ? (
            <div className="field-info">
              <span>Играете как</span>
              <div className="field-user">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="field-user__avatar" />
                ) : (
                  <span className="field-user__avatar-placeholder">
                    {user.nickname[0].toUpperCase()}
                  </span>
                )}
                <span className="field-user__name">{user.nickname}</span>
              </div>
            </div>
          ) : (
            <label className="field">
              <span>Твоё имя</span>
              <input
                type="text"
                value={createName}
                onChange={handleInputChange(setCreateName)}
                placeholder="Введите имя"
              />
            </label>
          )}
          <PulseButton
            size="lg"
            type="submit"
            loading={loading}
            disabled={!connected || !effectiveCreateName}
            fullWidth
          >
            Создать
          </PulseButton>
        </form>

        <form className="glass-card" onSubmit={handleJoin}>
          <h2>Войти по коду</h2>
          <label className="field">
            <span>Код комнаты</span>
            <input
              type="text"
              value={joinCode}
              onChange={handleInputChange(setJoinCode)}
              placeholder="ABCD"
              maxLength={6}
              style={{ textTransform: "uppercase" }}
            />
          </label>

          {user?.nickname ? null : (
            <label className="field">
              <span>Твоё имя</span>
              <input
                type="text"
                value={joinName}
                onChange={handleInputChange(setJoinName)}
                placeholder="Введите имя"
              />
            </label>
          )}

          <Button
            variant="secondary"
            size="lg"
            type="submit"
            loading={loading}
            disabled={!connected || !effectiveJoinName || !joinCode.trim()}
            fullWidth
          >
            Войти
          </Button>
        </form>
      </div>

      <div className="status-bar">
        <span>{connected ? "Сервер на связи" : "Нет соединения с сервером"}</span>
        {error ? <span className="error">{error}</span> : null}
      </div>

      {/* Модальное окно правил */}
      <RulesModal 
        isOpen={showRulesModal} 
        onClose={() => setShowRulesModal(false)} 
      />
    </div>
  );
}

export default JoinScreen;
