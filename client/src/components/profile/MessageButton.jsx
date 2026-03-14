import { useCallback, memo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSocial } from '../social/SocialIntegration';
import './MessageButton.css';
import './CommonTooltip.css';

/**
 * Бейджик "Сообщение" для открытия чата с пользователем
 * Используется в профилях игроков (FullProfileModal)
 * Отображается как круглая иконка с сообщением
 * 
 * @param {Object} props
 * @param {string} props.targetUserId - ID пользователя (odlerId) для открытия чата
 * @param {string} props.nickname - Никнейм пользователя
 * @param {string} [props.avatar] - URL аватара пользователя
 * @param {Function} [props.onClose] - Callback для закрытия родительского модального окна
 * @param {boolean} [props.disabled=false] - Отключена ли кнопка
 */
function MessageButton({ targetUserId, nickname, avatar, onClose, disabled = false }) {
  const { openChat } = useSocial();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleClick = useCallback(() => {
    if (openChat && targetUserId && nickname) {
      // Скрываем tooltip при клике
      setShowTooltip(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Открываем мессенджер с конкретным игроком
      // MessengerModal автоматически фокусируется на поле ввода через inputRef
      openChat(targetUserId, nickname, avatar);
      
      // Закрываем родительское модальное окно профиля
      onClose?.();
    }
  }, [openChat, targetUserId, nickname, avatar, onClose]);

  const handleMouseEnter = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      // Задержка 0.8s перед показом тултипа
      hoverTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 800);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        className="message-badge"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        aria-label="Написать сообщение"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {showTooltip && createPortal(
        <div
          className="common-tooltip"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          Написать сообщение
        </div>,
        document.body
      )}
    </>
  );
}

export default memo(MessageButton);
