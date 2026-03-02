import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./AddWidgetModal.css";

/**
 * Конфигурация доступных виджетов
 */
const AVAILABLE_WIDGETS = [
  {
    type: "favorite_games",
    title: "Мои любимые игры",
    description: "Покажите до 20 игр, которые вам нравятся",
    icon: "🎮",
    color: "#e74c3c",
    preview: "Сетка обложек игр",
  },
  {
    type: "current_games",
    title: "Текущие игры",
    description: "До 5 игр с тегами опыта и рейтинга",
    icon: "🕹️",
    color: "#9b59b6",
    preview: "Карточки с тегами",
  },
  {
    type: "favorite_game",
    title: "Любимая игра",
    description: "Выделите одну особенную игру",
    icon: "⭐",
    color: "#f1c40f",
    preview: "Большая карточка",
  },
  {
    type: "wishlist",
    title: "Хочу поиграть",
    description: "Список игр, которые хотите попробовать",
    icon: "📋",
    color: "#3498db",
    preview: "Сетка обложек",
  },
  {
    type: "achievements",
    title: "Достижения",
    description: "Покажите свои лучшие достижения",
    icon: "🏆",
    color: "#2ecc71",
    preview: "Иконки достижений",
    comingSoon: true,
  },
  {
    type: "stats",
    title: "Статистика",
    description: "Время в играх, победы и рекорды",
    icon: "📊",
    color: "#1abc9c",
    preview: "Графики и числа",
    comingSoon: true,
  },
];

/**
 * Карточка виджета в списке выбора
 */
function WidgetCard({ widget, isActive, onToggle }) {
  const { type, title, description, icon, color, preview, comingSoon } = widget;

  return (
    <motion.div
      className={`add-widget-modal__card ${isActive ? "add-widget-modal__card--active" : ""} ${comingSoon ? "add-widget-modal__card--coming-soon" : ""}`}
      style={{ "--widget-color": color }}
      onClick={() => !comingSoon && onToggle(type)}
      whileHover={!comingSoon ? { scale: 1.02, y: -2 } : {}}
      whileTap={!comingSoon ? { scale: 0.98 } : {}}
      layout
    >
      <div className="add-widget-modal__card-icon">
        {icon}
      </div>
      
      <div className="add-widget-modal__card-content">
        <h4 className="add-widget-modal__card-title">
          {title}
          {comingSoon && <span className="add-widget-modal__coming-soon-badge">Скоро</span>}
        </h4>
        <p className="add-widget-modal__card-description">{description}</p>
        <span className="add-widget-modal__card-preview">{preview}</span>
      </div>

      <div className="add-widget-modal__card-toggle">
        {!comingSoon && (
          <motion.div 
            className={`add-widget-modal__checkbox ${isActive ? "add-widget-modal__checkbox--checked" : ""}`}
            animate={{ scale: isActive ? 1 : 0.9 }}
          >
            {isActive && <span>✓</span>}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * AddWidgetModal — модалка добавления/настройки виджетов на доске
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSave: (widgets: string[]) => void — сохранить активные виджеты
 * - activeWidgets: string[] — текущие активные виджеты
 */
function AddWidgetModal({ isOpen, onClose, onSave, activeWidgets = [] }) {
  const [selectedWidgets, setSelectedWidgets] = useState(new Set(activeWidgets));

  // Переключение виджета
  const toggleWidget = (widgetType) => {
    setSelectedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetType)) {
        newSet.delete(widgetType);
      } else {
        newSet.add(widgetType);
      }
      return newSet;
    });
  };

  // Сохранение
  const handleSave = () => {
    onSave(Array.from(selectedWidgets));
    onClose();
  };

  // Сброс к дефолтным
  const handleReset = () => {
    setSelectedWidgets(new Set(["favorite_games", "current_games"]));
  };

  const selectedCount = selectedWidgets.size;
  const hasChanges = JSON.stringify([...selectedWidgets].sort()) !== JSON.stringify([...activeWidgets].sort());

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="add-widget-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="add-widget-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="add-widget-modal__header">
              <div className="add-widget-modal__header-content">
                <h3 className="add-widget-modal__title">Настроить виджеты</h3>
                <p className="add-widget-modal__subtitle">
                  Выберите, что показывать на вашей доске
                </p>
              </div>
              <button className="add-widget-modal__close" onClick={onClose}>
                ×
              </button>
            </div>

            {/* Widgets List */}
            <div className="add-widget-modal__list">
              {AVAILABLE_WIDGETS.map((widget) => (
                <WidgetCard
                  key={widget.type}
                  widget={widget}
                  isActive={selectedWidgets.has(widget.type)}
                  onToggle={toggleWidget}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="add-widget-modal__footer">
              <div className="add-widget-modal__footer-info">
                <span className="add-widget-modal__selected-count">
                  Выбрано: <strong>{selectedCount}</strong> виджетов
                </span>
                <button 
                  className="add-widget-modal__reset-btn"
                  onClick={handleReset}
                >
                  Сбросить
                </button>
              </div>
              
              <div className="add-widget-modal__footer-actions">
                <button 
                  className="add-widget-modal__cancel-btn"
                  onClick={onClose}
                >
                  Отмена
                </button>
                <button 
                  className="add-widget-modal__save-btn"
                  onClick={handleSave}
                  disabled={!hasChanges}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AddWidgetModal;
