import { useState } from "react";
import { motion } from "framer-motion";
import "./WishlistTab.css";

/**
 * WishlistTab — вкладка "Вишлист"
 * Список игр, которые пользователь хочет купить/поиграть
 */
function WishlistTab({ profileData, isSelf, onProfileUpdate }) {
  const wishlist = profileData?.wishlist || [];

  return (
    <div className="wishlist-tab">
      <div className="wishlist-tab__header">
        <h3 className="wishlist-tab__title">Список желаний</h3>
        <span className="wishlist-tab__count">{wishlist.length} игр</span>
        {isSelf && (
          <button className="wishlist-tab__add-btn">+ Добавить игру</button>
        )}
      </div>

      {wishlist.length > 0 ? (
        <div className="wishlist-tab__list">
          {wishlist.map((game, index) => (
            <motion.div
              key={game.id || index}
              className="wishlist-tab__card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="wishlist-tab__cover">
                {game.coverUrl ? (
                  <img src={game.coverUrl} alt={game.name} />
                ) : (
                  <span className="wishlist-tab__cover-placeholder">🎮</span>
                )}
              </div>
              
              <div className="wishlist-tab__info">
                <h4 className="wishlist-tab__name">{game.name}</h4>
                {game.releaseDate && (
                  <span className="wishlist-tab__release">
                    📅 {game.releaseDate}
                  </span>
                )}
                {game.priority && (
                  <span className={`wishlist-tab__priority wishlist-tab__priority--${game.priority}`}>
                    {game.priority === "high" && "🔥 Очень хочу"}
                    {game.priority === "medium" && "⭐ Хочу"}
                    {game.priority === "low" && "📌 Интересно"}
                  </span>
                )}
              </div>

              {isSelf && (
                <div className="wishlist-tab__actions">
                  <button className="wishlist-tab__action-btn" title="Переместить">
                    ↕️
                  </button>
                  <button className="wishlist-tab__action-btn" title="Удалить">
                    🗑️
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="wishlist-tab__empty">
          <span className="wishlist-tab__empty-icon">🎁</span>
          <span className="wishlist-tab__empty-text">
            {isSelf 
              ? "Добавьте игры в список желаний" 
              : "Вишлист пуст"}
          </span>
          {isSelf && (
            <button className="wishlist-tab__empty-btn">
              + Добавить первую игру
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default WishlistTab;
