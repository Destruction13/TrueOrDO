import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import GameTagsPopover, { TAG_CONFIG, getTagById } from "./GameTagsPopover";
import AddWidgetModal from "./AddWidgetModal";
import "./BoardTab.css";

// ============================================
// Константы
// ============================================

const MAX_FAVORITE_GAMES = 8;
const MAX_CURRENT_GAMES = 5;

// Список игр PartyChaos (реально существующие игры платформы)
// Парсинг из GamesPage.jsx
export const PARTYCHAOS_GAMES = [
  { 
    id: "truth-or-dare", 
    name: "Правда или действие", 
    coverUrl: "/covers/TruthOrDare.jpg",
    icon: "🎯",
    color: "#e74c3c",
    path: "/truth-or-dare"
  },
  { 
    id: "alias", 
    name: "Alias", 
    coverUrl: "/covers/Alias.jpg",
    icon: "🎭",
    color: "#9b59b6",
    path: "/alias"
  },
  { 
    id: "codenames", 
    name: "Codenames", 
    coverUrl: "/covers/Codenames.jpg",
    icon: "🕵️",
    color: "#3498db",
    path: "/codenames"
  },
  { 
    id: "emotional", 
    name: "Emotional", 
    coverUrl: "/covers/Emotional.jpg",
    icon: "🧠",
    color: "#e91e63",
    path: "/emotional"
  },
];

// Демо-данные для тестирования (используем игры PartyChaos)
const DEMO_FAVORITE_GAMES = [
  { id: "truth-or-dare", name: "Правда или действие", coverUrl: "/covers/TruthOrDare.jpg", icon: "🎯", color: "#e74c3c" },
  { id: "alias", name: "Alias", coverUrl: "/covers/Alias.jpg", icon: "🎭", color: "#9b59b6" },
];

const DEMO_CURRENT_GAMES = [
  { 
    id: "truth-or-dare", 
    name: "Правда или действие", 
    coverUrl: "/covers/TruthOrDare.jpg",
    icon: "🎯",
    color: "#e74c3c",
    gameTags: {
      experience: "expert",
      rating: "cant_stop",
      search: ["want_to_play"]
    }
  },
  { 
    id: "alias", 
    name: "Alias", 
    coverUrl: "/covers/Alias.jpg",
    icon: "🎭",
    color: "#9b59b6",
    gameTags: {
      experience: "experienced",
      rating: "love",
      search: ["want_to_play"]
    }
  },
];

// Базовое количество отображаемых текущих игр
const DEFAULT_VISIBLE_CURRENT_GAMES = 2;

// Максимум игр в wishlist
const MAX_WISHLIST_GAMES = 4;

// ============================================
// FavoriteGamesGrid — сетка любимых игр с ограниченным drag
// ============================================

function FavoriteGamesGrid({ games, onReorder, isSelf, onRemove, widgetDragKey, isWidgetDragging, onBlockWidgetDrag, onUnblockWidgetDrag }) {
  const containerRef = useRef(null);
  
  return (
    <Reorder.Group 
      ref={containerRef}
      axis="x" 
      values={games} 
      onReorder={onReorder}
      className="board-tab__games-grid"
      as="div"
      onPointerDownCapture={onBlockWidgetDrag}
      onPointerUp={onUnblockWidgetDrag}
      onPointerLeave={onUnblockWidgetDrag}
      onPointerCancel={onUnblockWidgetDrag}
      layout={false}
    >
      {games.map((game, index) => (
        <FavoriteGameItem
          key={game.id}
          game={game}
          index={index}
          isSelf={isSelf}
          onRemove={onRemove}
          containerRef={containerRef}
        />
      ))}
    </Reorder.Group>
  );
}

// Отдельный компонент для каждой карточки
function FavoriteGameItem({ game, index, isSelf, onRemove, containerRef }) {
  return (
    <Reorder.Item
      key={game.id}
      value={game}
      as="div"
      dragListener={isSelf}
      dragConstraints={containerRef}
      dragElastic={0.1}
      className="board-tab__game-card-wrapper"
      style={{ touchAction: "pan-y" }}
      layout="position"
      whileDrag={{ zIndex: 10 }}
    >
      <GameCard
        game={game}
        index={index}
        isSelf={isSelf}
        onRemove={onRemove}
      />
    </Reorder.Item>
  );
}

// ============================================
// WishlistGamesGrid — сетка игр "Хочу поиграть" с ограниченным drag
// ============================================

function WishlistGamesGrid({ games, onReorder, isSelf, onRemove, widgetDragKey, isWidgetDragging, onBlockWidgetDrag, onUnblockWidgetDrag }) {
  const containerRef = useRef(null);
  
  return (
    <Reorder.Group 
      ref={containerRef}
      axis="x" 
      values={games} 
      onReorder={onReorder}
      className="board-tab__games-grid board-tab__games-grid--wishlist"
      as="div"
      onPointerDownCapture={onBlockWidgetDrag}
      onPointerUp={onUnblockWidgetDrag}
      onPointerLeave={onUnblockWidgetDrag}
      onPointerCancel={onUnblockWidgetDrag}
      layout={false}
    >
      {games.map((game, index) => (
        <WishlistGameItem
          key={game.id}
          game={game}
          index={index}
          isSelf={isSelf}
          onRemove={onRemove}
          containerRef={containerRef}
        />
      ))}
    </Reorder.Group>
  );
}

// Отдельный компонент для каждой карточки wishlist
function WishlistGameItem({ game, index, isSelf, onRemove, containerRef }) {
  return (
    <Reorder.Item
      key={game.id}
      value={game}
      as="div"
      dragListener={isSelf}
      dragConstraints={containerRef}
      dragElastic={0.1}
      className="board-tab__game-card-wrapper"
      style={{ touchAction: "pan-y" }}
      layout="position"
      whileDrag={{ zIndex: 10 }}
    >
      <GameCard
        game={game}
        index={index}
        isSelf={isSelf}
        onRemove={onRemove}
      />
    </Reorder.Item>
  );
}

// ============================================
// GameCard — карточка игры в сетке
// ============================================

function GameCard({ game, index, isSelf, onRemove, isDragging }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`board-tab__game-card ${isDragging ? "board-tab__game-card--dragging" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isSelf && setIsHovered(prev => !prev)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
    >
      <img 
        src={game.coverUrl || "/placeholder-game.png"} 
        alt={game.name}
        className="board-tab__game-cover"
        draggable={false}
      />
      <div className={`board-tab__game-overlay ${isHovered ? "board-tab__game-overlay--visible" : ""}`}>
        <span className="board-tab__game-name">{game.name}</span>
      </div>
      
      {/* Кнопка удаления */}
      {isSelf && isHovered && (
        <motion.button
          className="board-tab__game-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(game.id);
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ×
        </motion.button>
      )}
    </motion.div>
  );
}

// ============================================
// CurrentGamesGrid — вертикальный список текущих игр с drag-and-drop
// ============================================

function CurrentGamesGrid({ games, onReorder, isSelf, onRemove, onRemoveTag, onOpenTagSelector, showAllCurrentGames, defaultVisibleCount }) {
  // Определяем видимые игры для Reorder.Group
  const visibleGames = showAllCurrentGames 
    ? games 
    : games.slice(0, defaultVisibleCount);
  
  // Обработчик reorder — корректно обновляет полный массив
  const handleReorder = useCallback((newVisibleOrder) => {
    if (showAllCurrentGames) {
      // Если все игры видны — просто передаём новый порядок
      onReorder(newVisibleOrder);
    } else {
      // Если показаны только первые N игр — нужно сохранить скрытые на месте
      const hiddenGames = games.slice(defaultVisibleCount);
      onReorder([...newVisibleOrder, ...hiddenGames]);
    }
  }, [games, showAllCurrentGames, defaultVisibleCount, onReorder]);

  return (
    <Reorder.Group 
      axis="y" 
      values={visibleGames} 
      onReorder={handleReorder}
      className="board-tab__current-games"
      as="div"
    >
      {visibleGames.map((game, index) => (
        <CurrentGameItem
          key={game.id}
          game={game}
          index={index}
          isSelf={isSelf}
          onRemove={onRemove}
          onRemoveTag={onRemoveTag}
          onOpenTagSelector={onOpenTagSelector}
        />
      ))}
    </Reorder.Group>
  );
}

// Отдельный компонент для каждой карточки текущей игры
function CurrentGameItem({ game, index, isSelf, onRemove, onRemoveTag, onOpenTagSelector }) {
  return (
    <Reorder.Item
      key={game.id}
      value={game}
      as="div"
      dragListener={isSelf}
      className="board-tab__current-game-wrapper"
      layout="position"
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <CurrentGameCard
        game={game}
        index={index}
        isSelf={isSelf}
        onRemove={onRemove}
        onRemoveTag={onRemoveTag}
        onOpenTagSelector={onOpenTagSelector}
      />
    </Reorder.Item>
  );
}

// ============================================
// CurrentGameCard — карточка текущей игры с тегами
// ============================================

function CurrentGameCard({ game, index, isSelf, onRemove, onRemoveTag, onOpenTagSelector }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [deleteTooltip, setDeleteTooltip] = useState({ show: false, x: 0, y: 0 });
  const deleteTooltipTimeoutRef = useRef(null);
  const tagBtnRef = useRef(null);
  const tagsContainerRef = useRef(null);

  // Преобразуем gameTags в массив тегов для отображения
  const displayTags = [];
  if (game.gameTags?.experience) {
    const tag = getTagById(game.gameTags.experience);
    if (tag) displayTags.push({ ...tag, category: "experience" });
  }
  // Поддержка массива рейтингов
  const ratingTags = game.gameTags?.rating;
  if (Array.isArray(ratingTags) && ratingTags.length > 0) {
    ratingTags.forEach(tagId => {
      const tag = getTagById(tagId);
      if (tag) displayTags.push({ ...tag, category: "rating" });
    });
  } else if (ratingTags && typeof ratingTags === 'string') {
    // Обратная совместимость со старым форматом
    const tag = getTagById(ratingTags);
    if (tag) displayTags.push({ ...tag, category: "rating" });
  }
  if (game.gameTags?.search?.length > 0) {
    game.gameTags.search.forEach(tagId => {
      const tag = getTagById(tagId);
      if (tag) displayTags.push({ ...tag, category: "search" });
    });
  }
  
  // Максимум тегов для 2 рядов (примерно 4-5 тегов)
  const MAX_VISIBLE_TAGS = 4;
  const visibleTags = showAllTags ? displayTags : displayTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = displayTags.length - MAX_VISIBLE_TAGS;

  return (
    <div
      className="board-tab__current-game-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isSelf && setIsHovered(prev => !prev)}
    >
      <img 
        src={game.coverUrl || "/placeholder-game.png"} 
        alt={game.name}
        className="board-tab__current-game-cover"
      />
      <div className="board-tab__current-game-info">
        <h4 className="board-tab__current-game-name">{game.name}</h4>
        <div className="board-tab__current-game-tags" ref={tagsContainerRef}>
            {visibleTags.map((tag) => (
              <span 
                key={`${tag.category}-${tag.id}`} 
                className="board-tab__tag"
                style={{ "--tag-color": tag.color || "#7c3aed" }}
              >
                {tag.icon && <span className="board-tab__tag-icon">{tag.icon}</span>}
                {tag.label}
                {isSelf && (
                  <button 
                    className="board-tab__tag-remove"
                    onClick={() => onRemoveTag?.(game.id, tag.id, tag.category)}
                  >
                    ×
                    <span className="board-tab__tag-tooltip">Удалить тег</span>
                  </button>
                )}
              </span>
            ))}
          {/* Кнопка +N для скрытых тегов */}
          {hiddenCount > 0 && !showAllTags && (
            <button 
              className="board-tab__tag board-tab__tag--more"
              onClick={() => setShowAllTags(true)}
            >
              +{hiddenCount}
              <span className="board-tab__tag-tooltip">Посмотреть все теги игры</span>
            </button>
          )}
          {/* Кнопка скрыть при раскрытых тегах */}
          {showAllTags && hiddenCount > 0 && (
            <button 
              className="board-tab__tag board-tab__tag--collapse"
              onClick={() => setShowAllTags(false)}
            >
              &lt;
              <span className="board-tab__tag-tooltip">Свернуть теги игры</span>
            </button>
          )}
          {isSelf && (
            <button 
              ref={tagBtnRef}
              className="board-tab__add-tag-btn"
              onClick={() => onOpenTagSelector?.(game.id, tagBtnRef)}
            >
              + теги
            </button>
          )}
        </div>
      </div>
      
      {/* Кнопка удаления — только при наведении */}
      {isSelf && isHovered && (
        <>
          <button 
            className="board-tab__current-game-delete"
            onClick={() => onRemove?.(game.id)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = { x: rect.left + rect.width / 2, y: rect.top - 35 };
              // Задержка 0.2s перед показом тултипа
              deleteTooltipTimeoutRef.current = setTimeout(() => {
                setDeleteTooltip({ show: true, ...pos });
              }, 800);
            }}
            onMouseLeave={() => {
              if (deleteTooltipTimeoutRef.current) {
                clearTimeout(deleteTooltipTimeoutRef.current);
                deleteTooltipTimeoutRef.current = null;
              }
              setDeleteTooltip({ show: false, x: 0, y: 0 });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {deleteTooltip.show && (
            <div 
              className="board-tab__delete-tooltip"
              style={{ position: 'fixed', left: deleteTooltip.x, top: deleteTooltip.y, transform: 'translateX(-50%)' }}
            >
              Удалить игру
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// XpProgressBar — красивая шкала опыта с неоновой подсветкой
// ============================================

function XpProgressBar({ currentXp, level, xpForNextLevel, xpForCurrentLevel = 0 }) {
  // Вычисляем прогресс для текущего уровня
  const xpInCurrentLevel = currentXp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const xpRemaining = xpNeededForLevel - xpInCurrentLevel;
  const progress = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));

  return (
    <div className="xp-progress">
      {/* Левая часть: уровень в бейдже */}
      <div className="xp-progress__level-circle">
        <div className="xp-progress__level-inner">
          <span className="xp-progress__level-number">{level}</span>
        </div>
      </div>
      
      {/* Центральная часть: прогресс бар */}
      <div className="xp-progress__bar-container">
        {/* Кнопка наград */}
        <button className="xp-progress__rewards-btn">
          <span className="xp-progress__rewards-icon">🎁</span> Награды за уровень
        </button>
        
        {/* Плазменный прогресс бар */}
        <div className="xp-progress__bar-bg">
          <div 
            className="xp-progress__bar-fill"
            style={{ width: `${progress}%` }}
          >
            <div className="xp-progress__bar-shine" />
          </div>
        </div>
        
        {/* Метка XP */}
        <div className="xp-progress__label">
          <span className="xp-progress__remaining">
            Next LVL: {xpRemaining} XP
          </span>
        </div>
      </div>
      
      {/* Правая часть: иконка кубка */}
      <div className="xp-progress__icon">
        <img src="/frames/xp.png" alt="XP" className="xp-progress__icon-img" />
      </div>
      
      {/* Разделительная линия */}
      <div className="xp-progress__divider" />
    </div>
  );
}

// ============================================
// FavoriteGameWidget — виджет "Любимая игра" с тегами, комментарием и корзинкой удаления
// ============================================

function FavoriteGameWidget({ 
  favoriteGame, 
  isSelf, 
  onRemove, 
  onOpenModal, 
  onUpdateComment,
  onRemoveTag,
  onOpenTagSelector,
  tagSelectorGame,
  tagSelectorAnchor,
  onCloseTagSelector,
  onSaveTags
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [comment, setComment] = useState(favoriteGame?.comment || "");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [deleteTooltip, setDeleteTooltip] = useState({ show: false, x: 0, y: 0 });
  const deleteTooltipTimeoutRef = useRef(null);
  const tagBtnRef = useRef(null);
  const commentTextareaRef = useRef(null);

  // Синхронизируем локальный комментарий с данными игры
  useEffect(() => {
    setComment(favoriteGame?.comment || "");
  }, [favoriteGame?.comment]);

  // Автофокус на textarea при открытии редактирования
  useEffect(() => {
    if (isEditingComment && commentTextareaRef.current) {
      commentTextareaRef.current.focus();
      // Курсор в конец текста
      const len = commentTextareaRef.current.value.length;
      commentTextareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingComment]);

  // Преобразуем gameTags в массив тегов для отображения
  const displayTags = [];
  if (favoriteGame?.gameTags?.experience) {
    const tag = getTagById(favoriteGame.gameTags.experience);
    if (tag) displayTags.push({ ...tag, category: "experience" });
  }
  const ratingTags = favoriteGame?.gameTags?.rating;
  if (Array.isArray(ratingTags) && ratingTags.length > 0) {
    ratingTags.forEach(tagId => {
      const tag = getTagById(tagId);
      if (tag) displayTags.push({ ...tag, category: "rating" });
    });
  } else if (ratingTags && typeof ratingTags === 'string') {
    const tag = getTagById(ratingTags);
    if (tag) displayTags.push({ ...tag, category: "rating" });
  }
  if (favoriteGame?.gameTags?.search?.length > 0) {
    favoriteGame.gameTags.search.forEach(tagId => {
      const tag = getTagById(tagId);
      if (tag) displayTags.push({ ...tag, category: "search" });
    });
  }
  
  const MAX_VISIBLE_TAGS = 4;
  const visibleTags = showAllTags ? displayTags : displayTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = displayTags.length - MAX_VISIBLE_TAGS;

  const handleCommentBlur = () => {
    setIsEditingComment(false);
    // Заменяем переносы строк на пробелы при сохранении
    const cleanedComment = comment.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanedComment !== (favoriteGame?.comment || "")) {
      setComment(cleanedComment);
      onUpdateComment?.(cleanedComment);
    } else {
      setComment(cleanedComment);
    }
  };

  const handleCommentKeyDown = (e) => {
    // Escape отменяет редактирование
    if (e.key === "Escape") {
      setComment(favoriteGame?.comment || "");
      setIsEditingComment(false);
    }
    // Enter (без Shift) — сохраняет и закрывает
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commentTextareaRef.current?.blur();
    }
    // Shift+Enter — перенос строки (стандартное поведение, ничего не делаем)
  };

  // Иконка карандашика
  const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <>
      <div className="board-tab__section-header">
        <h3 className="board-tab__section-title">⭐ Любимая игра</h3>
      </div>

      {favoriteGame ? (
        <motion.div
          className="board-tab__favorite-game-widget"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div 
            className="board-tab__favorite-game-content"
            onClick={() => isSelf && setIsHovered(prev => !prev)}
          >
            <div className="board-tab__favorite-game-cover-wrapper">
              <img 
                src={favoriteGame.coverUrl || "/placeholder-game.png"} 
                alt={favoriteGame.name}
                className="board-tab__favorite-game-cover"
              />
            </div>
            <div className="board-tab__favorite-game-info">
              <h4 className="board-tab__favorite-game-name">{favoriteGame.name}</h4>
              
              {/* Комментарий — над тегами */}
              <div 
                className="board-tab__favorite-game-comment-section"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => e.stopPropagation()}
              >
                {isEditingComment ? (
                  <textarea
                    ref={commentTextareaRef}
                    className="board-tab__favorite-game-textarea"
                    placeholder="Расскажите, почему она любимая..."
                    value={comment}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const maxChars = 175;
                      
                      // Проверяем количество символов (без учёта переносов для лимита)
                      const charCount = newValue.replace(/\n/g, ' ').length;
                      if (charCount <= maxChars) {
                        setComment(newValue);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Enter (без Shift) — сохраняет
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        commentTextareaRef.current?.blur();
                        return;
                      }
                      // Shift+Enter — перенос строки (разрешён)
                      handleCommentKeyDown(e);
                    }}
                    onBlur={handleCommentBlur}
                    maxLength={200}
                  />
                ) : (
                  <div 
                    className={`board-tab__favorite-game-comment-placeholder ${isSelf ? 'board-tab__favorite-game-comment-placeholder--editable' : ''}`}
                    onClick={() => isSelf && setIsEditingComment(true)}
                  >
                    {isSelf && (
                      <span className="board-tab__favorite-game-pencil">
                        <PencilIcon />
                      </span>
                    )}
                    {comment ? (
                      <span className="board-tab__favorite-game-comment-text">{comment}</span>
                    ) : (
                      <span className="board-tab__favorite-game-comment-hint">
                        {isSelf ? "Расскажите, почему она любимая..." : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Теги */}
              <div className="board-tab__current-game-tags">
                {visibleTags.map((tag) => (
                  <span 
                    key={`${tag.category}-${tag.id}`} 
                    className="board-tab__tag"
                    style={{ "--tag-color": tag.color || "#7c3aed" }}
                  >
                    {tag.icon && <span className="board-tab__tag-icon">{tag.icon}</span>}
                    {tag.label}
                    {isSelf && (
                      <button 
                        className="board-tab__tag-remove"
                        onClick={() => onRemoveTag?.(tag.id, tag.category)}
                      >
                        ×
                        <span className="board-tab__tag-tooltip">Удалить тег</span>
                      </button>
                    )}
                  </span>
                ))}
                {hiddenCount > 0 && !showAllTags && (
                  <button 
                    className="board-tab__tag board-tab__tag--more"
                    onClick={() => setShowAllTags(true)}
                  >
                    +{hiddenCount}
                    <span className="board-tab__tag-tooltip">Посмотреть все теги игры</span>
                  </button>
                )}
                {showAllTags && hiddenCount > 0 && (
                  <button 
                    className="board-tab__tag board-tab__tag--collapse"
                    onClick={() => setShowAllTags(false)}
                  >
                    &lt;
                    <span className="board-tab__tag-tooltip">Свернуть теги игры</span>
                  </button>
                )}
                {isSelf && (
                  <button 
                    ref={tagBtnRef}
                    className="board-tab__add-tag-btn"
                    onClick={() => onOpenTagSelector?.(tagBtnRef)}
                  >
                    + теги
                  </button>
                )}
              </div>
            </div>
            
            {/* Кнопка удаления — корзинка */}
            {isSelf && (
              <>
                <button 
                  className={`board-tab__favorite-game-delete ${isHovered ? 'board-tab__favorite-game-delete--visible' : ''}`}
                  onClick={onRemove}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = { x: rect.left + rect.width / 2, y: rect.top - 35 };
                    // Задержка 0.2s перед показом тултипа
                    deleteTooltipTimeoutRef.current = setTimeout(() => {
                      setDeleteTooltip({ show: true, ...pos });
                    }, 800);
                  }}
                  onMouseLeave={() => {
                    if (deleteTooltipTimeoutRef.current) {
                      clearTimeout(deleteTooltipTimeoutRef.current);
                      deleteTooltipTimeoutRef.current = null;
                    }
                    setDeleteTooltip({ show: false, x: 0, y: 0 });
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {deleteTooltip.show && (
                  <div 
                    className="board-tab__delete-tooltip"
                    style={{ position: 'fixed', left: deleteTooltip.x, top: deleteTooltip.y, transform: 'translateX(-50%)' }}
                  >
                    Удалить игру
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className="board-tab__empty board-tab__empty--featured"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => isSelf && onOpenModal?.()}
        >
          {isSelf ? (
            <>
              <span className="board-tab__empty-plus">+</span>
              <span className="board-tab__empty-text">Выберите любимую игру</span>
            </>
          ) : (
            <>
              <span className="board-tab__empty-icon">⭐</span>
              <span className="board-tab__empty-text">Игра не выбрана</span>
            </>
          )}
        </motion.div>
      )}

      {/* Tag selector popover */}
      {tagSelectorGame && (
        <GameTagsPopover
          isOpen={!!tagSelectorGame}
          onClose={onCloseTagSelector}
          onSave={onSaveTags}
          initialTags={favoriteGame?.gameTags || {}}
          anchorRef={tagSelectorAnchor}
          gameName={favoriteGame?.name || "игры"}
        />
      )}
    </>
  );
}

// ============================================
// AddGameModal — модалка добавления игры из списка PartyChaos
// ============================================

function AddGameModal({ isOpen, onClose, onSelect, title, maxGames, currentCount, excludeIds = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const remainingSlots = maxGames - currentCount;

  // Фильтруем игры по поиску и исключаем уже добавленные
  const filteredGames = PARTYCHAOS_GAMES.filter(game => {
    // Исключаем уже добавленные
    if (excludeIds.includes(game.id)) return false;
    // Фильтр по поиску
    if (!searchQuery.trim()) return true;
    return game.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <motion.div
      className="add-game-modal__backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="add-game-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-game-modal__header">
          <h3 className="add-game-modal__title">{title}</h3>
          <span className="add-game-modal__slots">
            Осталось слотов: <strong>{remainingSlots}</strong>
          </span>
          <button className="add-game-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="add-game-modal__search">
          <input
            type="text"
            className="add-game-modal__search-input"
            placeholder="Поиск игры..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="add-game-modal__results">
          {filteredGames.length > 0 ? (
            filteredGames.map((game) => (
              <motion.div
                key={game.id}
                className="add-game-modal__result-item"
                onClick={() => {
                  onSelect(game);
                  onClose();
                }}
                whileHover={{ backgroundColor: "rgba(124, 58, 237, 0.2)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="add-game-modal__result-icon"
                  style={{ backgroundColor: game.color }}
                >
                  {game.icon}
                </div>
                <span className="add-game-modal__result-name">{game.name}</span>
                <span className="add-game-modal__result-add">+ Добавить</span>
              </motion.div>
            ))
          ) : searchQuery ? (
            <div className="add-game-modal__empty">
              Ничего не найдено
            </div>
          ) : (
            <div className="add-game-modal__empty">
              Все игры уже добавлены
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// WidgetItem — обёртка виджета с возможностью перетаскивания
// ============================================

function WidgetItem({ 
  widgetType, 
  isSelf, 
  draggingWidget, 
  setDraggingWidget, 
  tooltipWidget, 
  handleOpenTooltip,
  handleCloseTooltip,
  isDraggingRef, 
  setTooltipWidget,
  renderWidgetContent,
  onWidgetDragEnd,
  isWidgetDragBlocked
}) {
  const dragControls = useDragControls();
  const isBlockedRef = useRef(false);
  
  // Синхронизируем ref с состоянием для мгновенного доступа
  isBlockedRef.current = isWidgetDragBlocked;
  
  // Функция для начала drag виджета (вызывается из drag-зоны)
  const startDrag = useCallback((e) => {
    // Используем ref для мгновенной проверки
    // Небольшая задержка чтобы сетка успела установить блок
    requestAnimationFrame(() => {
      if (!isBlockedRef.current) {
        dragControls.start(e);
      }
    });
  }, [dragControls]);
  
  return (
    <Reorder.Item
      key={widgetType}
      value={widgetType}
      as="div"
      layout="position"
      transition={{ duration: 0 }}
      className={`board-tab__widget-wrapper ${draggingWidget === widgetType ? "board-tab__widget-wrapper--dragging" : ""}`}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => {
        setDraggingWidget(widgetType);
        setTooltipWidget(null);
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setDraggingWidget(null);
        onWidgetDragEnd?.();
      }}
      whileDrag={{ 
        cursor: "grabbing"
      }}
    >
      {/* Drag handle слева от виджета */}
      {isSelf && (
        <div 
          className={`board-tab__drag-handle ${tooltipWidget === widgetType ? 'board-tab__drag-handle--active' : ''}`}
          onClick={(e) => handleOpenTooltip(e, widgetType)}
          onMouseEnter={(e) => handleOpenTooltip(e, widgetType)}
          onMouseLeave={handleCloseTooltip}
          onPointerDown={startDrag}
          style={{ touchAction: "none" }}
        >
          <span className="board-tab__drag-handle-icon">
            <span></span><span></span>
            <span></span><span></span>
            <span></span><span></span>
          </span>
        </div>
      )}
      {/* Section виджета — drag инициируется по pointerDown */}
      <section 
        className={`board-tab__section board-tab__section--${widgetType.replace("_", "-")}`}
        onPointerDown={startDrag}
        style={{ touchAction: "none" }}
      >
        {renderWidgetContent(widgetType)}
      </section>
    </Reorder.Item>
  );
}

/**
 * BoardTab — вкладка "Доска" с виджетами игр
 * Референс: image/README/fullprofdoska.png
 * 
 * Содержит:
 * - Секция "Мои любимые игры" (до 20 игр)
 * - Секция "Текущие игры" (до 5 игр с тегами)
 */
function BoardTab({ profileData, isSelf, onProfileUpdate, socket }) {
  // Используем демо-данные если нет реальных
  const [favoriteGames, setFavoriteGames] = useState(
    profileData?.favoriteGames?.length > 0 ? profileData.favoriteGames : DEMO_FAVORITE_GAMES
  );
  const [currentGames, setCurrentGames] = useState(
    profileData?.currentGames?.length > 0 ? profileData.currentGames : DEMO_CURRENT_GAMES
  );
  
  // Новые виджеты: Любимая игра (одна) и Wishlist (хочу поиграть)
  const [favoriteGame, setFavoriteGame] = useState(profileData?.favoriteGame || null);
  const [wishlistGames, setWishlistGames] = useState(profileData?.wishlistGames || []);
  
  // Состояния для тегов и комментария "Любимая игра"
  const [tagSelectorFavoriteGame, setTagSelectorFavoriteGame] = useState(null);
  const [tagSelectorFavoriteAnchor, setTagSelectorFavoriteAnchor] = useState(null);
  
  // Модалки и состояния
  const [addGameModal, setAddGameModal] = useState({ isOpen: false, type: null });
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState(
    profileData?.widgets?.map(w => w.type) || ["favorite_games", "current_games"]
  );
  const [tagSelectorGame, setTagSelectorGame] = useState(null);
  const [tagSelectorAnchor, setTagSelectorAnchor] = useState(null);
  const [showAllCurrentGames, setShowAllCurrentGames] = useState(false);
  
  // Отображаемые текущие игры
  const visibleCurrentGames = showAllCurrentGames 
    ? currentGames 
    : currentGames.slice(0, DEFAULT_VISIBLE_CURRENT_GAMES);
  const hasMoreCurrentGames = currentGames.length > DEFAULT_VISIBLE_CURRENT_GAMES;

  // ============================================
  // Handlers для любимых игр
  // ============================================

  const handleAddFavoriteGame = useCallback((game) => {
    if (favoriteGames.length >= MAX_FAVORITE_GAMES) return;
    if (favoriteGames.find(g => g.id === game.id)) return;
    
    const newGames = [...favoriteGames, game];
    setFavoriteGames(newGames);
    
    // Сохранение на сервер
    socket?.emit("profile:games:update", { 
      type: "favorite", 
      games: newGames 
    });
    
    onProfileUpdate?.({ favoriteGames: newGames });
  }, [favoriteGames, socket, onProfileUpdate]);

  const handleRemoveFavoriteGame = useCallback((gameId) => {
    const newGames = favoriteGames.filter(g => g.id !== gameId);
    setFavoriteGames(newGames);
    
    socket?.emit("profile:games:update", { 
      type: "favorite", 
      games: newGames 
    });
    
    onProfileUpdate?.({ favoriteGames: newGames });
  }, [favoriteGames, socket, onProfileUpdate]);

  const handleReorderFavoriteGames = useCallback((newOrder) => {
    setFavoriteGames(newOrder);
    
    socket?.emit("profile:games:update", { 
      type: "favorite", 
      games: newOrder 
    });
  }, [socket]);

  // ============================================
  // Handlers для текущих игр
  // ============================================

  const handleAddCurrentGame = useCallback((game) => {
    if (currentGames.length >= MAX_CURRENT_GAMES) return;
    if (currentGames.find(g => g.id === game.id)) return;
    
    const newGame = { ...game, gameTags: {} };
    const newGames = [...currentGames, newGame];
    setCurrentGames(newGames);
    
    socket?.emit("profile:games:update", { 
      type: "current", 
      games: newGames 
    }, (response) => {
      if (!response?.success) {
        console.error("[BoardTab] Ошибка сохранения игры:", response?.error);
      }
    });
    
    onProfileUpdate?.({ currentGames: newGames });
  }, [currentGames, socket, onProfileUpdate]);

  const handleRemoveCurrentGame = useCallback((gameId) => {
    const newGames = currentGames.filter(g => g.id !== gameId);
    setCurrentGames(newGames);
    
    socket?.emit("profile:games:update", { 
      type: "current", 
      games: newGames 
    }, (response) => {
      if (!response?.success) {
        console.error("[BoardTab] Ошибка удаления игры:", response?.error);
      }
    });
    
    onProfileUpdate?.({ currentGames: newGames });
  }, [currentGames, socket, onProfileUpdate]);

  const handleRemoveTag = useCallback((gameId, tagId, category) => {
    const newGames = currentGames.map(g => {
      if (g.id === gameId) {
        const newTags = { ...g.gameTags };
        if (category === "experience") {
          newTags.experience = null;
        } else if (category === "rating") {
          // Поддержка массива рейтингов
          const currentRating = newTags.rating;
          if (Array.isArray(currentRating)) {
            newTags.rating = currentRating.filter(id => id !== tagId);
          } else {
            newTags.rating = [];
          }
        } else if (category === "search") {
          newTags.search = (newTags.search || []).filter(id => id !== tagId);
        }
        return { ...g, gameTags: newTags };
      }
      return g;
    });
    setCurrentGames(newGames);
    
    socket?.emit("profile:games:update", { 
      type: "current", 
      games: newGames 
    }, (response) => {
      if (!response?.success) {
        console.error("[BoardTab] Ошибка удаления тега:", response?.error);
      }
    });
    
    onProfileUpdate?.({ currentGames: newGames });
  }, [currentGames, socket, onProfileUpdate]);

  const handleOpenTagSelector = useCallback((gameId, anchorRef) => {
    setTagSelectorGame(gameId);
    setTagSelectorAnchor(anchorRef);
  }, []);

  const handleCloseTagSelector = useCallback(() => {
    setTagSelectorGame(null);
    setTagSelectorAnchor(null);
  }, []);

  const handleSaveTags = useCallback((tags) => {
    if (!tagSelectorGame) return;
    
    const newGames = currentGames.map(g => {
      if (g.id === tagSelectorGame) {
        return { 
          ...g, 
          gameTags: {
            experience: tags.experience,
            rating: tags.rating,
            search: tags.search || []
          }
        };
      }
      return g;
    });
    setCurrentGames(newGames);
    
    socket?.emit("profile:games:update", { 
      type: "current", 
      games: newGames 
    }, (response) => {
      if (!response?.success) {
        console.error("[BoardTab] Ошибка сохранения тегов:", response?.error);
      }
    });
    
    onProfileUpdate?.({ currentGames: newGames });
  }, [tagSelectorGame, currentGames, socket, onProfileUpdate]);

  // Получить текущие теги для выбранной игры
  const getSelectedGameTags = useCallback(() => {
    if (!tagSelectorGame) return {};
    const game = currentGames.find(g => g.id === tagSelectorGame);
    return game?.gameTags || {};
  }, [tagSelectorGame, currentGames]);

  // ============================================
  // Handlers для виджета "Любимая игра" (одна)
  // ============================================

  const handleSetFavoriteGame = useCallback((game) => {
    setFavoriteGame(game);
    // Передаём как массив для совместимости с сервером
    socket?.emit("profile:games:update", { type: "featured", games: [game] });
    onProfileUpdate?.({ favoriteGame: game });
  }, [socket, onProfileUpdate]);

  const handleRemoveFavoriteGame2 = useCallback(() => {
    setFavoriteGame(null);
    // Пустой массив для удаления
    socket?.emit("profile:games:update", { type: "featured", games: [] });
    onProfileUpdate?.({ favoriteGame: null });
  }, [socket, onProfileUpdate]);

  // Обновление комментария для "Любимая игра"
  const handleUpdateFavoriteGameComment = useCallback((comment) => {
    if (!favoriteGame) return;
    const updatedGame = { ...favoriteGame, comment };
    setFavoriteGame(updatedGame);
    socket?.emit("profile:games:update", { type: "featured", games: [updatedGame] });
    onProfileUpdate?.({ favoriteGame: updatedGame });
  }, [favoriteGame, socket, onProfileUpdate]);

  // Удаление тега из "Любимая игра"
  const handleRemoveFavoriteGameTag = useCallback((tagId, category) => {
    if (!favoriteGame) return;
    const newTags = { ...favoriteGame.gameTags };
    if (category === "experience") {
      newTags.experience = null;
    } else if (category === "rating") {
      const currentRating = newTags.rating;
      if (Array.isArray(currentRating)) {
        newTags.rating = currentRating.filter(id => id !== tagId);
      } else {
        newTags.rating = [];
      }
    } else if (category === "search") {
      newTags.search = (newTags.search || []).filter(id => id !== tagId);
    }
    const updatedGame = { ...favoriteGame, gameTags: newTags };
    setFavoriteGame(updatedGame);
    socket?.emit("profile:games:update", { type: "featured", games: [updatedGame] });
    onProfileUpdate?.({ favoriteGame: updatedGame });
  }, [favoriteGame, socket, onProfileUpdate]);

  // Открытие селектора тегов для "Любимая игра"
  const handleOpenFavoriteGameTagSelector = useCallback((anchorRef) => {
    setTagSelectorFavoriteGame(favoriteGame?.id || "favorite");
    setTagSelectorFavoriteAnchor(anchorRef);
  }, [favoriteGame]);

  // Закрытие селектора тегов для "Любимая игра"
  const handleCloseFavoriteGameTagSelector = useCallback(() => {
    setTagSelectorFavoriteGame(null);
    setTagSelectorFavoriteAnchor(null);
  }, []);

  // Сохранение тегов для "Любимая игра"
  const handleSaveFavoriteGameTags = useCallback((tags) => {
    if (!favoriteGame) return;
    const updatedGame = { 
      ...favoriteGame, 
      gameTags: {
        experience: tags.experience,
        rating: tags.rating,
        search: tags.search || []
      }
    };
    setFavoriteGame(updatedGame);
    socket?.emit("profile:games:update", { type: "featured", games: [updatedGame] });
    onProfileUpdate?.({ favoriteGame: updatedGame });
  }, [favoriteGame, socket, onProfileUpdate]);

  // ============================================
  // Handlers для виджета "Хочу поиграть" (wishlist)
  // ============================================

  const handleAddWishlistGame = useCallback((game) => {
    if (wishlistGames.length >= MAX_WISHLIST_GAMES) return;
    if (wishlistGames.some(g => g.id === game.id)) return;
    
    const newGames = [...wishlistGames, game];
    setWishlistGames(newGames);
    socket?.emit("profile:games:update", { type: "wishlist", games: newGames });
    onProfileUpdate?.({ wishlistGames: newGames });
  }, [wishlistGames, socket, onProfileUpdate]);

  const handleRemoveWishlistGame = useCallback((gameId) => {
    const newGames = wishlistGames.filter(g => g.id !== gameId);
    setWishlistGames(newGames);
    socket?.emit("profile:games:update", { type: "wishlist", games: newGames });
    onProfileUpdate?.({ wishlistGames: newGames });
  }, [wishlistGames, socket, onProfileUpdate]);

  // Сохранение виджетов (из модалки)
  const handleSaveWidgets = useCallback((widgets) => {
    setActiveWidgets(widgets);
    
    // Сохранение на сервер
    socket?.emit("profile:widgets:update", { 
      widgets: widgets.map((type, index) => ({
        type,
        isVisible: true,
        sortOrder: index,
      }))
    });
    
    onProfileUpdate?.({ widgets: widgets.map(type => ({ type, isVisible: true })) });
  }, [socket, onProfileUpdate]);

  // Проверка активности виджета
  const isWidgetActive = (widgetType) => activeWidgets.includes(widgetType);

  // Reorder виджетов (drag-and-drop)
  const handleReorderWidgets = useCallback((newOrder) => {
    setActiveWidgets(newOrder);
    
    // Сохранение на сервер
    socket?.emit("profile:widgets:update", { 
      widgets: newOrder.map((type, index) => ({
        type,
        isVisible: true,
        sortOrder: index,
      }))
    });
    
    onProfileUpdate?.({ widgets: newOrder.map(type => ({ type, isVisible: true })) });
  }, [socket, onProfileUpdate]);

  // Состояние перетаскивания
  const [draggingWidget, setDraggingWidget] = useState(null);
  // Ключ для сброса Y-координаты карточек после перестановки виджетов
  const [widgetDragKey, setWidgetDragKey] = useState(0);
  // Блокировка drag виджета когда pointer на карточке
  const [isWidgetDragBlocked, setIsWidgetDragBlocked] = useState(false);
  
  // Callbacks для блокировки/разблокировки drag виджета
  const handleBlockWidgetDrag = useCallback(() => {
    setIsWidgetDragBlocked(true);
  }, []);
  
  const handleUnblockWidgetDrag = useCallback(() => {
    setIsWidgetDragBlocked(false);
  }, []);
  
  // Состояние tooltip для drag handle
  const [tooltipWidget, setTooltipWidget] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const isDraggingRef = useRef(false);
  const tooltipHoverRef = useRef(false); // Флаг наведения на tooltip
  const tooltipTimeoutRef = useRef(null); // Таймер для задержки скрытия
  
  // Открытие tooltip с вычислением позиции
  const handleOpenTooltip = useCallback((e, widgetType) => {
    e.stopPropagation();
    
    // Очищаем таймер скрытия
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Не открывать если только что было перетаскивание
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    
    // При клике — toggle, при hover — только открыть
    if (e.type === 'click' && tooltipWidget === widgetType) {
      setTooltipWidget(null);
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 8, // Над кнопкой
      left: rect.left + rect.width + 8, // Справа от кнопки
    });
    setTooltipWidget(widgetType);
  }, [tooltipWidget]);
  
  // Закрытие tooltip при уходе курсора (с задержкой для перехода на tooltip)
  const handleCloseTooltip = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => {
      if (!tooltipHoverRef.current) {
        setTooltipWidget(null);
      }
    }, 100);
  }, []);
  
  // Обработчики для самого tooltip
  const handleTooltipMouseEnter = useCallback(() => {
    tooltipHoverRef.current = true;
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  }, []);
  
  const handleTooltipMouseLeave = useCallback(() => {
    tooltipHoverRef.current = false;
    setTooltipWidget(null);
  }, []);
  
  // Закрытие tooltip при клике вне
  useEffect(() => {
    if (!tooltipWidget) return;
    
    const handleClickOutside = (e) => {
      if (!e.target.closest('.board-tab__drag-handle') && !e.target.closest('.board-tab__drag-tooltip')) {
        setTooltipWidget(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tooltipWidget]);
  
  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Рендер контента виджета по типу
  const renderWidgetContent = (widgetType, dragKey, isWidgetDragging, onBlockWidgetDrag, onUnblockWidgetDrag) => {
    switch (widgetType) {
      case "favorite_games":
        return (
          <>
            <div className="board-tab__section-header">
              <div className="board-tab__section-title-row">
                <h3 className="board-tab__section-title">🎮 Мои любимые игры</h3>
                <span className="board-tab__section-hint">
                  Добавьте до {MAX_FAVORITE_GAMES} игр
                </span>
              </div>
              {isSelf && (
                <button 
                  className="board-tab__add-btn"
                  onClick={() => setAddGameModal({ isOpen: true, type: "favorite" })}
                  disabled={favoriteGames.length >= MAX_FAVORITE_GAMES}
                >
                  + Добавить игру
                </button>
              )}
            </div>

            {favoriteGames.length > 0 ? (
              <FavoriteGamesGrid 
                games={favoriteGames}
                onReorder={handleReorderFavoriteGames}
                isSelf={isSelf}
                onRemove={handleRemoveFavoriteGame}
                widgetDragKey={dragKey}
                isWidgetDragging={isWidgetDragging}
                onBlockWidgetDrag={onBlockWidgetDrag}
                onUnblockWidgetDrag={onUnblockWidgetDrag}
              />
            ) : (
              <motion.div 
                className="board-tab__empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="board-tab__empty-icon">🎮</span>
                <span className="board-tab__empty-text">
                  {isSelf ? "Добавьте свои любимые игры" : "Игры не добавлены"}
                </span>
                {isSelf && (
                  <button 
                    className="board-tab__empty-add-btn"
                    onClick={() => setAddGameModal({ isOpen: true, type: "favorite" })}
                  >
                    + Добавить первую игру
                  </button>
                )}
              </motion.div>
            )}
          </>
        );

      case "current_games":
        return (
          <>
            <div className="board-tab__section-header">
              <div className="board-tab__section-title-row">
                <h3 className="board-tab__section-title">🕹️ Текущие игры</h3>
                <span className="board-tab__section-hint">
                  Добавьте до {MAX_CURRENT_GAMES} игр
                </span>
              </div>
              {isSelf && (
                <button 
                  className="board-tab__add-btn"
                  onClick={() => setAddGameModal({ isOpen: true, type: "current" })}
                  disabled={currentGames.length >= MAX_CURRENT_GAMES}
                >
                  + Добавить игру
                </button>
              )}
            </div>

            {currentGames.length > 0 ? (
              <>
                <CurrentGamesGrid
                  games={currentGames}
                  onReorder={(newOrder) => {
                    setCurrentGames(newOrder);
                    socket?.emit("profile:games:update", { type: "current", games: newOrder }, (response) => {
                      if (!response?.success) {
                        console.error("[BoardTab] Ошибка сохранения порядка:", response?.error);
                      }
                    });
                    onProfileUpdate?.({ currentGames: newOrder });
                  }}
                  isSelf={isSelf}
                  onRemove={handleRemoveCurrentGame}
                  onRemoveTag={handleRemoveTag}
                  onOpenTagSelector={handleOpenTagSelector}
                  showAllCurrentGames={showAllCurrentGames}
                  defaultVisibleCount={DEFAULT_VISIBLE_CURRENT_GAMES}
                />
                
                {hasMoreCurrentGames && (
                  <motion.button 
                    className="board-tab__show-more-btn"
                    onClick={() => setShowAllCurrentGames(!showAllCurrentGames)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {showAllCurrentGames ? (
                      <>
                        <span>Скрыть</span>
                        <span className="board-tab__show-more-icon">▲</span>
                      </>
                    ) : (
                      <>
                        <span>Показать ещё {currentGames.length - DEFAULT_VISIBLE_CURRENT_GAMES}</span>
                        <span className="board-tab__show-more-icon">▼</span>
                      </>
                    )}
                  </motion.button>
                )}
              </>
            ) : (
              <motion.div 
                className="board-tab__empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="board-tab__empty-icon">🕹️</span>
                <span className="board-tab__empty-text">
                  {isSelf ? "Добавьте игры, в которые сейчас играете" : "Нет текущих игр"}
                </span>
                {isSelf && (
                  <button 
                    className="board-tab__empty-add-btn"
                    onClick={() => setAddGameModal({ isOpen: true, type: "current" })}
                  >
                    + Добавить первую игру
                  </button>
                )}
              </motion.div>
            )}

            {tagSelectorGame && (
              <GameTagsPopover
                isOpen={!!tagSelectorGame}
                onClose={handleCloseTagSelector}
                onSave={handleSaveTags}
                initialTags={getSelectedGameTags()}
                anchorRef={tagSelectorAnchor}
                gameName={currentGames.find(g => g.id === tagSelectorGame)?.name || "игры"}
              />
            )}
          </>
        );

      case "favorite_game":
        return (
          <FavoriteGameWidget
            favoriteGame={favoriteGame}
            isSelf={isSelf}
            onRemove={handleRemoveFavoriteGame2}
            onOpenModal={() => setAddGameModal({ isOpen: true, type: "featured" })}
            onUpdateComment={handleUpdateFavoriteGameComment}
            onRemoveTag={handleRemoveFavoriteGameTag}
            onOpenTagSelector={handleOpenFavoriteGameTagSelector}
            tagSelectorGame={tagSelectorFavoriteGame}
            tagSelectorAnchor={tagSelectorFavoriteAnchor}
            onCloseTagSelector={handleCloseFavoriteGameTagSelector}
            onSaveTags={handleSaveFavoriteGameTags}
          />
        );

      case "wishlist":
        return (
          <>
            <div className="board-tab__section-header">
              <div className="board-tab__section-title-row">
                <h3 className="board-tab__section-title">📋 Хочу поиграть</h3>
                <span className="board-tab__section-hint">
                  До {MAX_WISHLIST_GAMES} игр
                </span>
              </div>
              {isSelf && (
                <button 
                  className="board-tab__add-btn"
                  onClick={() => setAddGameModal({ isOpen: true, type: "wishlist" })}
                  disabled={wishlistGames.length >= MAX_WISHLIST_GAMES}
                >
                  + Добавить игру
                </button>
              )}
            </div>

            {wishlistGames.length > 0 ? (
              <WishlistGamesGrid 
                games={wishlistGames}
                onReorder={(newOrder) => {
                  setWishlistGames(newOrder);
                  socket?.emit("profile:games:update", { type: "wishlist", games: newOrder });
                }}
                isSelf={isSelf}
                onRemove={handleRemoveWishlistGame}
                widgetDragKey={dragKey}
                isWidgetDragging={isWidgetDragging}
                onBlockWidgetDrag={onBlockWidgetDrag}
                onUnblockWidgetDrag={onUnblockWidgetDrag}
              />
            ) : (
              <motion.div 
                className="board-tab__empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="board-tab__empty-icon">📋</span>
                <span className="board-tab__empty-text">
                  {isSelf ? "Добавьте игры, в которые хотите поиграть" : "Список пуст"}
                </span>
                {isSelf && (
                  <button 
                    className="board-tab__empty-add-btn"
                    onClick={() => setAddGameModal({ isOpen: true, type: "wishlist" })}
                  >
                    + Добавить игру
                  </button>
                )}
              </motion.div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  // Данные об опыте пользователя (из profileData или дефолтные)
  const userXpData = {
    currentXp: profileData?.totalXp || 2450,
    level: profileData?.level || 12,
    xpForNextLevel: profileData?.xpForNextLevel || 3000,
    xpForCurrentLevel: profileData?.xpForCurrentLevel || 2000,
  };

  return (
    <div className="board-tab">
      {/* Прогресс бар опыта */}
      <XpProgressBar 
        currentXp={userXpData.currentXp}
        level={userXpData.level}
        xpForNextLevel={userXpData.xpForNextLevel}
        xpForCurrentLevel={userXpData.xpForCurrentLevel}
      />

      {/* Header с кнопкой добавления виджета */}
      <div className="board-tab__header">
        {isSelf && (
          <button 
            className="board-tab__add-widget-btn"
            onClick={() => setAddWidgetModalOpen(true)}
          >
            + Добавить виджет
          </button>
        )}
      </div>

      {/* Виджеты с drag-and-drop */}
      <Reorder.Group 
        axis="y" 
        values={activeWidgets} 
        onReorder={handleReorderWidgets}
        className="board-tab__widgets-list"
        as="div"
        layout={false}
      >
        {activeWidgets.map((widgetType) => (
          <WidgetItem
            key={widgetType}
            widgetType={widgetType}
            isSelf={isSelf}
            draggingWidget={draggingWidget}
            setDraggingWidget={setDraggingWidget}
            tooltipWidget={tooltipWidget}
            handleOpenTooltip={handleOpenTooltip}
            handleCloseTooltip={handleCloseTooltip}
            isDraggingRef={isDraggingRef}
            setTooltipWidget={setTooltipWidget}
            renderWidgetContent={(type) => renderWidgetContent(type, widgetDragKey, !!draggingWidget, handleBlockWidgetDrag, handleUnblockWidgetDrag)}
            onWidgetDragEnd={() => setWidgetDragKey(k => k + 1)}
            isWidgetDragBlocked={isWidgetDragBlocked}
          />
        ))}
      </Reorder.Group>

      {/* Пустое состояние если нет виджетов */}
      {activeWidgets.length === 0 && (
        <motion.div 
          className="board-tab__empty board-tab__empty--no-widgets"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="board-tab__empty-icon">📦</span>
          <span className="board-tab__empty-text">
            {isSelf ? "Добавьте виджеты на доску" : "Виджеты не добавлены"}
          </span>
          {isSelf && (
            <button 
              className="board-tab__empty-add-btn"
              onClick={() => setAddWidgetModalOpen(true)}
            >
              + Добавить виджет
            </button>
          )}
        </motion.div>
      )}

      {/* Модалка добавления игры */}
      <AnimatePresence>
        {addGameModal.isOpen && (
          <AddGameModal
            isOpen={addGameModal.isOpen}
            onClose={() => setAddGameModal({ isOpen: false, type: null })}
            onSelect={
              addGameModal.type === "favorite" ? handleAddFavoriteGame : 
              addGameModal.type === "featured" ? handleSetFavoriteGame :
              addGameModal.type === "wishlist" ? handleAddWishlistGame :
              handleAddCurrentGame
            }
            title={
              addGameModal.type === "favorite" ? "Добавить любимую игру" : 
              addGameModal.type === "featured" ? "Выбрать любимую игру" :
              addGameModal.type === "wishlist" ? "Добавить в список желаемого" :
              "Добавить текущую игру"
            }
            maxGames={
              addGameModal.type === "favorite" ? MAX_FAVORITE_GAMES : 
              addGameModal.type === "featured" ? 1 :
              addGameModal.type === "wishlist" ? MAX_WISHLIST_GAMES :
              MAX_CURRENT_GAMES
            }
            currentCount={
              addGameModal.type === "favorite" ? favoriteGames.length : 
              addGameModal.type === "featured" ? (favoriteGame ? 1 : 0) :
              addGameModal.type === "wishlist" ? wishlistGames.length :
              currentGames.length
            }
            excludeIds={
              addGameModal.type === "favorite" ? favoriteGames.map(g => g.id) : 
              addGameModal.type === "featured" ? (favoriteGame ? [favoriteGame.id] : []) :
              addGameModal.type === "wishlist" ? wishlistGames.map(g => g.id) :
              currentGames.map(g => g.id)
            }
          />
        )}
      </AnimatePresence>

      {/* Модалка добавления/настройки виджетов */}
      <AddWidgetModal
        isOpen={addWidgetModalOpen}
        onClose={() => setAddWidgetModalOpen(false)}
        onSave={handleSaveWidgets}
        activeWidgets={activeWidgets}
      />
      
      {/* Tooltip для drag handle (fixed, вне потока) */}
      <AnimatePresence>
        {tooltipWidget && (
          <motion.div
            className="board-tab__drag-tooltip"
            style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            initial={{ opacity: 0, x: -5, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <p className="board-tab__drag-tooltip-text">
              <strong>Удерживайте и перетаскивайте</strong>, чтобы переместить
            </p>
            <p className="board-tab__drag-tooltip-text">
              <strong>Щёлкните</strong>, чтобы управлять
            </p>
            <button
              className="board-tab__drag-tooltip-remove"
              onClick={(e) => {
                e.stopPropagation();
                const newWidgets = activeWidgets.filter(w => w !== tooltipWidget);
                handleSaveWidgets(newWidgets);
                setTooltipWidget(null);
              }}
            >
              <span className="board-tab__drag-tooltip-remove-icon">🗑️</span>
              <span>Удалить виджет</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BoardTab;
