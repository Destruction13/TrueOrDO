import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { GlowingEffect } from "../components/ui/GlowingEffect";
import GamesShaderBackground from "../components/GamesShaderBackground";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import "./GamesPage.css";

const games = [
  {
    id: "truth-or-dare",
    title: "Правда или действие",
    description: "Описание для карточки",
    path: "/truth-or-dare",
    available: true,
    icon: "🎯",
  },
  {
    id: "alias",
    title: "Alias",
    description: "Объясни слово — не называя его!",
    path: "/alias",
    available: true,
    icon: "💬",
  },
];

function GameCard({ game, index, onClick }) {
  return (
    <motion.div
      className={`game-card ${game.comingSoon ? "game-card--coming-soon" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.15 } }}
    >
      {/* Glowing effect border */}
      <GlowingEffect
        borderWidth={5}
        glowSize={80}
        proximity={60}
      />
      
      <div className="game-card__content">
        <div className="game-card__icon">{game.icon}</div>
        <div className="game-card__info">
          <h3 className="game-card__title">
            {game.title}
            {game.comingSoon && <span className="game-card__badge">Скоро</span>}
          </h3>
          <p className="game-card__description">{game.description}</p>
        </div>
        <div className="game-card__arrow">→</div>
      </div>
    </motion.div>
  );
}

export default function GamesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Установка заголовка страницы
  useEffect(() => {
    document.title = "Игры — PartyChaos";
  }, []);

  return (
    <div className="games-page">
      <GamesShaderBackground />

      <div className="user-header">
        {user ? (
          <button className="user-header__profile" onClick={() => navigate("/profile")} type="button">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login", { state: { backgroundLocation: location } })}
          >
            Войти
          </Button>
        )}
      </div>

      <div className="games-content">
        <motion.header
          className="games-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button className="games-back" onClick={() => navigate("/")}>
            ← Главная
          </button>
          <h1 className="games-logo">
            Party<span className="games-logo__accent">Chaos</span>
          </h1>
          <p className="games-subtitle">Выбери игру для вечеринки</p>
        </motion.header>

        <div className="games-grid">
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              onClick={() => game.available && navigate(game.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
