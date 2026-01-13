import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";
import "./MobileTaskOverlay.css";

/**
 * MobileTaskOverlay — мобильная версия оверлея принятия задания "Действие"
 * Используется вместо Spline на мобильных устройствах
 */
function MobileTaskOverlay({
  isOpen,
  title,
  description,
  categoryName,
  onAccept,
  onRefuse,
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div 
        className="mobile-task-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mobile-task-overlay__backdrop" aria-hidden="true" />
        
        <motion.div
          className="mobile-task-overlay__card"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Декоративное свечение */}
          <div className="mobile-task-overlay__glow" aria-hidden="true" />
          
          {/* Заголовок с иконкой */}
          <div className="mobile-task-overlay__header">
            <div className="mobile-task-overlay__icon">🎯</div>
            <h2 className="mobile-task-overlay__title">Новое задание</h2>
          </div>

          {/* Badges: режим + категория */}
          <div className="mobile-task-overlay__badges">
            <span className="mobile-task-overlay__badge">
              🎯 Действие
            </span>
            {categoryName && (
              <span className="mobile-task-overlay__badge mobile-task-overlay__badge--category">
                📂 {categoryName}
              </span>
            )}
          </div>

          {/* Название задания */}
          {title && (
            <div className="mobile-task-overlay__task-title">
              {title}
            </div>
          )}

          {/* Описание задания */}
          <div className="mobile-task-overlay__description">
            {description || "Задание не указано"}
          </div>

          {/* Кнопки действий */}
          <div className="mobile-task-overlay__actions">
            <Button variant="ghost" size="md" onClick={onRefuse}>
              Отказаться
            </Button>
            <Button variant="primary" size="md" onClick={onAccept}>
              Принять
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default MobileTaskOverlay;
