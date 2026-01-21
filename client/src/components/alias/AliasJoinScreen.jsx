import { useState } from "react";
import Button from "../ui/Button";
import PulseButton from "../ui/PulseButton";
import TextShimmer from "./TextShimmer";

export default function AliasJoinScreen({ connected, error, onCreate, onJoin, user, onProfile, onLogin, onClearError }) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

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
      </div>

      <div className="hero">
        <div className="hero-tag">Alias</div>
        <div
          className="hero-title alias-hero-title"
          role="heading"
          aria-level={1}
          aria-label="Шляпа"
        >
          <TextShimmer
            as="h1"
            className="alias-title-shimmer"
            duration={3}
            spread={3}
          >
            Шляпа
          </TextShimmer>
        </div>
        <p>Создай комнату, собери команды и объясняй слова на время!</p>
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
    </div>
  );
}
