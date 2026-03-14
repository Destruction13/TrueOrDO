import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import AvatarFrame from "../ui/AvatarFrame";
import StyledNickname from "../ui/StyledNickname";
import Button from "../ui/Button";
import MessageButton from "./MessageButton";
import AddFriendButton from "./AddFriendButton";
import FriendshipBadge from "./FriendshipBadge";
import "./CommonTooltip.css";
import MoreMenuButton from "./MoreMenuButton";
import FriendNoteField from "./FriendNoteField";
import RegistrationDate from "./RegistrationDate";
import { authSocket, useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { useSocial } from "../social/SocialIntegration";
import "./FullProfileSidebar.css";

//     
const BASIC_EMOJIS = [
  "\uD83D\uDE00", "\uD83D\uDE01", "\uD83D\uDE02", "\uD83D\uDE03", "\uD83D\uDE04", "\uD83D\uDE05", "\uD83D\uDE06", "\uD83D\uDE09",
  "\uD83D\uDE0A", "\uD83D\uDE0D", "\uD83E\uDD70", "\uD83D\uDE18", "\uD83D\uDE1C", "\uD83E\uDD14", "\uD83D\uDE0E", "\uD83E\uDD29",
  "\uD83D\uDE22", "\u2764", "\uD83D\uDC4D", "\uD83D\uDC4E", "\uD83D\uDC4C", "\uD83D\uDD25", "\uD83C\uDF89", "\uD83C\uDF1F"
];

/**
 *        React-
 * : **bold**, *italic*, ~~strikethrough~~, > , []()
 */
function parseFormattedText(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
    
    //   
    if (line.startsWith('> ')) {
      elements.push(
        <span key={`quote-${lineIndex}`} className="bio-quote">
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
 *  -: **bold**, *italic*, ~~strike~~, [text](url),   URL
 */
function parseInlineFormatting(text, keyPrefix = 0) {
  const elements = [];
  //      URL
  //     (https?://...)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\~\~(.+?)\~\~)|(\[(.+?)\]\((.+?)\))|(https?:\/\/[^\s<>"\[\]]+)/g;
  
  let lastIndex = 0;
  let match;
  let matchIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    //    
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
          className="bio-link"
        >
          {match[8]}
        </a>
      );
    } else if (match[10]) {
      //   (https://...)
      const url = match[10];
      //  trailing punctuation  
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      const trailingChars = url.slice(cleanUrl.length);
      elements.push(
        <a 
          key={`url-${keyPrefix}-${matchIndex}`} 
          href={cleanUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bio-link"
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
  
  //   
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
  
  return elements.length > 0 ? elements : [text];
}

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

// Конфигурация игр
const GAME_CONFIG = {
  tod: { name: "Правда или Действие", icon: "\uD83C\uDFAD", color: "#e74c3c" },
  alias: { name: "Alias", icon: "\uD83D\uDCAC", color: "#3498db" },
  codenames: { name: "Codenames", icon: "\uD83D\uDD75\uFE0F", color: "#2ecc71" },
  emotional: { name: "Emotional", icon: "\uD83D\uDE0A", color: "#9b59b6" },
};

// Бейджи уровня/премиума
const LEVEL_BADGES = [
  { minLevel: 1, icon: "\uD83C\uDF31", label: "Новичок", color: "#95a5a6" },
  { minLevel: 5, icon: "\u2B50", label: "Игрок", color: "#3498db" },
  { minLevel: 10, icon: "\uD83D\uDC8E", label: "Опытный", color: "#9b59b6" },
  { minLevel: 25, icon: "\uD83D\uDC51", label: "Ветеран", color: "#f1c40f" },
  { minLevel: 50, icon: "\uD83D\uDD25", label: "Легенда", color: "#e74c3c" },
];

/**
 * Форматирует дату регистрации в формат "1 янв. 2024 г."
 */
function formatMemberSince(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ["янв.", "фев.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сен.", "окт.", "ноя.", "дек."];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year} г.`;
}

/**
 *   
 */
function getLevelBadge(level = 1) {
  //    
  let badge = LEVEL_BADGES[0];
  for (const b of LEVEL_BADGES) {
    if (level >= b.minLevel) {
      badge = b;
    }
  }
  return badge;
}

/**
 *         
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
    
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    }
    setShowTooltip(true);
    setShowHoverTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setTimeout(() => setShowTooltip(false), 1500);
  };

  const handleMouseEnter = () => {
    if (badgeRef.current && !showTooltip) {
      const rect = badgeRef.current.getBoundingClientRect();
      setHoverTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
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
        className="full-profile-sidebar__tag-badge"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        #{tag}
      </button>
      {showHoverTooltip && createPortal(
        <div 
          className="common-tooltip"
          style={{ left: `${hoverTooltipPos.x}px`, top: `${hoverTooltipPos.y}px` }}
        >
          Скопировать никнейм
        </div>,
        document.body
      )}
      {showTooltip && createPortal(
        <div 
          className="common-tooltip common-tooltip--success common-tooltip--notification"
          style={{ 
            left: `${tooltipPos.x}px`, 
            top: `${tooltipPos.y}px`
          }}
        >
          Никнейм скопирован
        </div>,
        document.body
      )}
    </>
  );
}

/**
 *     (dropdown)
 */
function StatusSelector({ currentStatus, onSelect, onClose }) {
  const selectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleStatusClick = useCallback((statusKey) => {
    onSelect(statusKey);
    onClose();
  }, [onSelect, onClose]);

  return (
    <motion.div 
      ref={selectorRef}
      className="full-profile-sidebar__status-selector"
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {USER_SELECTABLE_STATUSES.map((statusKey) => {
        const config = ONLINE_STATUS_CONFIG[statusKey];
        const isActive = currentStatus === statusKey;
        return (
          <button
            key={statusKey}
            className={`full-profile-sidebar__status-option ${isActive ? "active" : ""}`}
            onClick={() => handleStatusClick(statusKey)}
          >
            <span className="full-profile-sidebar__status-option-icon">{config.icon}</span>
            <span className="full-profile-sidebar__status-option-label">{config.label}</span>
            {isActive && <span className="full-profile-sidebar__status-option-check">{"\u2713"}</span>}
          </button>
        );
      })}
    </motion.div>
  );
}

/**
 *     (  )
 * :      (  MiniProfile)
 */
function BioCloud({ text, isSelf, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [actionTooltip, setActionTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  if (!text && !isSelf) return null;

  //    placeholder   
  if (!text && isSelf) {
    return (
      <div 
        className="full-profile-sidebar__bio-bubble full-profile-sidebar__bio-bubble--empty"
        onClick={onEdit}
      >
        <div className="full-profile-sidebar__bio-text full-profile-sidebar__bio-text--placeholder">
          Нажмите, чтобы добавить статус...
        </div>
      </div>
    );
  }

  const handleClick = () => {
    if (isTouchDevice) setExpanded(prev => !prev);
  };

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
      className={`full-profile-sidebar__bio-bubble ${expanded ? "full-profile-sidebar__bio-bubble--expanded" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/*   (     ) */}
      {isSelf && expanded && (
        <div className="full-profile-sidebar__bio-actions">
          <button 
            className="full-profile-sidebar__bio-action-btn full-profile-sidebar__bio-action-btn--edit"
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
            className="full-profile-sidebar__bio-action-btn full-profile-sidebar__bio-action-btn--delete"
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
      {actionTooltip.visible && createPortal(
        <div 
          className="common-tooltip"
          style={{ left: actionTooltip.x, top: actionTooltip.y }}
        >
          {actionTooltip.text}
        </div>,
        document.body
      )}
      <div className="full-profile-sidebar__bio-text">{text}</div>
    </div>
  );
}

/**
 *   
 * :     (fullprofdoska.png)
 */
function UserRoles({ roles = [] }) {
  if (!roles || roles.length === 0) return null;

  return (
    <div className="full-profile-sidebar__roles">
      <div className="full-profile-sidebar__section-title"></div>
      <div className="full-profile-sidebar__roles-list">
        {roles.map((role, index) => (
          <span 
            key={index}
            className="full-profile-sidebar__role-badge"
            style={{ "--role-color": role.color || "#7c3aed" }}
          >
            <span className="full-profile-sidebar__role-dot" />
            {role.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 *     WYSIWYG 
 *      
 *      (  Word)
 *     ,   
 */
function BiographyEditor({ value, onChange, onSave, onCancel, maxLength = 200, onSaveWithValue }) {
  const editorRef = useRef(null);
  const contentEditableRef = useRef(null);
  const toolbarRef = useRef(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, strikethrough: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const saveCalledRef = useRef(false);
  const currentValueRef = useRef(value);

  //  markdown  HTML  
  const markdownToHtml = useCallback((text) => {
    if (!text) return '';
    let html = text
      //  HTML  ( )
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      //  **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      //  *text* (  **)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      //  ~~text~~
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      //  
      .replace(/\n/g, '<br>');
    return html;
  }, []);

  //   DOM   markdown
  const nodeToMarkdown = useCallback((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      //  zero-width spaces (    )
      return (node.textContent || '').replace(/\u200B/g, '');
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const tagName = node.tagName.toLowerCase();
    let content = '';
    
    //    
    for (const child of node.childNodes) {
      content += nodeToMarkdown(child);
    }
    
    //    
    if (!content.trim() && ['strong', 'b', 'em', 'i', 's', 'strike', 'del'].includes(tagName)) {
      return content;
    }
    
    //      
    switch (tagName) {
      case 'strong':
      case 'b':
        return `**${content}**`;
      case 'em':
      case 'i':
        return `*${content}*`;
      case 's':
      case 'strike':
      case 'del':
        return `~~${content}~~`;
      case 'br':
        return '\n';
      case 'div':
        // div      contenteditable
        return content ? `\n${content}` : '\n';
      case 'span':
        // span   ,   
        return content;
      default:
        return content;
    }
  }, []);

  //  HTML   markdown  DOM 
  const htmlToMarkdown = useCallback((html) => {
    if (!html) return '';
    
    //     
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    let result = '';
    for (const child of temp.childNodes) {
      result += nodeToMarkdown(child);
    }
    
    //     
    result = result.replace(/^\n/, '');
    //  HTML entities
    result = result
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');
    
    return result;
  }, [nodeToMarkdown]);

  //    
  useEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = markdownToHtml(value);
      //   
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(contentEditableRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      contentEditableRef.current.focus();
    }
  }, []);

  //  ref   value
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  //     
  const checkActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strikethrough: document.queryCommandState('strikeThrough')
    });
  }, []);

  //      
  const handleSelect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString();
    if (selectedText.length > 0) {
      setShowToolbar(true);
      checkActiveFormats();
    } else {
      setShowToolbar(false);
    }
  }, [checkActiveFormats]);

  //   (WYSIWYG  execCommand)
  const applyFormatting = useCallback((command) => {
    const selection = window.getSelection();
    const hadSelection = selection && selection.toString().length > 0;
    
    document.execCommand(command, false, null);
    contentEditableRef.current?.focus();
    
    //      ,
    //     
    if (hadSelection && selection) {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const container = range.startContainer;
          
          // ,      
          let formatNode = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container;
          
          while (formatNode && formatNode !== contentEditableRef.current) {
            const tagName = formatNode.tagName?.toLowerCase();
            if (['strong', 'b', 'em', 'i', 's', 'strike', 'del'].includes(tagName)) {
              //       
              const textNode = document.createTextNode('\u200B'); // zero-width space
              formatNode.parentNode.insertBefore(textNode, formatNode.nextSibling);
              
              //     
              const newRange = document.createRange();
              newRange.setStart(textNode, 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              break;
            }
            formatNode = formatNode.parentElement;
          }
        }
      }, 10);
    }
    
    //  markdown 
    setTimeout(() => {
      const html = contentEditableRef.current?.innerHTML || '';
      const markdown = htmlToMarkdown(html);
      if (markdown.length <= maxLength) {
        onChange(markdown);
      }
      checkActiveFormats();
      setShowToolbar(false); //    
    }, 20);
  }, [onChange, maxLength, htmlToMarkdown, checkActiveFormats]);

  //  
  const insertEmoji = useCallback((emoji) => {
    contentEditableRef.current?.focus();
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(emoji));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      //   
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML += emoji;
      }
    }
    
    setShowEmojiPicker(false);
    
    //  markdown 
    setTimeout(() => {
      const html = contentEditableRef.current?.innerHTML || '';
      const markdown = htmlToMarkdown(html);
      if (markdown.length <= maxLength) {
        onChange(markdown);
      }
    }, 0);
  }, [onChange, maxLength, htmlToMarkdown]);

  //   
  const handleToggleEmojiPickerInEditor = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  //   
  const handleInsertEmoji = useCallback((emoji) => {
    insertEmoji(emoji);
  }, [insertEmoji]);

  //  
  const handleInput = useCallback(() => {
    const html = contentEditableRef.current?.innerHTML || '';
    const markdown = htmlToMarkdown(html);
    
    if (markdown.length <= maxLength) {
      onChange(markdown);
    } else {
      //    
      contentEditableRef.current.innerHTML = markdownToHtml(value);
      //    
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(contentEditableRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [onChange, maxLength, htmlToMarkdown, markdownToHtml, value]);

  //      
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmojiPicker && !e.target.closest('.bio-editor__emoji-picker') && 
          !e.target.closest('.bio-editor__emoji-trigger')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  //   (  )
  const doSave = useCallback(() => {
    if (saveCalledRef.current) {
      return;
    }
    saveCalledRef.current = true;
    //     
    const html = contentEditableRef.current?.innerHTML || '';
    const markdown = htmlToMarkdown(html);
    //     
    if (onSaveWithValue) {
      onSaveWithValue(markdown);
    } else {
      onChange(markdown);
      onSave();
    }
  }, [onSave, onSaveWithValue, onChange, htmlToMarkdown]);

  //     
  useEffect(() => {
    const handleClickOutsideEditor = (e) => {
      if (editorRef.current && !editorRef.current.contains(e.target)) {
        doSave();
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutsideEditor);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutsideEditor);
    };
  }, [doSave]);

  //     
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!document.activeElement?.closest('.bio-editor__toolbar') &&
          !document.activeElement?.closest('.bio-editor__emoji-picker') &&
          !document.activeElement?.closest('.bio-editor__emoji-trigger')) {
        setShowToolbar(false);
      }
    }, 150);
  }, []);

  //  
  const handleKeyDown = useCallback((e) => {
    //   Ctrl+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      doSave();
      return;
    }
    
    //          
    if (e.key === 'ArrowRight') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        // ,      
        if (container.nodeType === Node.TEXT_NODE && 
            range.startOffset === container.textContent.length) {
          let formatNode = container.parentElement;
          
          while (formatNode && formatNode !== contentEditableRef.current) {
            const tagName = formatNode.tagName?.toLowerCase();
            if (['strong', 'b', 'em', 'i', 's', 'strike', 'del'].includes(tagName)) {
              // ,      
              if (!formatNode.nextSibling || formatNode.nextSibling.nodeType !== Node.TEXT_NODE) {
                e.preventDefault();
                
                //      
                let textNode = formatNode.nextSibling;
                if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
                  textNode = document.createTextNode('\u200B');
                  formatNode.parentNode.insertBefore(textNode, formatNode.nextSibling);
                }
                
                //  
                const newRange = document.createRange();
                newRange.setStart(textNode, textNode.nodeType === Node.TEXT_NODE ? Math.min(1, textNode.textContent.length) : 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                checkActiveFormats();
              }
              break;
            }
            formatNode = formatNode.parentElement;
          }
        }
      }
    }
  }, [doSave, checkActiveFormats]);

  return (
    <div className="bio-editor bio-editor--wysiwyg" ref={editorRef}>
      <div className="bio-editor__input-wrapper">
        {/*        */}
        <AnimatePresence>
          {showToolbar && (
            <motion.div 
              ref={toolbarRef}
              className="bio-editor__toolbar"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
            >
              <button 
                className={`bio-editor__toolbar-btn ${activeFormats.bold ? 'bio-editor__toolbar-btn--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }}
                title=""
              >
                <strong>B</strong>
              </button>
              <button 
                className={`bio-editor__toolbar-btn ${activeFormats.italic ? 'bio-editor__toolbar-btn--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }}
                title=""
              >
                <em>I</em>
              </button>
              <button 
                className={`bio-editor__toolbar-btn ${activeFormats.strikethrough ? 'bio-editor__toolbar-btn--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); applyFormatting('strikeThrough'); }}
                title=""
              >
                <s>S</s>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/*     ,    */}
        <button 
          className="bio-editor__emoji-trigger"
          onClick={handleToggleEmojiPickerInEditor}
          title="Эмодзи"
        >
          {"\uD83D\uDE0A"}
        </button>

        {/*   */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              className="bio-editor__emoji-picker"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {BASIC_EMOJIS.map((emoji, idx) => (
                <button 
                  key={idx}
                  className="bio-editor__emoji-btn"
                  onClick={() => handleInsertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* WYSIWYG  */}
        <div
          ref={contentEditableRef}
          className="bio-editor__contenteditable"
          contentEditable
          onInput={handleInput}
          onSelect={handleSelect}
          onMouseUp={handleSelect}
          onKeyUp={handleSelect}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          data-placeholder="  "
          suppressContentEditableWarning
        />
        
        {/*    */}
        <div className="bio-editor__char-count">
          {maxLength - value.length}
        </div>
      </div>

      {/* :  ,   */}
      <div className="bio-editor__actions">
        <button 
          className="bio-editor__action-btn bio-editor__action-btn--save"
          onClick={doSave}
          title="Сохранить"
        >
          {"\u2713"}
        </button>
        <button 
          className="bio-editor__action-btn bio-editor__action-btn--close"
          onClick={onCancel}
          title="Отмена"
        >
          {"\u2715"}
        </button>
      </div>
    </div>
  );
}

/**
 * FullProfileSidebar     
 * : , ,  , ,  , , , 
 *    MiniProfile
 */
/**
 *   Discord  dropdown 
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
      //  0.2s   
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

  //     
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
        className="full-profile-sidebar__discord-icon"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </button>
      {showTooltip && createPortal(
        <div 
          className="common-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          Discord
        </div>,
        document.body
      )}
      {showMenu && createPortal(
        <div 
          className="full-profile-sidebar__discord-menu"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button className="full-profile-sidebar__discord-menu-item" onClick={handleOpenProfile}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Открыть профиль
          </button>
          <button className="full-profile-sidebar__discord-menu-item" onClick={handleCopyUsername}>
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
        </div>,
        document.body
      )}
    </>
  );
}

/**
 *     tooltip
 */
function BiographyEditButton({ onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      //  0.2s   
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
        ref={btnRef}
        className="full-profile-sidebar__biography-edit-btn"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {"\u270F\uFE0F"}
      </button>
      {showTooltip && createPortal(
        <div 
          className="common-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          Редактировать описание
        </div>,
        document.body
      )}
    </>
  );
}

function FullProfileSidebar({ 
  profileData, 
  isSelf, 
  onProfileUpdate,
  onClose,
  onAddFriend,
  onMoreMenu,
  socket,
  onBeforeClose,
  onReloadProfile,
}) {
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [editingBiography, setEditingBiography] = useState(false);
  const [biographyText, setBiographyText] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [nicknameExpanded, setNicknameExpanded] = useState(false);
  const [canInviteToClan, setCanInviteToClan] = useState(false);
  const nicknameExpandTimeoutRef = useRef(null);
  const isHoveringNicknameRef = useRef(false);
  const statusButtonRef = useRef(null);
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { openChat } = useSocial();
  
  // Получаем текущего пользователя из AuthContext
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  // Проверка прав на приглашение в клан
  // Загружаем информацию о членстве текущего пользователя в клане
  useEffect(() => {
    if (!socket || isSelf) {
      setCanInviteToClan(false);
      return;
    }

    // Запрашиваем информацию о клане текущего пользователя
    socket.emit('social:clan:my', {}, (response) => {
      if (response?.success && response?.clan) {
        // Проверяем роль: leader или moderator могут приглашать
        const role = response.clan.role;
        setCanInviteToClan(role === 'leader' || role === 'moderator');
      } else {
        setCanInviteToClan(false);
      }
    });
  }, [socket, isSelf]);

  // Слушаем обновления статуса друзей в реальном времени
  useEffect(() => {
    if (!socket || !profileData?.id || isSelf) return;

    const targetId = profileData.id;

    const handleFriendsUpdated = (data) => {
      // Обновляем статус если событие касается этого пользователя
      if (data.userId === targetId || data.friendId === targetId) {
        const updates = {
          friendStatus: data.newStatus || data.status || profileData.friendStatus
        };
        if (data.requestId) {
          updates.friendRequestId = data.requestId;
        }
        onProfileUpdate?.(updates);
      }
    };

    const handleRequestAccepted = (data) => {
      if (data.friend?.id === targetId) {
        onProfileUpdate?.({ friendStatus: "friends", friendRequestId: null });
      }
    };

    const handleFriendRemoved = (data) => {
      if (data.byUserId === targetId || data.userId === targetId) {
        onProfileUpdate?.({ friendStatus: "none", friendRequestId: null });
      }
    };

    socket.on('social:friends:updated', handleFriendsUpdated);
    socket.on('friends:request:accepted', handleRequestAccepted);
    socket.on('friends:removed', handleFriendRemoved);

    return () => {
      socket.off('social:friends:updated', handleFriendsUpdated);
      socket.off('friends:request:accepted', handleRequestAccepted);
      socket.off('friends:removed', handleFriendRemoved);
    };
  }, [socket, profileData?.id, profileData?.friendStatus, isSelf, onProfileUpdate]);

  if (!profileData) return null;

  const {
    id,
    visitorId,
    visitorIdShort,
    nickname,
    tag,
    nicknameStyle,
    avatar,
    avatarUrl,
    frameSlug,
    bannerUrl,
    bio,
    biography,
    discordId,
    level = 1,
    onlineStatus = "offline",
    currentGameType,
    currentRoomCode,
    createdAt,
    memberSince,
    premiumUntil,
    roles = [],
    userNote,
    friendStatus, // "none" | "pending_sent" | "pending_received" | "friends" | "blocked"
    friendRequestId, // ID заявки для pending статусов
    isIgnored,
  } = profileData;

  //  avatarUrl  avatar ( )
  const avatarSrc = avatarUrl || avatar;
  
  const statusConfig = ONLINE_STATUS_CONFIG[onlineStatus] || ONLINE_STATUS_CONFIG.offline;
  const gameConfig = currentGameType ? GAME_CONFIG[currentGameType] : null;
  const levelBadge = getLevelBadge(level);
  const isPremium = premiumUntil && new Date(premiumUntil) > new Date();

  //   Bio (  MiniProfile)
  const handleEditBio = useCallback(() => {
    setBioText(bio || "");
    setEditingBio(true);
  }, [bio]);

  //  Bio (  MiniProfile -  social:bio:set)
  const handleSaveBio = useCallback(() => {
    if (!socket) return;
    socket.emit("social:bio:set", { bio: bioText.trim() }, (response) => {
      if (response.success) {
        onProfileUpdate?.({ bio: bioText.trim() });
        setEditingBio(false);
      }
    });
  }, [socket, bioText, onProfileUpdate]);

  //  Bio (  MiniProfile)
  const handleDeleteBio = useCallback(() => {
    if (!socket) return;
    socket.emit("social:bio:set", { bio: "" }, (response) => {
      if (response.success) {
        onProfileUpdate?.({ bio: "" });
      }
    });
  }, [socket, onProfileUpdate]);

  //   Bio ( )
  const handleCancelBio = useCallback(() => {
    setBioText(bio || "");
    setEditingBio(false);
  }, [bio]);

  //   Biography ( "")
  const handleEditBiography = useCallback(() => {
    setBiographyText(biography || "");
    setEditingBiography(true);
  }, [biography]);

  // Ref     biographyText
  const biographyTextRef = useRef(biographyText);
  useEffect(() => {
    biographyTextRef.current = biographyText;
  }, [biographyText]);

  //  Biography
  const handleSaveBiography = useCallback(() => {
    const socketToUse = authSocket || socket;
    if (!socketToUse) return;
    const textToSave = biographyTextRef.current.trim();
    socketToUse.emit("social:biography:set", { biography: textToSave }, (response) => {
      if (response?.success || response?.ok) {
        onProfileUpdate?.({ biography: textToSave });
        setEditingBiography(false);
      }
    });
  }, [socket, onProfileUpdate]);

  //  Biography    (   BiographyEditor)
  //  authSocket   
  const handleSaveBiographyWithValue = useCallback((textValue) => {
    const socketToUse = authSocket || socket;
    if (!socketToUse) {
      return;
    }
    const textToSave = (textValue || "").trim();
    socketToUse.emit("social:biography:set", { biography: textToSave }, (response) => {
      if (response?.success || response?.ok) {
        onProfileUpdate?.({ biography: textToSave });
        setEditingBiography(false);
        setBiographyText(textToSave);
      }
    });
  }, [socket, onProfileUpdate]);

  //   Biography ( )
  const handleCancelBiography = useCallback(() => {
    setBiographyText(biography || "");
    setEditingBiography(false);
  }, [biography]);

  //   Bio ( )
  const handleCancelBioEditing = useCallback(() => {
    setEditingBio(false);
  }, []);

  //   
  const handleToggleStatusSelector = useCallback(() => {
    if (isSelf) {
      setShowStatusSelector(prev => !prev);
    }
  }, [isSelf]);

  //   
  const handleCloseStatusSelector = useCallback(() => {
    setShowStatusSelector(false);
  }, []);

  //  Bio 
  const handleBioTextChange = useCallback((e) => {
    const newValue = e.target.value;
    // :  8 
    const lines = newValue.split('\n');
    if (lines.length <= 8) {
      setBioText(newValue);
    } else {
      //   8 
      setBioText(lines.slice(0, 8).join('\n'));
    }
  }, []);

  //   
  const handleNavigateToProfile = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  //   
  const handleCloseReportModal = useCallback(() => {
    setShowReportModal(false);
  }, []);

  //   
  const handleToggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  //   
  const handleNicknameMouseLeave = useCallback(() => {
    //    
    if (nicknameExpandTimeoutRef.current) {
      clearTimeout(nicknameExpandTimeoutRef.current);
      nicknameExpandTimeoutRef.current = null;
    }
    setNicknameExpanded(false);
  }, []);

  //   
  const handleNicknameWrapperMouseEnter = useCallback(() => {
    if (nickname?.length > 12) {
      isHoveringNicknameRef.current = true;
      //  0.8s  
      nicknameExpandTimeoutRef.current = setTimeout(() => {
        // ,      
        if (isHoveringNicknameRef.current) {
          setNicknameExpanded(true);
        }
      }, 800);
    }
  }, [nickname]);

  //   
  const handleNicknameWrapperMouseLeave = useCallback(() => {
    //     
    isHoveringNicknameRef.current = false;
    if (nicknameExpandTimeoutRef.current) {
      clearTimeout(nicknameExpandTimeoutRef.current);
      nicknameExpandTimeoutRef.current = null;
    }
  }, []);

  //    
  const handleNicknameBadgesMouseEnter = useCallback(() => {
    //     -     
    isHoveringNicknameRef.current = false;
    if (nicknameExpandTimeoutRef.current) {
      clearTimeout(nicknameExpandTimeoutRef.current);
      nicknameExpandTimeoutRef.current = null;
    }
  }, []);

  //      
  useEffect(() => {
    if (onBeforeClose && editingBiography) {
      //      
      onBeforeClose(() => {
        const socketToUse = authSocket || socket;
        const textToSave = biographyTextRef.current.trim();
        if (socketToUse && textToSave !== (biography || "")) {
          socketToUse.emit("social:biography:set", { biography: textToSave }, (response) => {
            if (response?.success || response?.ok) {
              onProfileUpdate?.({ biography: textToSave });
            }
          });
        }
      });
    } else if (onBeforeClose) {
      //      
      onBeforeClose(null);
    }
  }, [onBeforeClose, editingBiography, biography, socket, onProfileUpdate]);

  // Игнорирование
  const handleIgnore = useCallback(() => {
    if (!socket || !id) {
      console.error('[FullProfileSidebar] handleIgnore: missing socket or id', { socket: !!socket, id });
      addNotification({
        type: 'error',
        message: 'Ошибка: нет соединения или ID пользователя',
        duration: 3000
      });
      return;
    }
    
    const event = isIgnored ? "social:ignore:remove" : "social:ignore:add";
    
    setActionLoading("ignore");
    socket.emit(event, { targetUserId: id }, (response) => {
      setActionLoading(null);
      if (response.ok) {
        onProfileUpdate?.({ isIgnored: !isIgnored });
        addNotification({
          type: 'success',
          message: isIgnored ? 'Пользователь убран из игнора' : 'Пользователь добавлен в игнор',
          duration: 2500
        });
      } else {
        addNotification({
          type: 'error',
          message: response.error || 'Не удалось выполнить действие',
          duration: 3000
        });
      }
    });
  }, [socket, id, isIgnored, onProfileUpdate, addNotification]);

  // Блокировка
  const handleBlock = useCallback(() => {
    if (!socket || !id) {
      console.error('[FullProfileSidebar] handleBlock: missing socket or id', { socket: !!socket, id });
      addNotification({
        type: 'error',
        message: 'Ошибка: нет соединения или ID пользователя',
        duration: 3000
      });
      return;
    }
    
    const isBlocked = friendStatus === "blocked";
    const event = isBlocked ? "friends:unblock" : "friends:block";
    
    setActionLoading("block");
    socket.emit(event, { targetUserId: id }, (response) => {
      setActionLoading(null);
      if (response.success || response.ok) {
        onProfileUpdate?.({ friendStatus: isBlocked ? "none" : "blocked" });
        addNotification({
          type: 'success',
          message: isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован',
          duration: 2500
        });
      } else {
        addNotification({
          type: 'error',
          message: response.error || 'Не удалось выполнить действие',
          duration: 3000
        });
      }
    });
  }, [socket, id, friendStatus, onProfileUpdate, addNotification]);

  // Жалоба
  const handleReport = useCallback(() => {
    setShowReportModal(true);
  }, []);

  // Отправка жалобы
  const handleSubmitReport = useCallback(() => {
    if (!socket || !id || !reportReason) return;
    
    setReportLoading(true);
    socket.emit("social:profile:report", {
      targetUserId: id,
      reason: reportReason,
      comment: reportComment || null,
    }, (response) => {
      setReportLoading(false);
      if (response.ok) {
        setShowReportModal(false);
        setReportReason("");
        setReportComment("");
        addNotification({
          type: 'success',
          message: 'Жалоба успешно отправлена',
          duration: 3000
        });
      } else {
        addNotification({
          type: 'error',
          message: response.error || 'Не удалось отправить жалобу',
          duration: 4000
        });
      }
    });
  }, [socket, id, reportReason, reportComment, addNotification]);

  //   
  const handleStatusChange = useCallback((newStatus) => {
    if (socket) {
      socket.emit("social:status:set", { status: newStatus }, (response) => {
        if (response.success) {
          onProfileUpdate?.({ onlineStatus: newStatus });
        }
      });
    }
  }, [socket, onProfileUpdate]);

  //  " "
  const handleFriendAction = useCallback(() => {
    if (friendStatus === "none") {
      onAddFriend?.(id);
    }
  }, [friendStatus, id, onAddFriend]);

  //   
  const getFriendButtonText = () => {
    switch (friendStatus) {
      case "friend": return "?  ";
      case "pending": return "?  ";
      case "blocked": return "?? ";
      default: return "??  ";
    }
  };

  return (
    <aside className="full-profile-sidebar">
      {/*   */}
      <div className="full-profile-sidebar__banner">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="full-profile-sidebar__banner-img" />
        ) : (
          <div className="full-profile-sidebar__banner-default" />
        )}
      </div>

      {/* Header:  , Bio   (  MiniProfile) */}
      <div className="full-profile-sidebar__header">
        {/*  :     */}
        <div className="full-profile-sidebar__left-column">
          <div className="full-profile-sidebar__avatar-wrapper">
            <AvatarFrame
              size="l"
              frameSlug={frameSlug}
            >
              {avatarSrc ? (
                <img 
                  src={avatarSrc} 
                  alt={nickname}
                  className="full-profile-sidebar__avatar-img"
                />
              ) : (
                <div className="full-profile-sidebar__avatar-placeholder">
                  {nickname?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </AvatarFrame>
            
            {/*    */}
            <div 
              ref={statusButtonRef}
              className={`full-profile-sidebar__status-indicator ${isSelf ? "full-profile-sidebar__status-indicator--clickable" : ""}`}
              style={{ backgroundColor: statusConfig.color }}
              onClick={handleToggleStatusSelector}
              title={isSelf ? " " : statusConfig.label}
            >
              {onlineStatus === "invisible" && isSelf && "??"}
            </div>
          </div>
        </div>

        {/*  :  Bio   (  MiniProfile) */}
        <div className="full-profile-sidebar__right-column">
          {editingBio ? (
            <div className="full-profile-sidebar__bio-editor">
              <textarea
                className="full-profile-sidebar__bio-input"
                value={bioText}
                onChange={handleBioTextChange}
                placeholder="  ..."
                maxLength={200}
                autoFocus
                rows={4}
              />
              <div className="full-profile-sidebar__bio-editor-actions">
                <button 
                  className="full-profile-sidebar__bio-editor-btn full-profile-sidebar__bio-editor-btn--save"
                  onClick={handleSaveBio}
                >
                  ?
                </button>
                <button 
                  className="full-profile-sidebar__bio-editor-btn full-profile-sidebar__bio-editor-btn--cancel"
                  onClick={handleCancelBioEditing}
                >
                  {"\u2715"}
                </button>
              </div>
            </div>
          ) : (
            <BioCloud 
              text={bio} 
              isSelf={isSelf} 
              onEdit={handleEditBio}
              onDelete={handleDeleteBio}
            />
          )}
        </div>

        {/*   (   z-index) */}
        <AnimatePresence>
          {showStatusSelector && isSelf && (
            <>
              <div 
                className="full-profile-sidebar__status-overlay"
                onClick={handleCloseStatusSelector}
              />
              <div className="full-profile-sidebar__status-selector-container">
                <StatusSelector
                  currentStatus={onlineStatus}
                  onSelect={handleStatusChange}
                  onClose={() => setShowStatusSelector(false)}
                />
              </div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ,        (  MiniProfile) */}
      <div className="full-profile-sidebar__nickname-section">
        <div 
          className={`full-profile-sidebar__nickname-row ${nickname?.length > 12 ? "full-profile-sidebar__nickname-row--long" : ""} ${nicknameExpanded ? "full-profile-sidebar__nickname-row--expanded" : ""}`}
          onMouseLeave={handleNicknameMouseLeave}
        >
          <div 
            className="full-profile-sidebar__nickname-wrapper"
            onMouseEnter={handleNicknameWrapperMouseEnter}
            onMouseLeave={handleNicknameWrapperMouseLeave}
          >
            <StyledNickname
              id="profile-modal-title"
              name={nickname}
              customization={nicknameStyle}
              className="full-profile-sidebar__nickname"
            />
          </div>
          {(tag || discordId) && (
            <div 
              className="full-profile-sidebar__nickname-badges"
              onMouseEnter={handleNicknameBadgesMouseEnter}
            >
              {tag && <TagBadge nickname={nickname} tag={tag} />}
              {discordId && (
                <DiscordBadge discordId={discordId} discordUsername={profileData?.discordUsername} />
              )}
            </div>
          )}
        </div>
        
        {/*   (  )     */}
        {(isPremium || gameConfig) && (
          <div className="full-profile-sidebar__badges">
            {isPremium && (
              <span className="full-profile-sidebar__premium-badge" title="">
                {"\u2B50"} Premium
              </span>
            )}
            {gameConfig && (
              <span 
                className="full-profile-sidebar__game-badge"
                style={{ "--game-color": gameConfig.color }}
              >
                {gameConfig.icon} {gameConfig.name.split(" ")[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="full-profile-sidebar__actions">
        {isSelf ? (
          <button 
            className="full-profile-sidebar__edit-btn"
            onClick={handleNavigateToProfile}
          >
            Редактировать профиль
          </button>
        ) : (
          <div className="full-profile-sidebar__action-row">
            {/* Если друзья или отправлена заявка - показываем полноразмерную кнопку "Написать" + бейджик статуса */}
            {friendStatus === "friends" || friendStatus === "pending_sent" ? (
              <>
                <button
                  className="full-profile-sidebar__message-btn-full"
                  onClick={() => {
                    if (openChat) {
                      openChat(id, nickname, avatarSrc);
                      onClose?.();
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Написать
                </button>
                <FriendshipBadge
                  targetUserId={id}
                  currentUserId={currentUserId}
                  socket={socket}
                  initialStatus={friendStatus}
                  friendRequestId={friendRequestId}
                  onReloadProfile={onReloadProfile}
                />
              </>
            ) : (
              /* Если не друзья и нет заявки - показываем кнопку "Добавить в друзья" + круглый бейджик сообщения */
              <>
                <AddFriendButton
                  targetUserId={id}
                  socket={socket}
                  onSuccess={onReloadProfile}
                />
                <MessageButton 
                  targetUserId={id}
                  nickname={nickname}
                  avatar={avatarSrc}
                  onClose={onClose}
                />
              </>
            )}
            <MoreMenuButton
              targetUserId={id}
              socket={socket}
              isIgnored={isIgnored}
              isBlocked={friendStatus === "blocked"}
              canInviteToClan={canInviteToClan}
              onIgnore={handleIgnore}
              onBlock={handleBlock}
              onReport={handleReport}
              onReloadProfile={onReloadProfile}
            />
          </div>
        )}
      </div>

      {/*  */}
      <div className="full-profile-sidebar__biography-section">
        <div className="full-profile-sidebar__biography-header">
          <div className="full-profile-sidebar__biography-title-row">
            <span className="full-profile-sidebar__section-title">Описание</span>
            {isSelf && !editingBiography && (
              <BiographyEditButton onClick={handleEditBiography} />
            )}
          </div>
          {isSelf && !editingBiography && !biography && (
            <span className="full-profile-sidebar__biography-hint">
              Расскажите о себе
            </span>
          )}
        </div>
        
        {editingBiography ? (
          <BiographyEditor
            value={biographyText}
            onChange={setBiographyText}
            onSave={handleSaveBiography}
            onSaveWithValue={handleSaveBiographyWithValue}
            onCancel={handleCancelBiography}
            maxLength={200}
          />
        ) : (
          <div className="full-profile-sidebar__biography-display">
            {biography ? (
              <div className="full-profile-sidebar__biography-content">
                {parseFormattedText(biography)}
              </div>
            ) : null}
          </div>
        )}
      </div>



      {/*  "   " */}
      {(memberSince || createdAt) && (
        <div className="full-profile-sidebar__member-since">
          <RegistrationDate createdAt={memberSince || createdAt} />
        </div>
      )}

      {/*  */}
      <UserRoles roles={roles} />

      {/*  (  ) */}
      {!isSelf && friendStatus === "friend" && (
        <div className="full-profile-sidebar__friend-note-section">
          <FriendNoteField
            targetUserId={id}
            initialNote={userNote}
            socket={socket}
            onSave={(newNote) => onProfileUpdate?.({ userNote: newNote })}
            onReloadProfile={onReloadProfile}
          />
        </div>
      )}

      {/*    */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            className="full-profile-sidebar__report-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseReportModal}
          >
            <motion.div
              className="full-profile-sidebar__report-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>  </h3>
              <select
                className="full-profile-sidebar__report-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="">Выберите причину</option>
                <option value="offensive_avatar">Оскорбительный аватар</option>
                <option value="offensive_nickname">Оскорбительный никнейм</option>
                <option value="offensive_bio">Оскорбительный статус/биография</option>
                <option value="spam">Спам</option>
                <option value="other">Другое</option>
              </select>
              <textarea
                className="full-profile-sidebar__report-comment"
                placeholder="Дополнительный комментарий (необязательно)"
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                maxLength={500}
              />
              <div className="full-profile-sidebar__report-actions">
                <button
                  className="full-profile-sidebar__report-btn full-profile-sidebar__report-btn--cancel"
                  onClick={handleCloseReportModal}
                >
                  Отмена
                </button>
                <button
                  className="full-profile-sidebar__report-btn full-profile-sidebar__report-btn--submit"
                  onClick={handleSubmitReport}
                  disabled={!reportReason || reportLoading}
                >
                  {reportLoading ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

export default FullProfileSidebar;
