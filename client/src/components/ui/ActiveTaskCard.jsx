import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import "./ActiveTaskCard.css";

/**
 * ActiveTaskCard — красивая карточка с заданием во время выполнения
 * Показывается после принятия задания "Действие"
 * Минималистичный дизайн с акцентом на само задание
 */
function ActiveTaskCard({
  taskText,
  timerRemaining,
  isTruth = false,
  isMeCurrent = false,
  executorName,
  onMarkDone,
  onRefuse,
  canMarkDone = false,
  categoryName = null,
}) {
  const [glowIntensity, setGlowIntensity] = useState(0.5);

  // Удаляем категорию из текста задания, если она передана отдельно
  const displayText = useMemo(() => {
    if (!taskText) return taskText;
    if (!categoryName) return taskText;
    
    // Проверяем, начинается ли текст с "Категория: " и удаляем этот префикс
    const prefix = `${categoryName}: `;
    if (taskText.startsWith(prefix)) {
      return taskText.slice(prefix.length);
    }
    return taskText;
  }, [taskText, categoryName]);

  // Пульсация свечения при низком таймере
  useEffect(() => {
    if (timerRemaining != null && timerRemaining <= 30) {
      const intensity = 0.5 + (1 - timerRemaining / 30) * 0.5;
      setGlowIntensity(intensity);
    } else {
      setGlowIntensity(0.5);
    }
  }, [timerRemaining]);

  const formatTimer = (seconds) => {
    if (seconds == null || Number.isNaN(seconds)) {
      return "--:--";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(seconds % 60, 0);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const isTimeLow = timerRemaining != null && timerRemaining <= 30;
  const isTimeCritical = timerRemaining != null && timerRemaining <= 10;

  return (
    <motion.div
      className={`active-task-card ${isTimeLow ? "active-task-card--warning" : ""} ${isTimeCritical ? "active-task-card--critical" : ""}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ "--glow-intensity": glowIntensity }}
    >
      {/* Декоративные элементы */}
      <div className="active-task-card__glow" aria-hidden="true" />
      <div className="active-task-card__border-glow" aria-hidden="true" />
      
      {/* Верхняя часть с таймером */}
      <div className="active-task-card__header">
        <div className="active-task-card__badges">
          <div className="active-task-card__badge">
            <span className="active-task-card__badge-icon">
              {isTruth ? "💬" : "🎯"}
            </span>
            <span className="active-task-card__badge-text">
              {isTruth ? "Правда" : "Действие"}
            </span>
          </div>
          {categoryName && (
            <div className="active-task-card__badge active-task-card__badge--category">
              <span className="active-task-card__badge-icon">📂</span>
              <span className="active-task-card__badge-text">{categoryName}</span>
            </div>
          )}
        </div>
        
        <motion.div 
          className={`active-task-card__timer ${isTimeLow ? "active-task-card__timer--warning" : ""} ${isTimeCritical ? "active-task-card__timer--critical" : ""}`}
          animate={isTimeCritical ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          <svg className="active-task-card__timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span className="active-task-card__timer-value">
            {formatTimer(timerRemaining)}
          </span>
        </motion.div>
      </div>

      {/* Основной контент - задание */}
      <div className="active-task-card__content">
        <div className="active-task-card__task-wrapper">
          <div className="active-task-card__task-text">
            {displayText || "Задание не указано"}
          </div>
        </div>
      </div>

      {/* Информация о выполняющем (для других игроков) */}
      {!isMeCurrent && executorName && (
        <div className="active-task-card__executor">
          <span className="active-task-card__executor-label">Выполняет:</span>
          <span className="active-task-card__executor-name">{executorName}</span>
        </div>
      )}

      {/* Кнопки действий (только для выполняющего) */}
      {isMeCurrent && canMarkDone && (
        <motion.div 
          className="active-task-card__actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button variant="primary" size="md" onClick={onMarkDone}>
            {isTruth ? "Ответил" : "Выполнил"}
          </Button>
          <Button variant="ghost" size="md" onClick={onRefuse}>
            Отказаться
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default ActiveTaskCard;
