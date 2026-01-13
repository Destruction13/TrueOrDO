import { useRef, useState } from "react";
import Button from "./ui/Button";
import PulseButton from "./ui/PulseButton";
import GooeyText from "./ui/GooeyText";
import RulesModal from "./ui/RulesModal";

function JoinScreen({ connected, error, onCreate, onJoin, user, onProfile, onLogin, onClearError }) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const titleRef = useRef(null);
  const titleRaf = useRef(0);

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
    await onCreate(effectiveCreateName);
    setLoading(false);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!effectiveJoinName || !joinCode.trim()) {
      return;
    }
    setLoading(true);
    await onJoin(effectiveJoinName, joinCode.trim().toUpperCase());
    setLoading(false);
  };

  const handleTitleMove = (event) => {
    if (!titleRef.current) {
      return;
    }

    const rect = titleRef.current.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    const rx = (0.5 - y) * 12;
    const ry = (x - 0.5) * 12;
    const glow = Math.max(0.25, 1 - (Math.abs(x - 0.5) + Math.abs(y - 0.5)));

    if (titleRaf.current) {
      cancelAnimationFrame(titleRaf.current);
    }

    titleRaf.current = requestAnimationFrame(() => {
      const el = titleRef.current;
      if (!el) {
        return;
      }
      el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
      el.style.setProperty("--glow", glow.toFixed(2));
      titleRaf.current = 0;
    });
  };

  const handleTitleLeave = () => {
    const el = titleRef.current;
    if (!el) {
      return;
    }
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--glow", "0.35");
  };

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
        <div className="hero-tag">True or Do</div>
        <div
          className="hero-title"
          ref={titleRef}
          onPointerMove={handleTitleMove}
          onPointerLeave={handleTitleLeave}
          role="heading"
          aria-level={1}
          aria-label="Правда или Действие"
        >
          <GooeyText
            texts={["Правда", "или", "Действие"]}
            className="hero-title__gooey"
            textClassName="hero-title__text"
          />
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

      {/* Модальное окно правил */}
      <RulesModal 
        isOpen={showRulesModal} 
        onClose={() => setShowRulesModal(false)} 
      />
    </div>
  );
}

export default JoinScreen;
