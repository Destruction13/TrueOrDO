import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import AvatarFrame from "../ui/AvatarFrame";
import StyledNickname from "../ui/StyledNickname";
import Button from "../ui/Button";
import FullProfileModal from "./FullProfileModal";
import "./MiniProfile.css";

// Конфигурация игр
const GAME_CONFIG = {
  tod: { name: "Правда или Действие", icon: "\uD83C\uDFAD", color: "#e74c3c" },
  alias: { name: "Alias", icon: "\uD83D\uDCAC", color: "#3498db" },
  codenames: { name: "Codenames", icon: "\uD83D\uDD75\uFE0F", color: "#2ecc71" },
  emotional: { name: "Emotional", icon: "\uD83D\uDE0A", color: "#9b59b6" },
};

// Статусы онлайн
const ONLINE_STATUS_CONFIG = {
  online: { label: "Онлайн", color: "#2ecc71", icon: "\uD83D\uDFE2" },
  idle: { label: "Отошёл", color: "#f1c40f", icon: "\uD83C\uDF19" },
  in_game: { label: "В игре", color: "#9b59b6", icon: "\uD83C\uDFAE" },
  dnd: { label: "Не беспокоить", color: "#e74c3c", icon: "\u26D4" },
  invisible: { label: "Невидимка", color: "#6b6b6b", icon: "\uD83D\uDC7B" },
  offline: { label: "Оффлайн", color: "#6b6b6b", icon: "\u26AB" },
};

// Статусы для выбора пользователем
const USER_SELECTABLE_STATUSES = ["online", "dnd", "invisible"];

/**
 * Парсит текст с учётом маркировки и возвращает React-элементы
 * Поддержка: **bold**, *italic*, ~~strikethrough~~, > цитата, [текст](ссылка)
 */
function parseFormattedText(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
    
    // Проверка на цитату
    if (line.startsWith('> ')) {
      elements.push(
        <span key={`quote-${lineIndex}`} className="mini-profile__biography-quote">
          {parseInlineFormatting(line.slice(2))}
        </span>
      );
      return;
    }
    
    elements.push(...parseInlineFormatting(line, lineIndex));
  });
  
  return elements;
}

/**
 * Парсит инлайн-форматирование: **bold**, *italic*, ~~strike~~, [text](url), и автоматические URL
 */
function parseInlineFormatting(text, keyPrefix = 0) {
  const elements = [];
  // Регулярка для поиска разметки и URL
  // Добавлена поддержка автоматических ссылок (https?://...)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\~\~(.+?)\~\~)|(\[(.+?)\]\((.+?)\))|(https?:\/\/[^\s<>"\[\]]+)/g;
  
  let lastIndex = 0;
  let match;
  let matchIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    // Добавляем текст до совпадения
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    
    if (match[1]) {
      // **bold**
      elements.push(<strong key={`b-${keyPrefix}-${matchIndex}`}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      elements.push(<em key={`i-${keyPrefix}-${matchIndex}`}>{match[4]}</em>);
    } else if (match[5]) {
      // ~~strikethrough~~
      elements.push(<s key={`s-${keyPrefix}-${matchIndex}`}>{match[6]}</s>);
    } else if (match[7]) {
      // [text](url)
      elements.push(
        <a 
          key={`a-${keyPrefix}-${matchIndex}`} 
          href={match[9]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mini-profile__biography-link"
        >
          {match[8]}
        </a>
      );
    } else if (match[10]) {
      // Автоматическая ссылка (https://...)
      const url = match[10];
      // Убираем trailing punctuation если есть
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      const trailingChars = url.slice(cleanUrl.length);
      elements.push(
        <a 
          key={`url-${keyPrefix}-${matchIndex}`} 
          href={cleanUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mini-profile__biography-link"
        >
          {cleanUrl}
        </a>
      );
      if (trailingChars) {
        elements.push(trailingChars);
      }
    }
    
    lastIndex = match.index + match[0].length;
    matchIndex++;
  }
  
  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
  
  return elements.length > 0 ? elements : [text];
}

// Конфигурация редкости достижений
const RARITY_CONFIG = {
  common: { color: "#8b8b8b", borderColor: "rgba(139, 139, 139, 0.3)" },
  rare: { color: "#4b9cd3", borderColor: "rgba(75, 156, 211, 0.4)" },
  epic: { color: "#9b59b6", borderColor: "rgba(155, 89, 182, 0.5)" },
  heroic: { color: "#e74c3c", borderColor: "rgba(231, 76, 60, 0.5)" },
  legendary: { color: "#f1c40f", borderColor: "rgba(241, 196, 15, 0.6)" },
  secret: { color: "#e91e63", borderColor: "rgba(233, 30, 99, 0.5)" },
};

/**
 * Форматирует время игры
 */
function formatPlayTime(minutes) {
  if (!minutes || minutes < 1) return "< 1 мин";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч`;
}

/**
 * Компонент бейджика с тегом и всплывающим тултипом при копировании
 */
function TagBadge({ nickname, tag }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const [hoverTooltipPos, setHoverTooltipPos] = useState({ x: 0, y: 0 });
  const badgeRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef(null);

  const handleClick = () => {
    const fullTag = `${nickname}#${tag}`;
    navigator.clipboard.writeText(fullTag);
    
    // Позиция всплывашки справа от бейджика
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 - 12 });
    }
    setShowTooltip(true);
    setShowHoverTooltip(false);
    
    // Скрыть через 1 секунду
    setTimeout(() => setShowTooltip(false), 1000);
  };

  const handleMouseEnter = () => {
    if (badgeRef.current && !showTooltip) {
      const rect = badgeRef.current.getBoundingClientRect();
      setHoverTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      // Задержка 0.8s перед показом тултипа
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverTooltip(true);
      }, 800);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverTooltip(false);
  };

  return (
    <>
      <button 
        ref={badgeRef}
        className="mini-profile__tag-badge"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        #{tag}
      </button>
      {showHoverTooltip && (
        <div 
          className="mini-profile__tag-tooltip"
          style={{ left: hoverTooltipPos.x, top: hoverTooltipPos.y }}
        >
          Скопировать никнейм
        </div>
      )}
      {showTooltip && (
        <div 
          className="mini-profile__copy-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          Никнейм скопирован
        </div>
      )}
    </>
  );
}

/**
 * Компонент бейджика Discord с dropdown меню
 */
function DiscordBadge({ discordId, discordUsername }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const badgeRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (badgeRef.current && !showMenu) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      // Задержка 0.8s перед показом тултипа
      hoverTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 800);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.right + 8, y: rect.top });
      setShowMenu(true);
      setShowTooltip(false);
    }
  };

  const handleOpenProfile = () => {
    window.open(`https://discord.com/users/${discordId}`, '_blank');
    setShowMenu(false);
  };

  const handleCopyUsername = () => {
    const textToCopy = discordUsername || discordId;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 1000);
  };

  // Закрытие меню при клике вне
  useEffect(() => {
    if (!showMenu) return;
    
    const handleClickOutside = (e) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  return (
    <>
      <button
        ref={badgeRef}
        className="mini-profile__discord-icon"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </button>
      {showTooltip && (
        <div 
          className="mini-profile__action-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          Discord
        </div>
      )}
      {showMenu && (
        <div 
          className="mini-profile__discord-menu"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button className="mini-profile__discord-menu-item" onClick={handleOpenProfile}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Открыть профиль
          </button>
          <button className="mini-profile__discord-menu-item" onClick={handleCopyUsername}>
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Скопировано!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Скопировать ник
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Компонент кнопки редактирования профиля с тултипом
 */
function EditProfileButton({ onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      // Задержка 0.8s перед показом тултипа
      hoverTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 800);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="mini-profile__edit-btn"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      {showTooltip && (
        <div 
          className="mini-profile__tag-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          Редактировать профиль
        </div>
      )}
    </>
  );
}

/**
 * Компонент статуса "о себе" в виде облака мыслей
 */
function BioStatus({ text, isSelf, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [actionTooltip, setActionTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  
  // Определяем touch-устройство
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!text && !isSelf) return null;
  
  // Если нет текста и это свой профиль — показываем placeholder
  if (!text && isSelf) {
    return (
      <div 
        className="mini-profile__bio-bubble mini-profile__bio-bubble--empty"
        onClick={onEdit}
      >
        <div className="mini-profile__bio-text mini-profile__bio-text--placeholder">
          Нажмите, чтобы добавить статус...
        </div>
      </div>
    );
  }

  // Клик только для сенсорных устройств
  const handleClick = () => {
    if (isTouchDevice) {
      setExpanded(prev => !prev);
    }
  };

  // Hover только для десктопа
  const handleMouseEnter = () => {
    if (!isTouchDevice) setExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) setExpanded(false);
    setActionTooltip({ visible: false, text: '', x: 0, y: 0 });
  };

  const handleActionMouseEnter = (e, tooltipText) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActionTooltip({
      visible: true,
      text: tooltipText,
      x: rect.left + rect.width / 2,
      y: rect.top - 35
    });
  };

  const handleActionMouseLeave = () => {
    setActionTooltip({ visible: false, text: '', x: 0, y: 0 });
  };

  return (
    <div 
      className={`mini-profile__bio-bubble ${expanded ? "mini-profile__bio-bubble--expanded" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Кнопки редактирования и удаления (появляются при раскрытии) */}
      {isSelf && expanded && (
        <div className="mini-profile__bio-actions">
          <button 
            className="mini-profile__bio-action-btn mini-profile__bio-action-btn--edit"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            onMouseEnter={(e) => handleActionMouseEnter(e, 'Редактировать статус')}
            onMouseLeave={handleActionMouseLeave}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button 
            className="mini-profile__bio-action-btn mini-profile__bio-action-btn--delete"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            onMouseEnter={(e) => handleActionMouseEnter(e, 'Удалить статус')}
            onMouseLeave={handleActionMouseLeave}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}
      {actionTooltip.visible && (
        <div 
          className="mini-profile__action-tooltip"
          style={{ left: actionTooltip.x, top: actionTooltip.y }}
        >
          {actionTooltip.text}
        </div>
      )}
      <div className="mini-profile__bio-tail" />
      <div className="mini-profile__bio-text">{text}</div>
    </div>
  );
}

/**
 * Компонент выбора онлайн статуса
 */
function StatusSelector({ currentStatus, onSelect, onClose }) {
  return (
    <div className="mini-profile__status-selector">
      {USER_SELECTABLE_STATUSES.map((statusKey) => {
        const config = ONLINE_STATUS_CONFIG[statusKey];
        const isActive = currentStatus === statusKey;
        return (
          <button
            key={statusKey}
            className={`mini-profile__status-option ${isActive ? "mini-profile__status-option--active" : ""}`}
            onClick={() => {
              onSelect(statusKey);
              onClose();
            }}
          >
            <span className="mini-profile__status-option-icon">{config.icon}</span>
            <span className="mini-profile__status-option-label">{config.label}</span>
            {isActive && <span className="mini-profile__status-option-check">{"\u2713"}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Компонент превью биографии с 2 режимами
 * Поддержка: **bold**, *italic*, ~~strike~~, [link](url), > цитата
 * Показывает до 6 строк; имеет кнопку "Показать полностью" в полном профиле
 */
function BiographyPreview({ text, onOpenFullProfile }) {
  const [expanded, setExpanded] = useState(false);
  const [hasManyLines, setHasManyLines] = useState(false);
  const containerRef = useRef(null);
  const textRef = useRef(null);
  
  // Определяем touch-устройство
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Проверка реального количества строк после рендера
  useEffect(() => {
    if (!textRef.current || !containerRef.current || !text) return;
    
    // Создаём временный клон для измерения высоты текста
    const el = textRef.current;
    const clone = el.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.width = el.offsetWidth + 'px';
    
    document.body.appendChild(clone);
    
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 19.2; // fallback: 12px * 1.6
    const fullHeight = clone.scrollHeight;
    
    document.body.removeChild(clone);
    
    // Считаем количество строк
    const actualLines = Math.ceil(fullHeight / lineHeight);
    
    console.log('[BiographyPreview] Измерения:', { 
      text: text.substring(0, 50) + '...', 
      fullHeight, 
      lineHeight, 
      actualLines,
      hasManyLines: actualLines > 6 
    });
    
    setHasManyLines(actualLines > 6);
  }, [text]);
  
  if (!text) return null;
  
  // Клик для раскрытия на touch-устройствах
  const handleClick = () => {
    if (isTouchDevice) {
      setExpanded(prev => !prev);
    }
  };

  // Hover только для десктопа
  const handleMouseEnter = () => {
    if (!isTouchDevice) setExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) setExpanded(false);
  };

  // Форматируем текст
  const formattedContent = parseFormattedText(text);

  console.log('[BiographyPreview] render:', { expanded, hasManyLines, showButton: expanded && hasManyLines });

  return (
    <div 
      ref={containerRef}
      className={`mini-profile__biography ${expanded ? "mini-profile__biography--expanded" : ""} ${hasManyLines ? "mini-profile__biography--truncated" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div ref={textRef} className="mini-profile__biography-text">{formattedContent}</div>
      {!expanded && text.length > 80 && (
        <div className="mini-profile__biography-fade" />
      )}
      {expanded && hasManyLines && (
        <button 
          className="mini-profile__biography-full-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullProfile?.();
          }}
        >
          Открыть профиль
        </button>
      )}
    </div>
  );
}

/**
 * MiniProfile - Discord-style popup профиля
 */
export default function MiniProfile({
  targetUserId,
  socket,
  currentUserId,
  position,
  onClose,
  onOpenChat,
  onOpenFullProfile,
  onMoreMenu,
}) {
  const navigate = useNavigate();
  const popupRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [avatarTooltip, setAvatarTooltip] = useState({ show: false, x: 0, y: 0 });
  const [nicknameExpanded, setNicknameExpanded] = useState(false);
  const nicknameExpandTimeoutRef = useRef(null);
  const isHoveringNicknameRef = useRef(false);
  const avatarTooltipTimeoutRef = useRef(null);

  // Определяем "свой профиль"
  const isSelf = currentUserId && targetUserId 
    ? String(currentUserId) === String(targetUserId) 
    : profile?.isSelf || false;

  // Загрузка профиля
  useEffect(() => {
    if (!socket || !targetUserId) return;

    setLoading(true);
    setError(null);

    socket.emit("social:profile:get", { targetUserId }, (response) => {
      if (response.success) {
        setProfile(response.profile);
      } else {
        setError(response.error || "Ошибка загрузки профиля");
      }
      setLoading(false);
    });
  }, [socket, targetUserId]);

  // Вычисление позиции popup
  useEffect(() => {
    if (!popupRef.current || !position) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const popupWidth = rect.width || 320;
    const popupHeight = rect.height || 400;
    const padding = 12;

    let left = position.x + padding;
    let top = position.y;

    // Если не помещается справа — показываем слева
    if (left + popupWidth > window.innerWidth - padding) {
      left = position.x - popupWidth - padding;
    }

    // Если не помещается слева — по центру
    if (left < padding) {
      left = Math.max(padding, (window.innerWidth - popupWidth) / 2);
    }

    // Корректировка по вертикали
    if (top + popupHeight > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - popupHeight - padding);
    }

    if (top < padding) {
      top = padding;
    }

    setPopupPosition({ top, left });
  }, [position, profile, loading]);

  // Закрытие при клике вне popup
  useEffect(() => {
    // Не добавляем обработчики если открыт FullProfile
    if (showFullProfile) return;

    const handleClickOutside = (e) => {
      // Игнорируем клики по FullProfileModal
      if (e.target.closest('.full-profile-modal')) return;
      
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, showFullProfile]);

  // Добавление в друзья
  const handleAddFriend = useCallback(() => {
    if (!socket || !targetUserId) return;
    socket.emit("friends:request:send", { targetUserId }, (response) => {
      if (response.success) {
        setProfile(prev => prev ? { ...prev, friendshipStatus: "pending_sent" } : prev);
      }
    });
  }, [socket, targetUserId]);

  const handleAcceptFriend = useCallback(() => {
    if (!socket || !profile?.friendshipRequestId) return;
    socket.emit("friends:request:accept", { requestId: profile.friendshipRequestId }, (response) => {
      if (response.success) {
        setProfile(prev => prev ? { ...prev, friendshipStatus: "friends" } : prev);
      }
    });
  }, [socket, profile?.friendshipRequestId]);

  const handleSendMessage = useCallback(() => {
    onOpenChat?.(targetUserId);
    onClose?.();
  }, [onOpenChat, targetUserId, onClose]);

  const handleEditProfile = useCallback(() => {
    navigate("/profile");
    onClose?.();
  }, [navigate, onClose]);

  const handleMoreMenu = useCallback((e) => {
    e.stopPropagation();
    onMoreMenu?.(targetUserId, profile, e);
  }, [onMoreMenu, targetUserId, profile]);

  const handleOpenFullProfile = useCallback(() => {
    // Открываем FullProfileModal (MiniProfile скроется автоматически через CSS/состояние)
    setShowFullProfile(true);
    // Также вызываем внешний callback если есть
    onOpenFullProfile?.(targetUserId);
  }, [onOpenFullProfile, targetUserId]);

  // Обновление онлайн-статуса
  const handleChangeStatus = useCallback((newStatus) => {
    if (!socket) return;
    socket.emit("social:status:set", { status: newStatus }, (response) => {
      if (response.success) {
        setProfile(prev => prev ? { ...prev, onlineStatus: newStatus } : prev);
      }
    });
  }, [socket]);

  // Начать редактирование Bio
  const handleEditBio = useCallback(() => {
    setBioText(profile?.bio || "");
    setEditingBio(true);
  }, [profile?.bio]);

  // Сохранить Bio
  const handleSaveBio = useCallback(() => {
    if (!socket) return;
    socket.emit("social:bio:set", { bio: bioText.trim() }, (response) => {
      if (response.success) {
        setProfile(prev => prev ? { ...prev, bio: bioText.trim() } : prev);
        setEditingBio(false);
      }
    });
  }, [socket, bioText]);

  // Удалить Bio
  const handleDeleteBio = useCallback(() => {
    if (!socket) return;
    socket.emit("social:bio:set", { bio: "" }, (response) => {
      if (response.success) {
        setProfile(prev => prev ? { ...prev, bio: "" } : prev);
      }
    });
  }, [socket]);

  // Рендер онлайн статуса
  const renderOnlineStatus = () => {
    if (!profile) return null;
    const status = profile.onlineStatus || "offline";
    const config = ONLINE_STATUS_CONFIG[status];
    const gameConfig = profile.currentGameType ? GAME_CONFIG[profile.currentGameType] : null;

    return (
      <div className="mini-profile__status" style={{ color: config.color }}>
        <span className="mini-profile__status-icon">{config.icon}</span>
        <span>
          {status === "in_game" && gameConfig
            ? `Играет в ${gameConfig.name}`
            : config.label}
        </span>
      </div>
    );
  };

  // Рендер достижений (максимум 3 штуки, как в Clash Royale)
  const renderAchievements = () => {
    const featured = profile?.achievements?.featured?.slice(0, 3) || [];
    if (featured.length === 0) return null;

    return (
      <div className="mini-profile__achievements">
        {featured.map((achievement) => {
          const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
          return (
            <div
              key={achievement.id}
              className={`mini-profile__achievement mini-profile__achievement--${achievement.rarity || 'common'}`}
              style={{
                "--achievement-color": rarityConfig.color,
                "--achievement-glow": rarityConfig.color,
              }}
              title={`${achievement.name}\n${achievement.description}`}
            >
              {/* Левое крыло */}
              <div className="mini-profile__achievement-wing mini-profile__achievement-wing--left">
                <svg viewBox="0 0 24 40" fill="none">
                  <path d="M24 20C24 20 20 8 8 4C8 4 12 12 12 20C12 28 8 36 8 36C20 32 24 20 24 20Z" fill="url(#wingGradLeft)"/>
                  <path d="M20 20C20 20 16 10 6 6" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                  <path d="M20 20C20 20 16 30 6 34" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                  <defs>
                    <linearGradient id="wingGradLeft" x1="24" y1="20" x2="8" y2="20">
                      <stop offset="0%" stopColor="var(--achievement-color)"/>
                      <stop offset="100%" stopColor="transparent"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Правое крыло */}
              <div className="mini-profile__achievement-wing mini-profile__achievement-wing--right">
                <svg viewBox="0 0 24 40" fill="none">
                  <path d="M0 20C0 20 4 8 16 4C16 4 12 12 12 20C12 28 16 36 16 36C4 32 0 20 0 20Z" fill="url(#wingGradRight)"/>
                  <path d="M4 20C4 20 8 10 18 6" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                  <path d="M4 20C4 20 8 30 18 34" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                  <defs>
                    <linearGradient id="wingGradRight" x1="0" y1="20" x2="16" y2="20">
                      <stop offset="0%" stopColor="var(--achievement-color)"/>
                      <stop offset="100%" stopColor="transparent"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Правое крыло */}
              <div className="mini-profile__achievement-crown">
                <svg viewBox="0 0 32 20" fill="none">
                  <path d="M16 0L20 8L28 4L24 14H8L4 4L12 8L16 0Z" fill="url(#crownGrad)" stroke="#ffd700" strokeWidth="0.5"/>
                  <circle cx="16" cy="2" r="2" fill="#ff6b6b"/>
                  <circle cx="6" cy="6" r="1.5" fill="#4ecdc4"/>
                  <circle cx="26" cy="6" r="1.5" fill="#4ecdc4"/>
                  <defs>
                    <linearGradient id="crownGrad" x1="16" y1="0" x2="16" y2="14">
                      <stop offset="0%" stopColor="#ffd700"/>
                      <stop offset="50%" stopColor="#ffaa00"/>
                      <stop offset="100%" stopColor="#cc8800"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Правое крыло */}
              <div className="mini-profile__achievement-shield">
                <div className="mini-profile__achievement-ring">
                  <div className="mini-profile__achievement-inner">
                    <span className="mini-profile__achievement-icon">{achievement.icon}</span>
                  </div>
                </div>
              </div>

              {/* Правое крыло */}
              <div className="mini-profile__achievement-ribbon">
                <svg viewBox="0 0 48 12" fill="none">
                  <path d="M0 4L8 0V8L0 12V4Z" fill="url(#ribbonGrad)"/>
                  <path d="M48 4L40 0V8L48 12V4Z" fill="url(#ribbonGrad)"/>
                  <rect x="6" y="0" width="36" height="8" rx="1" fill="url(#ribbonGrad)"/>
                  <rect x="6" y="1" width="36" height="2" fill="rgba(255,255,255,0.3)"/>
                  <defs>
                    <linearGradient id="ribbonGrad" x1="24" y1="0" x2="24" y2="8">
                      <stop offset="0%" stopColor="var(--achievement-color)"/>
                      <stop offset="100%" stopColor="color-mix(in srgb, var(--achievement-color) 60%, black)"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Рендер статистики игр
  const renderGameStats = () => {
    const byGame = profile?.stats?.byGame || [];
    if (byGame.length === 0) return null;

    // Сортируем по времени игры, берём топ-4
    const sorted = [...byGame]
      .sort((a, b) => (b.playTimeMinutes || 0) - (a.playTimeMinutes || 0))
      .slice(0, 4);

    return (
      <div className="mini-profile__games">
        <div className="mini-profile__games-title">Любимые игры</div>
        {sorted.map((game) => {
          const config = GAME_CONFIG[game.gameType] || {};
          return (
            <div key={game.gameType} className="mini-profile__game">
              <span className="mini-profile__game-icon">{config.icon}</span>
              <span className="mini-profile__game-name">{config.name}</span>
              <span className="mini-profile__game-time">{formatPlayTime(game.playTimeMinutes)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Рендер кнопок действий в footer
  const renderActions = () => {
    // Для своего профиля кнопки не нужны — редактирование через иконку в header
    if (isSelf) {
      return null;
    }

    const { friendshipStatus } = profile || {};

    // Для чужих профилей — кнопка сообщения и прочие действия
    return (
      <div className="mini-profile__actions">
        {friendshipStatus === "friends" && (
          <Button
            variant="secondary"
            size="small"
            className="mini-profile__action-btn"
            onClick={handleSendMessage}
          >
            💬 Отправить сообщение
          </Button>
        )}
        
        {friendshipStatus === "pending_received" && (
          <Button
            variant="primary"
            size="small"
            className="mini-profile__action-btn"
            onClick={handleAcceptFriend}
          >
            ✓ Принять заявку в друзья
          </Button>
        )}
        
        {friendshipStatus === "pending_sent" && (
          <div className="mini-profile__pending-status">
            \u23F3 Заявка отправлена
          </div>
        )}

        {/* Кнопка полного профиля */}
        <button
          className="mini-profile__action-btn mini-profile__action-btn--full-profile"
          onClick={handleOpenFullProfile}
        >
          👤 Полный профиль
        </button>
      </div>
    );
  };

  // Рендер иконки добавления в друзья
  const renderFriendIcon = () => {
    if (isSelf || !profile) return null;
    
    const { friendshipStatus } = profile;
    
    if (friendshipStatus === "none") {
      return (
        <button
          className="mini-profile__friend-btn"
          onClick={handleAddFriend}
          title="Добавить в друзья"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="17" y1="11" x2="23" y2="11" />
          </svg>
        </button>
      );
    }
    
    if (friendshipStatus === "friends") {
      return (
        <div className="mini-profile__friend-badge" title="В друзьях">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        </div>
      );
    }
    
    if (friendshipStatus === "pending_sent") {
      return (
        <div className="mini-profile__friend-badge mini-profile__friend-badge--pending" title="Любимые игры">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <circle cx="20" cy="11" r="3" />
          </svg>
        </div>
      );
    }
    
    if (friendshipStatus === "pending_received") {
      return (
        <button
          className="mini-profile__friend-btn mini-profile__friend-btn--pending"
          onClick={handleAcceptFriend}
          title="Принять заявку"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        </button>
      );
    }
    
    return null;
  };

  const content = (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className="mini-profile"
        style={{ top: popupPosition.top, left: popupPosition.left }}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
      >
        {/* Header с кнопками (справа сверху) */}
        <div className="mini-profile__header-actions">
          {/* Кнопка редактирования для своего профиля */}
          {isSelf && (
            <EditProfileButton onClick={handleEditProfile} />
          )}
          
          {/* Иконка добавления в друзья для чужих профилей */}
          {renderFriendIcon()}
          
          {/* Кнопка "Ещё" для чужих профилей */}
          {!isSelf && (
            <button
              className="mini-profile__more-btn"
              onClick={handleMoreMenu}
              title="Ещё"
            >
              ⋮
            </button>
          )}
        </div>

        {/* Баннер с градиентом сверху */}
        <div className="mini-profile__banner">
          {profile?.bannerUrl ? (
            <img src={profile.bannerUrl} alt="" className="mini-profile__banner-img" />
          ) : (
            <div className="mini-profile__banner-default" />
          )}
        </div>

        {loading ? (
          <div className="mini-profile__loading">
            <div className="mini-profile__spinner" />
            <span>Загрузка...</span>
          </div>
        ) : error ? (
          <div className="mini-profile__error">
            <span>?</span>
            <span>{error}</span>
          </div>
        ) : profile ? (
          <>
            {/* Header: аватар слева с индикатором, Bio как облако мыслей */}
            <div className="mini-profile__header">
              {/* Левая колонка: аватар */}
              <div className="mini-profile__left-column">
                <div 
                  className="mini-profile__avatar-wrapper mini-profile__avatar-wrapper--clickable"
                  onClick={handleOpenFullProfile}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = { x: rect.left + rect.width / 2, y: rect.top - 35 };
                    // Задержка 0.8s перед показом тултипа
                    avatarTooltipTimeoutRef.current = setTimeout(() => {
                      setAvatarTooltip({ show: true, ...pos });
                    }, 800);
                  }}
                  onMouseLeave={() => {
                    if (avatarTooltipTimeoutRef.current) {
                      clearTimeout(avatarTooltipTimeoutRef.current);
                      avatarTooltipTimeoutRef.current = null;
                    }
                    setAvatarTooltip({ show: false, x: 0, y: 0 });
                  }}
                >
                  <AvatarFrame size="mp" frameSlug={profile.frameSlug}>
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" />
                    ) : (
                      <div className="mini-profile__avatar-placeholder">
                        {profile.nickname?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </AvatarFrame>
                  
                  {/* Индикатор статуса на аватаре */}
                  <div 
                    className={`mini-profile__status-indicator ${isSelf ? "mini-profile__status-indicator--clickable" : ""}`}
                    style={{ backgroundColor: ONLINE_STATUS_CONFIG[profile.onlineStatus || "offline"].color }}
                    onClick={isSelf ? (e) => { e.stopPropagation(); setShowStatusSelector(!showStatusSelector); } : undefined}
                    title={isSelf ? "Изменить статус" : ONLINE_STATUS_CONFIG[profile.onlineStatus || "offline"].label}
                  >
                    {profile.onlineStatus === "invisible" && isSelf && "??"}
                  </div>
                  
                </div>
              </div>

              {/* Селектор статуса — вынесен из avatar-wrapper для корректного z-index */}
              {isSelf && showStatusSelector && (
                <>
                  {/* Прозрачный overlay для закрытия при клике вне */}
                  <div 
                    className="mini-profile__status-overlay"
                    onClick={() => setShowStatusSelector(false)}
                  />
                  <div className="mini-profile__status-selector-container">
                    <StatusSelector
                      currentStatus={profile.onlineStatus || "online"}
                      onSelect={handleChangeStatus}
                      onClose={() => setShowStatusSelector(false)}
                    />
                  </div>
                </>
              )}

              {/* Правая колонка: облако мыслей (Bio) */}
              <div className="mini-profile__right-column">
                {editingBio ? (
                  <div className="mini-profile__bio-editor">
                    <textarea
                      className="mini-profile__bio-input"
                      value={bioText}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        // Ограничение: максимум 8 строк
                        const lines = newValue.split('\n');
                        if (lines.length <= 8) {
                          setBioText(newValue);
                        } else {
                          // Обрезаем до 8 строк
                          setBioText(lines.slice(0, 8).join('\n'));
                        }
                      }}
                      placeholder="Расскажи о себе..."
                      maxLength={200}
                      autoFocus
                      rows={4}
                    />
                    <div className="mini-profile__bio-editor-actions">
                      <button 
                        className="mini-profile__bio-editor-btn mini-profile__bio-editor-btn--save"
                        onClick={handleSaveBio}
                      >
                        ?
                      </button>
                      <button 
                        className="mini-profile__bio-editor-btn mini-profile__bio-editor-btn--cancel"
                        onClick={() => setEditingBio(false)}
                      >
                        ?
                      </button>
                    </div>
                  </div>
                ) : (
                  <BioStatus 
                    text={profile.bio} 
                    isSelf={isSelf}
                    onEdit={handleEditBio}
                    onDelete={handleDeleteBio}
                  />
                )}
              </div>
            </div>
            
            {/* Никнейм под header, центрирован по аватару */}
            <div 
              className={`mini-profile__nickname-row ${profile.nickname?.length > 12 ? "mini-profile__nickname-row--long" : ""} ${nicknameExpanded ? "mini-profile__nickname-row--expanded" : ""}`}
              onMouseLeave={() => {
                // При переходе на бейджики — сбрасываем флаг и отменяем таймер
                if (nicknameExpandTimeoutRef.current) {
                  clearTimeout(nicknameExpandTimeoutRef.current);
                  nicknameExpandTimeoutRef.current = null;
                }
                setNicknameExpanded(false);
              }}
            >
              <div 
                className="mini-profile__nickname-clickable"
                onClick={handleOpenFullProfile}
                onMouseEnter={() => {
                  if (profile.nickname?.length > 12) {
                    isHoveringNicknameRef.current = true;
                    // Задержка 0.8s перед раскрытием
                    nicknameExpandTimeoutRef.current = setTimeout(() => {
                      // Проверяем, что курсор всё ещё на никнейме
                      if (isHoveringNicknameRef.current) {
                        setNicknameExpanded(true);
                      }
                    }, 800);
                  }
                }}
                onMouseLeave={() => {
                  // Сбрасываем флаг и отменяем таймер
                  isHoveringNicknameRef.current = false;
                  if (nicknameExpandTimeoutRef.current) {
                    clearTimeout(nicknameExpandTimeoutRef.current);
                    nicknameExpandTimeoutRef.current = null;
                  }
                }}
              >
                <StyledNickname
                  name={profile.nickname}
                  customization={profile.nicknameStyle}
                  className="mini-profile__nickname"
                />
              </div>
              {(profile.tag || profile.discordId) && (
                <div 
                  className="mini-profile__nickname-badges"
                  onMouseEnter={() => {
                    // При переходе на бейджики — сбрасываем флаг и отменяем таймер
                    isHoveringNicknameRef.current = false;
                    if (nicknameExpandTimeoutRef.current) {
                      clearTimeout(nicknameExpandTimeoutRef.current);
                      nicknameExpandTimeoutRef.current = null;
                    }
                  }}
                >
                  {profile.tag && (
                    <TagBadge nickname={profile.nickname} tag={profile.tag} />
                  )}
                  {profile.discordId && (
                    <DiscordBadge discordId={profile.discordId} discordUsername={profile.discordUsername} />
                  )}
                </div>
              )}
            </div>

            {/*  */}
            <div className="mini-profile__info">
              {/* Описание (превью) */}
              {renderAchievements()}

              {/*  () */}
              <BiographyPreview text={profile.biography} onOpenFullProfile={handleOpenFullProfile} />

              {/*  */}
              <div className="mini-profile__meta-row">
                {profile.clan && (
                  <span className="mini-profile__clan">{profile.clan.name}</span>
                )}
              </div>
            </div>

            {/* Правое крыло */}
            {renderGameStats()}

            {/* Правое крыло */}
            <div className="mini-profile__footer">
              {renderActions()}
            </div>
          </>
        ) : null}
        
        {/* Кнопки действий */}
        {avatarTooltip.show && (
          <div 
            className="mini-profile__tag-tooltip"
            style={{ left: avatarTooltip.x, top: avatarTooltip.y }}
          >
            Открыть полный профиль
          </div>
        )}
        
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      {/* MiniProfile скрывается когда открыт FullProfile */}
      {!showFullProfile && createPortal(content, document.body)}
      
      {/* Full Profile Modal */}
      <FullProfileModal
        isOpen={showFullProfile}
        onClose={() => {
          setShowFullProfile(false);
          onClose?.(); // Закрываем и MiniProfile
        }}
        userId={targetUserId}
        isSelf={isSelf}
        socket={socket}
        onOpenChat={onOpenChat}
      />
    </>
  );
}
