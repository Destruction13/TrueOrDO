import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./GameTagsPopover.css";

/**
 * Конфигурация тегов по категориям
 * Референс: fullprofdoska.png — теги на карточках игр
 */

// Раздел "Опыт" — выбрать один
const EXPERIENCE_TAGS = [
  { id: "amateur", label: "Любитель", icon: "🎮", color: "#6c757d" },
  { id: "experienced", label: "Опытный", icon: "🎮", color: "#28a745" },
  { id: "expert", label: "Эксперт", icon: "🎮", color: "#ffc107" },
  { id: "better_than_you", label: "Лучше тебя", icon: "🎮", color: "#e74c3c" },
];

// Раздел "Рейтинг" — выбрать один
const RATING_TAGS = [
  { id: "cant_stop", label: "Не оторваться", icon: "👍", color: "#28a745" },
  { id: "love", label: "Люблю", icon: "❤️", color: "#e74c3c" },
  { id: "like_many", label: "Много чего нравится", icon: "👌", color: "#17a2b8" },
  { id: "hate_many", label: "Много чего бесит", icon: "😤", color: "#fd7e14" },
  { id: "ragequit", label: "Рейджквит", icon: "💢", color: "#dc3545" },
];

// Раздел "Поиск" — можно несколько
const SEARCH_TAGS = [
  { id: "looking_group", label: "Ищу группу", icon: "👥", color: "#6f42c1" },
  { id: "want_to_play", label: "Интересно поиграть", icon: "🎲", color: "#20c997" },
  { id: "need_tips", label: "Нужны советы", icon: "❓", color: "#17a2b8" },
  { id: "can_teach", label: "Могу научить", icon: "📚", color: "#ffc107" },
  { id: "want_discuss", label: "Хочу обсудить", icon: "💬", color: "#6c757d" },
];

// Экспорт конфигов для использования в других компонентах
export const TAG_CONFIG = {
  experience: EXPERIENCE_TAGS,
  rating: RATING_TAGS,
  search: SEARCH_TAGS,
};

/**
 * Получить данные тега по id
 */
export function getTagById(tagId) {
  const allTags = [...EXPERIENCE_TAGS, ...RATING_TAGS, ...SEARCH_TAGS];
  return allTags.find(t => t.id === tagId) || null;
}

/**
 * GameTagsPopover — попап выбора тегов для игры
 * 
 * Props:
 * - isOpen: boolean — показывать ли попап
 * - onClose: () => void — закрыть попап
 * - onSave: (tags) => void — сохранить теги (вызывается автоматически при изменении)
 * - initialTags: { experience?: string, rating?: string, search?: string[] }
 * - anchorRef: React.RefObject — элемент для позиционирования
 * - gameName: string — название игры (для заголовка)
 */
function GameTagsPopover({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTags = {},
  anchorRef,
  gameName = "игры"
}) {
  const popoverRef = useRef(null);
  
  // Позиция попапа (справа от кнопки)
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  // Состояние выбранных тегов
  const [selectedExperience, setSelectedExperience] = useState(initialTags.experience || null);
  const [selectedRating, setSelectedRating] = useState(initialTags.rating || []);
  const [selectedSearch, setSelectedSearch] = useState(initialTags.search || []);
  
  // Вычисление позиции попапа справа от anchor элемента
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;
    
    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = 200;
      const popoverHeight = 400;
      const gap = 8;
      
      let left = rect.right + gap;
      let top = rect.top;
      
      // Проверка выхода за правый край экрана
      if (left + popoverWidth > window.innerWidth - 16) {
        // Показываем слева от кнопки
        left = rect.left - popoverWidth - gap;
      }
      
      // Проверка выхода за нижний край
      if (top + popoverHeight > window.innerHeight - 16) {
        top = window.innerHeight - popoverHeight - 16;
      }
      
      // Проверка выхода за верхний край
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    };
    
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef, selectedExperience, selectedRating, selectedSearch]);

  // Синхронизация с initialTags при изменении (только при открытии)
  useEffect(() => {
    if (isOpen) {
      setSelectedExperience(initialTags.experience || null);
      // Поддержка старого формата (string) и нового (array)
      const ratingValue = initialTags.rating;
      if (Array.isArray(ratingValue)) {
        setSelectedRating(ratingValue);
      } else if (ratingValue) {
        setSelectedRating([ratingValue]);
      } else {
        setSelectedRating([]);
      }
      setSelectedSearch(initialTags.search || []);
    }
  }, [isOpen]);

  // Закрытие по клику вне попапа (с автосохранением)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Проверяем, не кликнули ли на anchor
        if (anchorRef?.current && anchorRef.current.contains(e.target)) {
          return;
        }
        // Сохраняем перед закрытием
        onSave({
          experience: selectedExperience,
          rating: selectedRating,
          search: selectedSearch,
        });
        onClose();
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        // Сохраняем перед закрытием
        onSave({
          experience: selectedExperience,
          rating: selectedRating,
          search: selectedSearch,
        });
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, anchorRef, onSave, selectedExperience, selectedRating, selectedSearch]);

  // Выбор тега опыта с мгновенным сохранением
  const handleExperienceChange = (tagId) => {
    setSelectedExperience(tagId);
    onSave({
      experience: tagId,
      rating: selectedRating,
      search: selectedSearch,
    });
  };
  
  // Переключение тега рейтинга с мгновенным сохранением (множественный выбор)
  const handleRatingChange = (tagId) => {
    const newRating = selectedRating.includes(tagId)
      ? selectedRating.filter(id => id !== tagId)
      : [...selectedRating, tagId];
    setSelectedRating(newRating);
    onSave({
      experience: selectedExperience,
      rating: newRating,
      search: selectedSearch,
    });
  };

  // Переключение search тега с мгновенным сохранением
  const toggleSearchTag = (tagId) => {
    const newSearch = selectedSearch.includes(tagId)
      ? selectedSearch.filter(id => id !== tagId)
      : [...selectedSearch, tagId];
    setSelectedSearch(newSearch);
    onSave({
      experience: selectedExperience,
      rating: selectedRating,
      search: newSearch,
    });
  };

  // Сброс тега опыта с мгновенным сохранением
  const clearExperience = () => {
    setSelectedExperience(null);
    onSave({
      experience: null,
      rating: selectedRating,
      search: selectedSearch,
    });
  };
  
  // Сброс тегов рейтинга с мгновенным сохранением
  const clearRating = () => {
    setSelectedRating([]);
    onSave({
      experience: selectedExperience,
      rating: [],
      search: selectedSearch,
    });
  };

  // Ручное сохранение по кнопке (закрывает popup)
  const handleSave = () => {
    onSave({
      experience: selectedExperience,
      rating: selectedRating,
      search: selectedSearch,
    });
    onClose();
  };

  // Сброс всех тегов с мгновенным сохранением
  const handleClear = () => {
    setSelectedExperience(null);
    setSelectedRating([]);
    setSelectedSearch([]);
    onSave({
      experience: null,
      rating: [],
      search: [],
    });
  };

  // Подсчёт выбранных тегов
  const selectedCount = 
    (selectedExperience ? 1 : 0) + 
    selectedRating.length + 
    selectedSearch.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          className="game-tags-popover"
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, scale: 0.95, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: -10 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className="game-tags-popover__header">
            <h4 className="game-tags-popover__title">
              Теги для {gameName}
            </h4>
            <button 
              className="game-tags-popover__close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {/* Секция Опыт */}
          <section className="game-tags-popover__section">
            <div className="game-tags-popover__section-header">
              <h5 className="game-tags-popover__section-title">Опыт</h5>
              {selectedExperience && (
                <button 
                  className="game-tags-popover__clear-btn"
                  onClick={clearExperience}
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="game-tags-popover__options">
              {EXPERIENCE_TAGS.map(tag => (
                <label 
                  key={tag.id} 
                  className={`game-tags-popover__option ${selectedExperience === tag.id ? "game-tags-popover__option--selected" : ""}`}
                  style={{ "--tag-color": tag.color }}
                >
                  <input
                    type="radio"
                    name="experience"
                    value={tag.id}
                    checked={selectedExperience === tag.id}
                    onChange={() => handleExperienceChange(tag.id)}
                  />
                  <span className="game-tags-popover__option-chip">
                    <span className="game-tags-popover__option-icon">{tag.icon}</span>
                    {tag.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Секция Рейтинг */}
          <section className="game-tags-popover__section">
            <div className="game-tags-popover__section-header">
              <h5 className="game-tags-popover__section-title">Рейтинг</h5>
              {selectedRating.length > 0 && (
                <button 
                  className="game-tags-popover__clear-btn"
                  onClick={clearRating}
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="game-tags-popover__options">
              {RATING_TAGS.map(tag => (
                <label 
                  key={tag.id} 
                  className={`game-tags-popover__option game-tags-popover__option--checkbox ${selectedRating.includes(tag.id) ? "game-tags-popover__option--selected" : ""}`}
                  style={{ "--tag-color": tag.color }}
                >
                  <input
                    type="checkbox"
                    value={tag.id}
                    checked={selectedRating.includes(tag.id)}
                    onChange={() => handleRatingChange(tag.id)}
                  />
                  <span className="game-tags-popover__option-chip">
                    <span className="game-tags-popover__option-icon">{tag.icon}</span>
                    {tag.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Секция Поиск */}
          <section className="game-tags-popover__section">
            <div className="game-tags-popover__section-header">
              <h5 className="game-tags-popover__section-title">Поиск</h5>
              <span className="game-tags-popover__section-hint">
                (можно несколько)
              </span>
            </div>
            <div className="game-tags-popover__options">
              {SEARCH_TAGS.map(tag => (
                <label 
                  key={tag.id} 
                  className={`game-tags-popover__option game-tags-popover__option--checkbox ${selectedSearch.includes(tag.id) ? "game-tags-popover__option--selected" : ""}`}
                  style={{ "--tag-color": tag.color }}
                >
                  <input
                    type="checkbox"
                    value={tag.id}
                    checked={selectedSearch.includes(tag.id)}
                    onChange={() => toggleSearchTag(tag.id)}
                  />
                  <span className="game-tags-popover__option-chip">
                    <span className="game-tags-popover__option-icon">{tag.icon}</span>
                    {tag.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="game-tags-popover__footer">
            <button 
              className="game-tags-popover__clear-all-btn"
              onClick={handleClear}
              disabled={selectedCount === 0}
            >
              Сбросить все
            </button>
            <button 
              className="game-tags-popover__save-btn"
              onClick={handleSave}
            >
              Готово {selectedCount > 0 && `(${selectedCount})`}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GameTagsPopover;
