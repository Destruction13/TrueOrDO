import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { setFeaturedAchievements } from "../../api/auth";
import { GlowingEffect } from "../ui/GlowingEffect";
import "./Achievements.css";

// ============================================
// КОНФИГУРАЦИЯ РЕДКОСТИ (с градиентами для тултипов)
// ============================================
const RARITY_CONFIG = {
  common: { 
    label: "Обычное", 
    color: "#8b8b8b", 
    xp: 10,
    gradient: "linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)",
    borderColor: "rgba(139, 139, 139, 0.3)",
    glow: "none",
  },
  rare: { 
    label: "Редкое", 
    color: "#4b9cd3", 
    xp: 25,
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #0d2840 100%)",
    borderColor: "rgba(75, 156, 211, 0.4)",
    glow: "0 0 15px rgba(75, 156, 211, 0.3)",
  },
  epic: { 
    label: "Эпическое", 
    color: "#9b59b6", 
    xp: 50,
    gradient: "linear-gradient(135deg, #4a1a6b 0%, #2d1045 100%)",
    borderColor: "rgba(155, 89, 182, 0.5)",
    glow: "0 0 20px rgba(155, 89, 182, 0.4)",
  },
  heroic: { 
    label: "Героическое", 
    color: "#e74c3c", 
    xp: 75,
    gradient: "linear-gradient(135deg, #6b1a1a 0%, #451010 100%)",
    borderColor: "rgba(231, 76, 60, 0.5)",
    glow: "0 0 25px rgba(231, 76, 60, 0.5)",
  },
  legendary: { 
    label: "Легендарное", 
    color: "#f1c40f", 
    xp: 100,
    gradient: "linear-gradient(135deg, #5c4a00 0%, #3d3100 50%, #5c4a00 100%)",
    borderColor: "rgba(241, 196, 15, 0.6)",
    glow: "0 0 30px rgba(241, 196, 15, 0.5), 0 0 60px rgba(241, 196, 15, 0.2)",
  },
  secret: { 
    label: "Секретное", 
    color: "#e91e63", 
    xp: 75,
    gradient: "linear-gradient(135deg, #5c0a2a 0%, #3d0620 100%)",
    borderColor: "rgba(233, 30, 99, 0.5)",
    glow: "0 0 20px rgba(233, 30, 99, 0.4)",
  },
};

// XP за уровень для прогрессивных достижений (умножитель от базового XP редкости)
// Уровень 1 = 1x, Уровень 2 = 1.5x, Уровень 3 = 2x, Уровень 4 = 3x, Уровень 5 = 5x
const LEVEL_XP_MULTIPLIERS = [1, 1.5, 2, 3, 5];

/**
 * Получить XP для достижения с учётом уровня
 * Для прогрессивных достижений XP растёт с уровнем
 */
function getXpForAchievement(achievement, level = 1) {
  const effectiveRarity = getRarityForLevel(achievement.rarity, level, achievement.isProgressive);
  const baseXp = RARITY_CONFIG[effectiveRarity]?.xp || 10;
  
  if (!achievement.isProgressive) {
    return baseXp;
  }
  
  // Для прогрессивных: XP за конкретный уровень
  const multiplier = LEVEL_XP_MULTIPLIERS[Math.min(level, 5) - 1] || 1;
  return Math.round(baseXp * multiplier);
}

/**
 * Получить суммарный XP за все уровни прогрессивного достижения до указанного
 */
function getTotalXpForLevel(achievement, level) {
  if (!achievement.isProgressive) {
    return getXpForAchievement(achievement, 1);
  }
  
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += getXpForAchievement(achievement, i);
  }
  return total;
}

// ============================================
// КОНФИГУРАЦИЯ КАТЕГОРИЙ (ИГРЫ)
// ============================================
const CATEGORY_CONFIG = {
  game_tod: { label: "Truth or Dare", icon: "🎭" },
  game_alias: { label: "Alias", icon: "📝" },
  game_emotional: { label: "Emotional", icon: "💭" },
  game_codenames: { label: "Codenames", icon: "🕵️" },
  social: { label: "Социальные", icon: "👥" },
  loyalty: { label: "Верность", icon: "🏅" },
  secret: { label: "Секретные", icon: "🎁" },
};

// ============================================
// СИСТЕМА МНОГОУРОВНЕВЫХ ДОСТИЖЕНИЙ
// ============================================

// Редкость по уровням: 1=common, 2=rare, 3=epic, 4=heroic, 5=legendary
const LEVEL_RARITY = ["common", "rare", "epic", "heroic", "legendary"];

// Получить редкость достижения по уровню
function getRarityForLevel(baseRarity, level, isProgressive) {
  if (!isProgressive) return baseRarity;
  return LEVEL_RARITY[Math.min(level, 5) - 1] || "legendary";
}

// Получить описание для уровня прогрессивного достижения
function getDescriptionForLevel(achievement, level) {
  if (!achievement.levels) return achievement.description;
  const target = achievement.levels[Math.min(level, 5) - 1] || achievement.levels[achievement.levels.length - 1];
  return achievement.descriptionTemplate.replace("{n}", target);
}

// Получить цель для текущего уровня
function getTargetForLevel(achievement, level) {
  if (!achievement.levels) return achievement.target || 1;
  return achievement.levels[Math.min(level, 5) - 1] || achievement.levels[achievement.levels.length - 1];
}

// Получить цель предыдущего уровня (для вычисления прогресса)
function getPrevLevelTarget(achievement, level) {
  if (!achievement.levels || level <= 1) return 0;
  return achievement.levels[level - 2] || 0;
}

// ============================================
// ВСЕ ДОСТИЖЕНИЯ (с уровнями для прогрессивных)
// ============================================
const ALL_ACHIEVEMENTS = [
  // ══════════════════════════════════════════
  // Truth or Dare
  // ══════════════════════════════════════════
  
  // Одноразовые
  { id: "tod-first-truth", name: "Первая правда", description: 'Завершить первое задание "Правда"', icon: "💬", category: "game_tod", rarity: "common", target: 1, stat: "tod.truthsCompleted" },
  { id: "tod-first-dare", name: "Смельчак", description: 'Завершить первое "Действие"', icon: "🎭", category: "game_tod", rarity: "common", target: 1, stat: "tod.daresCompleted" },
  
  // Прогрессивные (5 уровней)
  { 
    id: "tod-truth-master", 
    name: "Правдоруб", 
    descriptionTemplate: 'Выполнить {n} заданий "Правда"',
    icon: "🗣️", 
    category: "game_tod", 
    stat: "tod.truthsCompleted",
    isProgressive: true,
    levels: [5, 15, 35, 70, 150] // Уровни 1-5
  },
  { 
    id: "tod-dare-master", 
    name: "Бесстрашный", 
    descriptionTemplate: 'Выполнить {n} "Действий"',
    icon: "🔥", 
    category: "game_tod", 
    stat: "tod.daresCompleted",
    isProgressive: true,
    levels: [5, 15, 35, 70, 150]
  },
  { 
    id: "tod-chaos", 
    name: "Мастер хаоса", 
    descriptionTemplate: 'Выйти из режима "Хаос" {n} раз',
    icon: "🌀", 
    category: "game_tod", 
    stat: "tod.chaosEscapes",
    isProgressive: true,
    levels: [3, 7, 15, 30, 50]
  },
  { 
    id: "tod-redemption", 
    name: "Искупление", 
    descriptionTemplate: 'Снять статус "Позор" {n} раз',
    icon: "✨", 
    category: "game_tod", 
    stat: "tod.redemptions",
    isProgressive: true,
    levels: [3, 7, 15, 30, 50]
  },
  { 
    id: "tod-rounds", 
    name: "Легенда вечеринки", 
    descriptionTemplate: "Завершить {n} раундов",
    icon: "👑", 
    category: "game_tod", 
    stat: "tod.roundsCompleted",
    isProgressive: true,
    levels: [10, 30, 75, 150, 300]
  },
  { 
    id: "tod-perfect", 
    name: "Абсолютный чемпион", 
    descriptionTemplate: "Завершить {n} раундов без отказа",
    icon: "🏆", 
    category: "game_tod", 
    stat: "tod.perfectRounds",
    isProgressive: true,
    levels: [5, 15, 35, 75, 150]
  },

  // ══════════════════════════════════════════
  // Alias
  // ══════════════════════════════════════════
  
  // Одноразовые
  { id: "alias-first-word", name: "Первое слово", description: "Угадать первое слово", icon: "📝", category: "game_alias", rarity: "common", target: 1, stat: "alias.wordsGuessed" },
  { id: "alias-speedster", name: "Скорострел", description: "Угадать 10 слов за один раунд", icon: "⚡", category: "game_alias", rarity: "epic", target: 10, stat: "alias.bestRound" },
  
  // Прогрессивные
  { 
    id: "alias-words", 
    name: "Словесный мастер", 
    descriptionTemplate: "Угадать {n} слов",
    icon: "📚", 
    category: "game_alias", 
    stat: "alias.wordsGuessed",
    isProgressive: true,
    levels: [25, 75, 175, 400, 1000]
  },
  { 
    id: "alias-cyber", 
    name: "Киберраннер", 
    descriptionTemplate: "Набрать {n} очков в CyberRunner",
    icon: "🤖", 
    category: "game_alias", 
    stat: "alias.cyberRunnerScore",
    isProgressive: true,
    levels: [25, 50, 100, 200, 500]
  },
  { 
    id: "alias-wins", 
    name: "Легенда Alias", 
    descriptionTemplate: "Выиграть {n} игр",
    icon: "🎯", 
    category: "game_alias", 
    stat: "alias.gamesWon",
    isProgressive: true,
    levels: [5, 15, 35, 75, 150]
  },
  { 
    id: "alias-streak", 
    name: "Непобедимый", 
    descriptionTemplate: "Выиграть {n} игр подряд",
    icon: "💎", 
    category: "game_alias", 
    stat: "alias.winStreak",
    isProgressive: true,
    levels: [3, 5, 7, 10, 15]
  },

  // ══════════════════════════════════════════
  // Emotional Intelligence
  // ══════════════════════════════════════════
  
  // Одноразовые
  { id: "emotional-first-guess", name: "Первая эмоция", description: "Правильно угадать первую эмоцию", icon: "🎭", category: "game_emotional", rarity: "common", target: 1, stat: "emotional.correctGuesses" },
  
  // Прогрессивные
  { 
    id: "emotional-guesses", 
    name: "Эмпат", 
    descriptionTemplate: "Правильно угадать {n} эмоций",
    icon: "💜", 
    category: "game_emotional", 
    stat: "emotional.correctGuesses",
    isProgressive: true,
    levels: [10, 35, 100, 250, 500]
  },
  { 
    id: "emotional-wins", 
    name: "Эмоциональный интеллект", 
    descriptionTemplate: "Выиграть {n} игр в Emotional",
    icon: "🏆", 
    category: "game_emotional", 
    stat: "emotional.gamesWon",
    isProgressive: true,
    levels: [5, 15, 35, 75, 150]
  },

  // ══════════════════════════════════════════
  // Codenames
  // ══════════════════════════════════════════
  
  // Одноразовые
  { id: "cn-rookie", name: "Шпион-новичок", description: "Первая победа", icon: "🕵️", category: "game_codenames", rarity: "common", target: 1, stat: "codenames.gamesWon" },
  { id: "cn-master", name: "Мастер ассоциаций", description: "Дать подсказку на 4+ слов", icon: "💡", category: "game_codenames", rarity: "epic", target: 4, stat: "codenames.bestHint" },
  
  // Прогрессивные
  { 
    id: "cn-wins", 
    name: "Легенда разведки", 
    descriptionTemplate: "Одержать {n} побед",
    icon: "🎖️", 
    category: "game_codenames", 
    stat: "codenames.gamesWon",
    isProgressive: true,
    levels: [5, 15, 35, 75, 150]
  },

  // ══════════════════════════════════════════
  // Социальные
  // ══════════════════════════════════════════
  
  // Прогрессивные
  { 
    id: "social-friends", 
    name: "Душа компании", 
    descriptionTemplate: "Добавить {n} друзей",
    icon: "🎉", 
    category: "social", 
    stat: "social.friends",
    isProgressive: true,
    levels: [1, 5, 15, 50, 100]
  },
  { 
    id: "social-messages", 
    name: "Болтун", 
    descriptionTemplate: "Отправить {n} сообщений",
    icon: "💬", 
    category: "social", 
    stat: "social.messagesSent",
    isProgressive: true,
    levels: [50, 200, 500, 1500, 5000]
  },

  // ══════════════════════════════════════════
  // Верность
  // ══════════════════════════════════════════
  
  // Одноразовые
  { id: "social-newcomer", name: "Новичок", description: "Зарегистрироваться", icon: "🌱", category: "loyalty", rarity: "common", target: 1, stat: "loyalty.registered" },
  { id: "loyalty-vip", name: "VIP-статус", description: "Приобрести VIP", icon: "💜", category: "loyalty", rarity: "rare", target: 1, stat: "loyalty.isVip" },
  { id: "loyalty-pro", name: "PRO-статус", description: "Приобрести PRO", icon: "💎", category: "loyalty", rarity: "epic", target: 1, stat: "loyalty.isPro" },
  
  // Прогрессивные
  { 
    id: "loyalty-streak", 
    name: "Постоянный игрок", 
    descriptionTemplate: "Играть {n} дней подряд",
    icon: "📅", 
    category: "loyalty", 
    stat: "loyalty.loginStreak",
    isProgressive: true,
    levels: [3, 7, 14, 30, 60]
  },
  { 
    id: "loyalty-days", 
    name: "Легенда платформы", 
    descriptionTemplate: "Быть на платформе {n} дней",
    icon: "🏛️", 
    category: "loyalty", 
    stat: "loyalty.daysOnPlatform",
    isProgressive: true,
    levels: [7, 30, 90, 180, 365]
  },

  // ══════════════════════════════════════════
  // Секретные (без уровней)
  // ══════════════════════════════════════════
  { id: "secret-night-owl", name: "Ночная сова", description: "Играть в 3 часа ночи", icon: "🦉", category: "secret", rarity: "secret", isSecret: true },
  { id: "secret-all-games", name: "Мастер на все руки", description: "Сыграть во все типы игр за день", icon: "🎲", category: "secret", rarity: "secret", isSecret: true },
  { id: "secret-easter-egg", name: "Охотник за пасхалками", description: "Найти пасхалку", icon: "🥚", category: "secret", rarity: "secret", isSecret: true },
];

// ============================================
// КОМПОНЕНТ: Тултип для витрины
// ============================================
function ShowcaseTooltip({ achievement, level = 1, position }) {
  const category = CATEGORY_CONFIG[achievement.category];
  const effectiveRarity = getRarityForLevel(achievement.rarity, level, achievement.isProgressive);
  const rarity = RARITY_CONFIG[effectiveRarity];
  const description = achievement.isProgressive 
    ? getDescriptionForLevel(achievement, level)
    : achievement.description;
  
  return (
    <motion.div 
      className="showcase-tooltip"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.15 }}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="showcase-tooltip__game">
        {category?.icon} {category?.label}
      </div>
      <div className="showcase-tooltip__name">
        {achievement.name}
        {achievement.isProgressive && (
          <span className="showcase-tooltip__level"> Ур. {level}</span>
        )}
      </div>
      <div className="showcase-tooltip__desc">{description}</div>
      <div className="showcase-tooltip__rarity" style={{ color: rarity?.color }}>
        {rarity?.label} • +{getXpForAchievement(achievement, level)} XP
      </div>
    </motion.div>
  );
}

// ============================================
// КОМПОНЕНТ: Бейдж витрины (с тултипом через portal, как в мини-профиле)
// ============================================
function ShowcaseBadge({ achievement, level = 1, onRemove, editable }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const effectiveRarity = getRarityForLevel(achievement.rarity, level, achievement.isProgressive);
  const rarity = RARITY_CONFIG[effectiveRarity];
  const category = CATEGORY_CONFIG[achievement.category];
  const description = achievement.isProgressive 
    ? getDescriptionForLevel(achievement, level)
    : achievement.description;
  
  // Пересчитываем позицию тултипа после его рендера (когда знаем реальную высоту)
  useLayoutEffect(() => {
    if (showTooltip && tooltipRef.current && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const tooltipWidth = 240;
      const gap = 12;
      const padding = 16;
      
      // Ищем контейнер витрины для ограничения позиции
      const showcase = badgeRef.current.closest('.achievement-showcase');
      const containerRect = showcase ? showcase.getBoundingClientRect() : null;
      
      // Границы для позиционирования
      const leftBound = containerRect ? containerRect.left + padding : padding;
      const rightBound = containerRect ? containerRect.right - padding : window.innerWidth - padding;
      
      // Позиция тултипа - над элементом (используем реальную высоту тултипа)
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let top = rect.top - tooltipRect.height - gap;
      
      // Корректируем если выходит за левую границу контейнера
      if (left < leftBound) {
        left = leftBound;
      }
      // Корректируем если выходит за правую границу контейнера
      if (left + tooltipWidth > rightBound) {
        left = rightBound - tooltipWidth;
      }
      
      setTooltipStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${tooltipWidth}px`,
        visibility: 'visible',
      });
    }
  }, [showTooltip]);
  
  // Показываем тултип при наведении (изначально невидимый для измерения)
  const handleMouseEnter = useCallback(() => {
    setTooltipStyle({
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '240px',
      visibility: 'hidden',
    });
    setShowTooltip(true);
  }, []);
  
  // Клик для мобильных устройств - toggle тултипа
  const handleClick = useCallback((e) => {
    // Если это кнопка удаления — не обрабатываем
    if (e.target.closest('.showcase-badge__remove')) return;
    e.stopPropagation();
    
    if (showTooltip) {
      setShowTooltip(false);
    } else {
      setTooltipStyle({
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '240px',
        visibility: 'hidden',
      });
      setShowTooltip(true);
    }
  }, [showTooltip]);
  
  return (
    <div 
      ref={badgeRef}
      className={`showcase-badge showcase-badge--${effectiveRarity} ${showTooltip ? 'showcase-badge--active' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
      tabIndex={0}
      style={{ "--rarity-color": rarity?.color }}
    >
      {/* Внутренний контейнер для shimmer эффекта с overflow: hidden */}
      <div className="showcase-badge__shimmer-container" />
      <span className="showcase-badge__icon">{achievement.icon}</span>
      {/* Отображение уровня для прогрессивных достижений */}
      {achievement.isProgressive && (
        <span className="showcase-badge__level">{level}</span>
      )}
      {editable && (
        <button 
          className="showcase-badge__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(achievement.id);
          }}
        >
          ×
        </button>
      )}
      
      {showTooltip && createPortal(
        <motion.div 
          ref={tooltipRef}
          className={`showcase-tooltip showcase-tooltip--portal showcase-tooltip--${effectiveRarity}`}
          style={{
            ...tooltipStyle,
            "--rarity-color": rarity?.color,
            "--rarity-gradient": rarity?.gradient,
            "--rarity-border": rarity?.borderColor,
            "--rarity-glow": rarity?.glow,
          }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {/* Эффект свечения для редких+ */}
          {effectiveRarity !== 'common' && (
            <div className="showcase-tooltip__glow" />
          )}
          
          <div className="showcase-tooltip__header">
            <div className="showcase-tooltip__icon-wrapper">
              <span className="showcase-tooltip__icon-large">{achievement.icon}</span>
            </div>
            <div className="showcase-tooltip__info">
              <span className="showcase-tooltip__name">
                {achievement.name}
              </span>
              <span 
                className="showcase-tooltip__rarity-label"
                style={{ color: rarity?.color }}
              >
                {rarity?.label}
              </span>
            </div>
          </div>
          
          <div className="showcase-tooltip__game">
            <span>{category?.icon}</span>
            <span>{category?.label}</span>
          </div>
          
          <p className="showcase-tooltip__desc">{description}</p>
          
          {achievement.isProgressive && level > 0 && (
            <div className="showcase-tooltip__level-info">
              <span className="showcase-tooltip__level-star">★</span>
              Уровень {level}
            </div>
          )}
          
          {/* Прогресс-бар для достижений с прогрессом (не на максимальном уровне) */}
          {achievement.progress && !achievement.progress.isMaxed ? (
            <div className="showcase-tooltip__progress">
              <div className="showcase-tooltip__progress-header">
                <span className="showcase-tooltip__progress-label">До уровня {level + 1}</span>
                <span className="showcase-tooltip__progress-value">{achievement.progress.current} / {achievement.progress.target}</span>
              </div>
              <div className="showcase-tooltip__progress-bar">
                <div 
                  className="showcase-tooltip__progress-fill"
                  style={{ 
                    width: `${Math.min(100, (achievement.progress.current / achievement.progress.target) * 100)}%`,
                    backgroundColor: rarity?.color 
                  }}
                />
              </div>
              <span className="showcase-tooltip__progress-remaining">
                Осталось: {achievement.progress.target - achievement.progress.current}
              </span>
            </div>
          ) : (
            <div className="showcase-tooltip__xp">
              +{getXpForAchievement(achievement, level)} XP
            </div>
          )}
        </motion.div>,
        document.body
      )}
    </div>
  );
}

// ============================================
// КОМПОНЕНТ: Кнопка добавления в витрину
// ============================================
function ShowcaseAddButton({ onClick }) {
  return (
    <button className="showcase-add-btn" onClick={onClick}>
      <span className="showcase-add-btn__icon">+</span>
    </button>
  );
}

// ============================================
// КОМПОНЕНТ: Модальное окно выбора достижения
// ============================================
function AchievementPickerModal({ achievements, unlockedData, showcaseIds, onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Фильтруем только разблокированные, не в витрине
  const availableAchievements = useMemo(() => {
    return achievements
      .filter(a => {
        const isUnlocked = unlockedData.has(a.id);
        const inShowcase = showcaseIds.includes(a.id);
        const matchesCategory = activeCategory === "all" || a.category === activeCategory;
        return isUnlocked && !inShowcase && matchesCategory;
      })
      .map(a => ({
        achievement: a,
        level: unlockedData.get(a.id)?.level || 1
      }));
  }, [achievements, unlockedData, showcaseIds, activeCategory]);
  
  return (
    <div className="achievement-picker-backdrop" onClick={onClose}>
      <motion.div 
        className="achievement-picker"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="achievement-picker__header">
          <h3>Выбрать достижение</h3>
          <button className="achievement-picker__close" onClick={onClose}>×</button>
        </div>
        
        {/* Фильтр по категориям */}
        <div className="achievement-picker__categories">
          <button 
            className={`achievement-picker__cat-btn ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            Все
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              className={`achievement-picker__cat-btn ${activeCategory === key ? "active" : ""}`}
              onClick={() => setActiveCategory(key)}
            >
              {config.icon}
            </button>
          ))}
        </div>
        
        {/* Список доступных достижений */}
        <div className="achievement-picker__list">
          {availableAchievements.length === 0 ? (
            <div className="achievement-picker__empty">
              Нет доступных достижений
            </div>
          ) : (
            availableAchievements.map(({ achievement, level }) => {
              const effectiveRarity = getRarityForLevel(achievement.rarity, level, achievement.isProgressive);
              const rarity = RARITY_CONFIG[effectiveRarity];
              const category = CATEGORY_CONFIG[achievement.category];
              return (
                <button
                  key={achievement.id}
                  className="achievement-picker__item"
                  onClick={() => onSelect(achievement.id)}
                  style={{ "--rarity-color": rarity?.color }}
                >
                  <span className="achievement-picker__item-icon">
                    {achievement.icon}
                    {achievement.isProgressive && (
                      <span className="achievement-picker__item-level">{level}</span>
                    )}
                  </span>
                  <div className="achievement-picker__item-info">
                    <div className="achievement-picker__item-name">
                      {achievement.name}
                      {achievement.isProgressive && <span className="achievement-picker__item-lvl-text"> Ур. {level}</span>}
                    </div>
                    <div className="achievement-picker__item-game">{category?.icon} {category?.label}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// КОМПОНЕНТ: Витрина достижений
// ============================================
function AchievementShowcase({ showcaseIds, achievements, unlockedData, onAdd, onRemove, editable }) {
  const [showPicker, setShowPicker] = useState(false);
  
  const showcaseAchievements = useMemo(() => {
    return showcaseIds
      .map(id => {
        const achievement = achievements.find(a => a.id === id);
        if (!achievement) {
          console.warn("[AchievementShowcase] Achievement not found for id:", id);
          return null;
        }
        const unlockInfo = unlockedData.get(id);
        return { 
          achievement: {
            ...achievement,
            progress: unlockInfo?.progress || null  // Добавляем прогресс к достижению
          }, 
          level: unlockInfo?.level || 1 
        };
      })
      .filter(Boolean);
  }, [showcaseIds, achievements, unlockedData]);
  
  // Используем реальное количество отображаемых достижений, а не showcaseIds
  const canAddMore = showcaseAchievements.length < 6;
  
  return (
    <div className="achievement-showcase">
      <div className="achievement-showcase__grid">
        {showcaseAchievements.map(({ achievement, level }) => (
          <ShowcaseBadge 
            key={achievement.id}
            achievement={achievement}
            level={level}
            onRemove={onRemove}
            editable={editable}
          />
        ))}
        
        {editable && canAddMore && (
          <ShowcaseAddButton onClick={() => setShowPicker(true)} />
        )}
        
        {/* Пустые слоты */}
        {!editable && showcaseAchievements.length === 0 && (
          <div className="achievement-showcase__empty">
            Нет избранных достижений
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {showPicker && (
          <AchievementPickerModal
            achievements={achievements}
            unlockedData={unlockedData}
            showcaseIds={showcaseIds}
            onSelect={(id) => {
              onAdd(id);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Вычислить уровень на основе прогресса для прогрессивных достижений
// ============================================
function calculateLevelFromProgress(achievement, progress) {
  if (!achievement.isProgressive || !achievement.levels) return 0;
  
  // Находим максимальный достигнутый уровень
  for (let i = achievement.levels.length - 1; i >= 0; i--) {
    if (progress >= achievement.levels[i]) {
      return i + 1; // уровень = индекс + 1
    }
  }
  return 0; // Ещё не достигнут первый уровень
}

// ============================================
// КОМПОНЕНТ: Карточка достижения в списке
// ============================================
function AchievementListItem({ achievement, unlocked, progress, level = 0 }) {
  const isProgressive = achievement.isProgressive;
  const isOneTime = !isProgressive; // Одноразовые достижения
  
  // Для прогрессивных: вычисляем уровень на основе прогресса
  // (серверный level может быть устаревшим, поэтому берём максимум)
  const calculatedLevel = isProgressive ? calculateLevelFromProgress(achievement, progress) : 0;
  const currentLevel = Math.max(level || 0, calculatedLevel);
  const nextLevel = Math.min(currentLevel + 1, 5);
  const isMaxLevel = isProgressive && currentLevel >= 5;
  
  // Для прогрессивных: разблокировано если уровень >= 1
  // Для одноразовых: разблокировано если сервер сказал ИЛИ прогресс >= цели
  const targetForOneTime = achievement.target || 1;
  const isUnlocked = isProgressive 
    ? currentLevel >= 1 
    : (unlocked || progress >= targetForOneTime);
  
  // Секретные достижения скрывают детали пока не разблокированы
  const isSecret = achievement.isSecret && !isUnlocked;
  
  // Вычисляем редкость:
  // - Для прогрессивных: по уровню (или уровень 1 если ещё не получено)
  // - Для одноразовых: базовая редкость из определения
  const effectiveRarity = isProgressive 
    ? getRarityForLevel(achievement.rarity, Math.max(currentLevel, 1), true)
    : (achievement.rarity || "common");
  const rarity = RARITY_CONFIG[effectiveRarity];
  
  // Описание:
  // - Для прогрессивных: показываем цель следующего уровня (или текущего если макс)
  // - Для одноразовых: статическое описание
  const description = isProgressive
    ? getDescriptionForLevel(achievement, isMaxLevel ? currentLevel : nextLevel)
    : achievement.description;
  
  // Вычисляем прогресс
  const current = progress || 0;
  let target, prevTarget, percent, displayCurrent;
  
  if (isProgressive) {
    // Для прогрессивных: прогресс относительно следующего уровня
    target = getTargetForLevel(achievement, isMaxLevel ? currentLevel : nextLevel);
    prevTarget = isMaxLevel ? getPrevLevelTarget(achievement, currentLevel) : getPrevLevelTarget(achievement, nextLevel);
    const progressInLevel = current - prevTarget;
    const levelRange = target - prevTarget;
    percent = isMaxLevel ? 100 : Math.min(100, Math.max(0, Math.round((progressInLevel / levelRange) * 100)));
    // Показываем прогресс относительно текущего уровня (от prevTarget до target)
    displayCurrent = current;
  } else {
    // Для одноразовых
    target = achievement.target || 1;
    prevTarget = 0;
    percent = isUnlocked ? 100 : Math.min(100, Math.round((current / target) * 100));
    displayCurrent = current;
  }
  
  // Показываем прогресс:
  // - Для одноразовых: только если НЕ выполнено
  // - Для прогрессивных: если не макс уровень
  // - Не показываем для секретных
  const showProgress = !isSecret && (
    (isOneTime && !isUnlocked && achievement.target) ||
    (isProgressive && !isMaxLevel)
  );
  
  // Вычисляем XP для отображения
  // Для прогрессивных: показываем XP за следующий уровень (или текущий если макс)
  // Для одноразовых: показываем XP за достижение
  const displayXp = isProgressive
    ? getXpForAchievement(achievement, isMaxLevel ? currentLevel : nextLevel)
    : getXpForAchievement(achievement, 1);
  
  return (
    <div 
      className={`achievement-list-item ${isUnlocked ? "achievement-list-item--unlocked" : ""} ${isMaxLevel ? "achievement-list-item--maxed" : ""}`}
      style={{ "--rarity-color": rarity?.color }}
    >
      <div className="achievement-list-item__icon">
        {isSecret ? "❓" : achievement.icon}
        {/* Бейдж уровня для прогрессивных */}
        {isProgressive && currentLevel > 0 && (
          <span className="achievement-list-item__level-badge">{currentLevel}</span>
        )}
      </div>
      <div className="achievement-list-item__info">
        <div className="achievement-list-item__name">
          {isSecret ? "???" : achievement.name}
          {isProgressive && currentLevel > 0 && (
            <span className="achievement-list-item__level-text"> (Ур. {currentLevel})</span>
          )}
        </div>
        <div className="achievement-list-item__desc">
          {isSecret ? "Секретное достижение" : description}
        </div>
        {showProgress && (
          <div className="achievement-list-item__progress">
            <div className="achievement-list-item__progress-bar">
              <div 
                className="achievement-list-item__progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="achievement-list-item__progress-text">
              {displayCurrent} / {target}
            </span>
          </div>
        )}
        {isMaxLevel && (
          <div className="achievement-list-item__maxed-text">✨ Максимальный уровень</div>
        )}
        {/* Для выполненных одноразовых показываем "Выполнено" */}
        {isOneTime && isUnlocked && (
          <div className="achievement-list-item__completed-text">✅ Выполнено</div>
        )}
      </div>
      <div className="achievement-list-item__meta">
        <span className="achievement-list-item__rarity" style={{ color: rarity?.color }}>
          {rarity?.label}
        </span>
        {/* XP badge */}
        <span className="achievement-list-item__xp">
          +{displayXp} XP
        </span>
        {isUnlocked && <span className="achievement-list-item__check">✓</span>}
      </div>
    </div>
  );
}

// ============================================
// КОМПОНЕНТ: Toast уведомление
// ============================================
export function AchievementToast({ achievement, onClose }) {
  const rarity = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
  
  return (
    <motion.div 
      className="achievement-toast"
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ "--rarity-color": rarity.color }}
    >
      <div className="achievement-toast__icon">{achievement.icon}</div>
      <div className="achievement-toast__content">
        <div className="achievement-toast__header">🏆 Достижение получено!</div>
        <div className="achievement-toast__name">{achievement.name}</div>
        <div className="achievement-toast__xp">+{rarity.xp} XP</div>
      </div>
      <button className="achievement-toast__close" onClick={onClose}>×</button>
    </motion.div>
  );
}

/**
 * Получить значение прогресса для достижения из статистики
 */
function getProgressForAchievement(achievement, statsData) {
  if (!achievement.stat || !statsData) {
    return 0;
  }
  
  const [game, field] = achievement.stat.split(".");
  
  // Маппинг категорий на gameType в статистике
  const gameTypeMap = {
    tod: "tod",
    alias: "alias",
    emotional: "emotional",
    codenames: "codenames",
    social: "social",
    loyalty: "loyalty"
  };
  
  const gameType = gameTypeMap[game];
  if (!gameType) return 0;
  
  // Ищем статистику игры
  const gameStat = statsData.byGame?.find(g => g.gameType === gameType);
  
  if (gameStat) {
    // Проверяем в customStats (приоритет)
    const customStats = gameStat.customStats || {};
    if (customStats[field] !== undefined) {
      return Number(customStats[field]) || 0;
    }
    
    // Проверяем в основных полях
    if (gameStat[field] !== undefined) {
      return Number(gameStat[field]) || 0;
    }
  }
  
  // Для loyalty проверяем в user данных
  if (game === "loyalty" && statsData.user) {
    if (field === "loginStreak") return statsData.user.loginStreak || 0;
    if (field === "registered") return 1; // Если есть user — значит зарегистрирован
    if (field === "daysOnPlatform") {
      const memberSince = statsData.user.memberSince;
      if (memberSince) {
        const days = Math.floor((Date.now() - new Date(memberSince).getTime()) / (1000 * 60 * 60 * 24));
        return days;
      }
    }
    if (field === "isVip") return statsData.user.subscriptionTier === "VIP" || statsData.user.subscriptionTier === "PRO" ? 1 : 0;
    if (field === "isPro") return statsData.user.subscriptionTier === "PRO" ? 1 : 0;
  }
  
  // Для social проверяем в user данных
  if (game === "social" && statsData.user) {
    if (field === "friends") return statsData.user.friendsCount || 0;
  }
  
  // Также проверим в общей статистике (totals)
  if (statsData.totals) {
    if (statsData.totals[field] !== undefined) {
      return statsData.totals[field];
    }
  }
  
  return 0;
}

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================
export default function Achievements({ data, loading, allAchievements: serverAchievements, statsData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showcaseIds, setShowcaseIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Всегда используем полный локальный список достижений
  // Серверные достижения используются только для определения разблокированных
  const allAchievements = ALL_ACHIEVEMENTS;
  
  // Инициализация витрины из данных сервера (featured)
  useEffect(() => {
    if (data?.featured && data.featured.length > 0) {
      // Используем slug, так как локальные достижения используют slug как id
      const ids = data.featured.map(a => a.slug || a.id);
      setShowcaseIds(ids);
    }
  }, [data?.featured]);
  
  // Собираем разблокированные достижения с уровнями
  // Map<id, { level: number, unlockedAt: Date }>
  const unlockedData = useMemo(() => {
    const map = new Map();
    
    // Добавляем данные из разных источников сервера
    const processAchievement = (a) => {
      const id = a.slug || a.id;
      const level = a.level || 1;
      const existing = map.get(id);
      // Сохраняем максимальный уровень и прогресс
      if (!existing || level > existing.level) {
        map.set(id, { 
          level, 
          unlockedAt: a.unlockedAt || a.leveledUpAt,
          progress: a.progress || null  // Сохраняем прогресс с сервера
        });
      }
    };
    
    if (data?.byCategory) {
      Object.values(data.byCategory).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(processAchievement);
        }
      });
    }
    if (data?.recent) {
      data.recent.forEach(processAchievement);
    }
    if (data?.featured) {
      data.featured.forEach(processAchievement);
    }
    // Fallback для старого формата unlockedIds
    if (data?.unlockedIds) {
      data.unlockedIds.forEach(id => {
        if (!map.has(id)) {
          map.set(id, { level: 1 });
        }
      });
    }
    
    console.log("[Achievements] Unlocked data:", [...map.entries()]);
    return map;
  }, [data]);
  
  // Статистика (считаем уникальные разблокированные + сумму уровней)
  const stats = useMemo(() => {
    let unlocked = 0;
    let totalLevels = 0;
    let maxPossibleLevels = 0;
    
    allAchievements.forEach(a => {
      const unlockInfo = unlockedData.get(a.id);
      if (unlockInfo) {
        unlocked++;
        totalLevels += unlockInfo.level;
      }
      // Подсчёт максимально возможных уровней
      maxPossibleLevels += a.isProgressive ? 5 : 1;
    });
    
    const total = allAchievements.length;
    return {
      unlocked,
      total,
      totalLevels,
      maxPossibleLevels,
      progress: Math.round((totalLevels / maxPossibleLevels) * 100),
    };
  }, [allAchievements, unlockedData]);
  
  // Фильтрация по категории
  const filteredAchievements = useMemo(() => {
    if (activeCategory === "all") return allAchievements;
    return allAchievements.filter(a => a.category === activeCategory);
  }, [activeCategory, allAchievements]);
  
  // Сохранение витрины на сервер
  const saveShowcase = useCallback(async (newIds) => {
    setIsSaving(true);
    try {
      await setFeaturedAchievements(newIds);
    } catch (error) {
      console.error("Failed to save showcase:", error);
      // Можно добавить toast-уведомление об ошибке
    } finally {
      setIsSaving(false);
    }
  }, []);
  
  // Добавить в витрину
  const handleAddToShowcase = useCallback((id) => {
    if (showcaseIds.length < 6 && !showcaseIds.includes(id)) {
      const newIds = [...showcaseIds, id];
      setShowcaseIds(newIds);
      saveShowcase(newIds);
    }
  }, [showcaseIds, saveShowcase]);
  
  // Удалить из витрины
  const handleRemoveFromShowcase = useCallback((id) => {
    const newIds = showcaseIds.filter(sid => sid !== id);
    setShowcaseIds(newIds);
    saveShowcase(newIds);
  }, [showcaseIds, saveShowcase]);
  
  if (loading) {
    return (
      <div className="achievements achievements--loading">
        <div className="achievements__skeleton" />
      </div>
    );
  }

  return (
    <div className="achievements">
      {/* Эффект свечения по границе */}
      <GlowingEffect 
        borderWidth={2}
        glowSize={180}
        proximity={80}
        glowColors={["#f1c40f", "#2ee6ff", "#9b59b6"]}
      />
      
      {/* Заголовок */}
      <div className="achievements__header">
        <div className="achievements__title">
          <span className="achievements__title-text">
            <span className="achievements__title-icon">🏆</span>
            <span className="achievements__title-label">Достижения</span>
          </span>
          <span className="achievements__count">
            <span className="achievements__count-current">{stats.unlocked}</span>
            <span className="achievements__count-separator">/</span>
            <span className="achievements__count-total">{stats.total}</span>
          </span>
        </div>
        <div className="achievements__progress-bar">
          <div 
            className="achievements__progress-fill"
            style={{ width: `${stats.progress}%` }}
          />
          <div className="achievements__progress-glow" style={{ width: `${stats.progress}%` }} />
        </div>
      </div>
      
      {/* Витрина */}
      <AchievementShowcase
        showcaseIds={showcaseIds}
        achievements={allAchievements}
        unlockedData={unlockedData}
        onAdd={handleAddToShowcase}
        onRemove={handleRemoveFromShowcase}
        editable={true}
      />
      
      {/* Кнопка раскрытия списка */}
      <motion.button 
        className="achievements__expand-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className="achievements__expand-btn-bg" />
        <span className="achievements__expand-btn-shimmer" />
        <span className="achievements__expand-btn-text">
          {isExpanded ? "Скрыть все достижения" : "Показать все достижения"}
        </span>
        <motion.span 
          className="achievements__expand-btn-arrow"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </motion.span>
      </motion.button>
      
      {/* Полный список */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div 
            className="achievements__full-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.3, delay: 0.1 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2 }
              }
            }}
          >
            {/* Категории */}
            <div className="achievements__categories">
              <button 
                className={`achievements__cat-btn ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                Все
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  className={`achievements__cat-btn ${activeCategory === key ? "active" : ""}`}
                  onClick={() => setActiveCategory(key)}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
            
            {/* Список */}
            <div className="achievements__list">
              {filteredAchievements.map(achievement => {
                const unlockInfo = unlockedData.get(achievement.id);
                const progress = getProgressForAchievement(achievement, statsData);
                // Debug: uncomment to see progress values
                // if (achievement.isProgressive && progress > 0) {
                //   console.log(`[Achievement] ${achievement.id}: progress=${progress}, level=${unlockInfo?.level}`);
                // }
                return (
                  <AchievementListItem
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={!!unlockInfo}
                    level={unlockInfo?.level || 0}
                    progress={progress}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
