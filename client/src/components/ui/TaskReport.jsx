import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import "./TaskReport.css";

/**
 * TaskReport — компактный отчёт о выполненном задании
 * Дизайн в стиле 21st.dev с двухслойной структурой
 * Первый слой: Имя + выполнил + бейджики (режим, категория) + итог
 * Второй слой: Текст задания (сворачиваемый)
 */
function TaskReport({
  taskText,
  executorName,
  executorAvatar,
  result, // "approved" | "report" | "skipped"
  isTruth = false,
  isVisible = true,
  categoryName = null,
}) {
  const [showContent, setShowContent] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Удаляем категорию из текста задания, если она передана отдельно
  const displayText = useMemo(() => {
    if (!taskText) return taskText;
    if (!categoryName) return taskText;
    
    const prefix = `${categoryName}: `;
    if (taskText.startsWith(prefix)) {
      return taskText.slice(prefix.length);
    }
    return taskText;
  }, [taskText, categoryName]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
    setShowContent(false);
  }, [isVisible]);

  const getResultInfo = () => {
    switch (result) {
      case "approved":
        return {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
          text: "Засчитано",
          className: "task-report--approved",
        };
      case "report":
        return {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ),
          text: "Репорт",
          className: "task-report--report",
        };
      case "skipped":
        return {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          ),
          text: "Пропуск",
          className: "task-report--skipped",
        };
      default:
        return {
          icon: "—",
          text: "Не решено",
          className: "task-report--pending",
        };
    }
  };

  const resultInfo = getResultInfo();
  const initial = executorName?.[0]?.toUpperCase() || "?";

  // Определяем режим и его эмодзи/иконку
  const modeInfo = isTruth 
    ? { label: "Правда", emoji: "💬", className: "badge--truth" }
    : { label: "Действие", emoji: "🎯", className: "badge--dare" };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`task-report ${resultInfo.className}`}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Декоративный glow эффект */}
          <div className="task-report__glow" />
          
          {/* Первый слой: Основная информация */}
          <motion.div 
            className="task-report__layer task-report__layer--main"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Левая часть: Аватар + Имя выполнил */}
            <div className="task-report__executor">
              <div className="task-report__avatar">
                {executorAvatar ? (
                  <img src={executorAvatar} alt={executorName} />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="task-report__executor-text">
                <span className="task-report__name">{executorName || "Игрок"}</span>
                <span className="task-report__verb">выполнил</span>
              </div>
            </div>

            {/* Центр: Бейджики */}
            <div className="task-report__badges">
              {/* Бейджик режима (Правда/Действие) */}
              <motion.div 
                className={`task-report__badge ${modeInfo.className}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
              >
                <span className="task-report__badge-emoji">{modeInfo.emoji}</span>
                <span className="task-report__badge-label">{modeInfo.label}</span>
              </motion.div>

              {/* Бейджик категории (только для действий) */}
              {!isTruth && categoryName && (
                <motion.div 
                  className="task-report__badge badge--category"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                >
                  <span className="task-report__badge-emoji">📂</span>
                  <span className="task-report__badge-label">{categoryName}</span>
                </motion.div>
              )}
            </div>

            {/* Правая часть: Итог */}
            <motion.div 
              className={`task-report__result result--${result}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 250 }}
            >
              <span className="task-report__result-icon">{resultInfo.icon}</span>
              <span className="task-report__result-text">{resultInfo.text}</span>
            </motion.div>
          </motion.div>

          {/* Кнопка раскрытия второго слоя */}
          {displayText && (
            <motion.button
              className={`task-report__expand-btn ${isExpanded ? 'is-expanded' : ''}`}
              onClick={toggleExpanded}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              type="button"
              title={isExpanded ? 'Скрыть задание' : 'Показать задание'}
            >
              <span className="task-report__expand-line" />
              <motion.span 
                className="task-report__expand-icon"
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.span>
              <span className="task-report__expand-line" />
            </motion.button>
          )}

          {/* Второй слой: Текст задания (сворачиваемый) */}
          {displayText && (
            <motion.div 
              className="task-report__layer task-report__layer--task"
              initial={false}
              animate={{ 
                height: isExpanded ? 'auto' : 0,
                opacity: isExpanded ? 1 : 0,
                paddingTop: isExpanded ? 14 : 0,
                paddingBottom: isExpanded ? 14 : 0,
                marginTop: isExpanded ? 0 : 0
              }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1]
              }}
              style={{ overflow: 'hidden' }}
            >
              <div className="task-report__task-wrapper">
                <span className="task-report__task-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                <p className="task-report__task-text">{displayText}</p>
              </div>
            </motion.div>
          )}

          {/* Анимированная линия прогресса */}
          <motion.div 
            className="task-report__progress-line"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TaskReport;
