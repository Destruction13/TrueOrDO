import { useState } from "react";
import Button from "./ui/Button";
import PulseButton from "./ui/PulseButton";

function JoinScreen({ connected, error, onCreate, onJoin }) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!createName.trim()) {
      return;
    }
    setLoading(true);
    await onCreate(createName.trim());
    setLoading(false);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) {
      return;
    }
    setLoading(true);
    await onJoin(joinName.trim(), joinCode.trim().toUpperCase());
    setLoading(false);
  };

  return (
    <div className="app-shell">
      <div className="hero">
        <div className="hero-tag">True or Do</div>
        <h1>Правда или Действие</h1>
        <p>Создай комнату, поделись кодом и запускай раунды в реальном времени.</p>
      </div>

      <div className="join-screen">
        <form className="glass-card" onSubmit={handleCreate}>
          <h2>Создать комнату</h2>
          <label className="field">
            <span>Твоё имя</span>
            <input
              type="text"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Введите имя"
            />
          </label>
          <PulseButton
            size="lg"
            type="submit"
            loading={loading}
            disabled={!connected}
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
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Например: A1B2C3"
            />
          </label>
          <label className="field">
            <span>Твоё имя</span>
            <input
              type="text"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="Введите имя"
            />
          </label>
          <Button
            variant="secondary"
            size="md"
            type="submit"
            loading={loading}
            disabled={!connected}
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

export default JoinScreen;
