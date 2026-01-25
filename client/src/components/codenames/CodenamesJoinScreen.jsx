import { useState, useEffect } from "react";
import Button from "../ui/Button";
import PulseButton from "../ui/PulseButton";
import CodenamesRulesModal from "./CodenamesRulesModal";

export default function CodenamesJoinScreen({ 
  connected, 
  error, 
  onCreate, 
  onJoin, 
  user, 
  onProfile, 
  onLogin, 
  onClearError, 
  initialCode, 
  onBackToGames 
}) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode);
    }
  }, [initialCode]);

  const effectiveCreateName = user?.nickname || createName.trim();
  const effectiveJoinName = user?.nickname || joinName.trim();

  const handleInputChange = (setter) => (event) => {
    if (error && onClearError) {
      onClearError();
    }
    setter(event.target.value);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!effectiveCreateName) return;
    setLoading(true);
    await onCreate(effectiveCreateName, user?.avatarUrl);
    setLoading(false);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!effectiveJoinName || !joinCode.trim()) return;
    setLoading(true);
    await onJoin(effectiveJoinName, joinCode.trim().toUpperCase(), user?.avatarUrl);
    setLoading(false);
  };

  // Если есть код из URL — упрощённый экран входа
  if (initialCode) {
    return (
      <div className="app-shell">
        <div className="hero">
          <button className="back-to-games-link" onClick={onBackToGames} type="button">
            ← Все игры
          </button>
          <div className="hero-tag">Codenames</div>
          <h1 className="codenames-title">Codenames</h1>
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
      {/* User header */}
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
        <div className="hero-tag">Codenames</div>
        <h1 className="codenames-title">Codenames</h1>
        <p>Разгадывай слова по подсказкам капитана!</p>
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
              placeholder="Например: A1B2C3"
            />
          </label>
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
              />
            </label>
          )}
          <Button
            variant="secondary"
            size="md"
            type="submit"
            loading={loading}
            disabled={!connected || !effectiveJoinName}
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

      <CodenamesRulesModal 
        isOpen={showRulesModal} 
        onClose={() => setShowRulesModal(false)} 
      />
    </div>
  );
}
