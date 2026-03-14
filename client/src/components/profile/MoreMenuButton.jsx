import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketReconnection } from '../../hooks/useSocketReconnection';
import { useNotification } from '../../context/NotificationContext';
import useIsMobile from '../../hooks/useIsMobile';
import './MoreMenuButton.css';
import './CommonTooltip.css';

/**
 * Кнопка "Ещё" (три точки) с выпадающим меню дополнительных действий
 * Используется в FullProfileModal для действий: Игнорировать, Заблокировать, Пожаловаться, Пригласить в клан
 * 
 * @param {Object} props
 * @param {string} props.targetUserId - ID пользователя профиля
 * @param {Object} props.socket - Socket.IO инстанс
 * @param {boolean} [props.isIgnored=false] - Игнорируется ли пользователь
 * @param {boolean} [props.isBlocked=false] - Заблокирован ли пользователь
 * @param {boolean} [props.canInviteToClan=false] - Может ли текущий пользователь приглашать в клан
 * @param {Function} props.onIgnore - Callback для игнорирования/разигнорирования
 * @param {Function} props.onBlock - Callback для блокировки/разблокировки
 * @param {Function} props.onReport - Callback для жалобы
 * @param {Function} [props.onReloadProfile] - Callback для перезагрузки данных профиля
 */
export default function MoreMenuButton({ 
  targetUserId,
  socket,
  isIgnored = false,
  isBlocked = false,
  canInviteToClan = false,
  onIgnore,
  onBlock,
  onReport,
  onReloadProfile
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const [hoverTooltipPos, setHoverTooltipPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const isMobile = useIsMobile();

  // Логирование пропсов при монтировании
  // (отладочные логи удалены после тестирования)

  // Обработка переподключения Socket.IO
  useSocketReconnection(socket, () => {
    // При восстановлении соединения перезагружаем данные профиля
    if (onReloadProfile) {
      onReloadProfile();
    }
  });

  // Обработка наведения мыши - показываем hover tooltip
  const handleMouseEnter = useCallback(() => {
    if (buttonRef.current && !isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setHoverTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      // Задержка 0.8s перед показом тултипа
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverTooltip(true);
      }, 800);
    }
  }, [isOpen]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverTooltip(false);
  }, []);

  // Открытие/закрытие меню
  const toggleMenu = useCallback(() => {
    // Скрываем hover tooltip при клике
    setShowHoverTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (!isOpen && buttonRef.current) {
      // Вычисляем позицию для десктопа (справа от кнопки)
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.right + 8,
        y: rect.top + rect.height / 2
      });
    }
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Обработка клавиатурных событий для кнопки
  const handleButtonKeyDown = useCallback((e) => {
    // Enter или Space открывают/закрывают меню
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
    // Escape закрывает меню
    else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  }, [toggleMenu, isOpen]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      // Проверяем, что клик не по кнопке и не по меню
      const isClickOnButton = buttonRef.current && buttonRef.current.contains(e.target);
      const isClickOnMenu = e.target.closest('.more-menu-button__menu');
      
      if (!isClickOnButton && !isClickOnMenu) {
        setIsOpen(false);
        // Возвращаем фокус на кнопку при закрытии
        if (buttonRef.current) {
          buttonRef.current.focus();
        }
      }
    };

    // Закрытие по Escape
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        // Возвращаем фокус на кнопку
        if (buttonRef.current) {
          buttonRef.current.focus();
        }
      }
    };

    // На мобильных также закрываем при клике на backdrop
    if (isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    } else {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, isMobile]);

  // Обработчики действий меню
  const handleIgnore = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    onIgnore?.();
    setIsOpen(false);
    // Возвращаем фокус на кнопку
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [onIgnore]);

  const handleBlock = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    onBlock?.();
    setIsOpen(false);
    // Возвращаем фокус на кнопку
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [onBlock]);

  const handleReport = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    onReport?.();
    setIsOpen(false);
    // Возвращаем фокус на кнопку
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [onReport]);

  const { addNotification } = useNotification();

  const handleInviteToClan = useCallback(() => {
    // Проверка наличия socket перед отправкой
    if (!socket) {
      addNotification({
        type: 'error',
        message: 'Нет соединения с сервером. Попробуйте позже.',
        duration: 4000
      });
      return;
    }

    // Проверка наличия targetUserId
    if (!targetUserId) {
      addNotification({
        type: 'error',
        message: 'Не указан пользователь для приглашения',
        duration: 3000
      });
      return;
    }
    
    socket.emit('social:clan:invite', { targetUserId }, (response) => {
      if (response?.success || response?.ok) {
        addNotification({
          type: 'success',
          message: 'Приглашение в клан отправлено',
          duration: 3000
        });
      } else {
        addNotification({
          type: 'error',
          message: response?.error || 'Не удалось отправить приглашение',
          duration: 4000
        });
      }
    });
    
    setIsOpen(false);
    // Возвращаем фокус на кнопку
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [socket, targetUserId, addNotification]);

  return (
    <>
      <button
        ref={buttonRef}
        className="more-menu-button"
        onClick={toggleMenu}
        onKeyDown={handleButtonKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Дополнительные действия"
        aria-expanded={isOpen}
      >
        <svg 
          className="more-menu-button__icon" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          {isMobile ? (
            // Мобильная версия: Bottom Sheet с backdrop
            <>
              <motion.div
                className="more-menu-button__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  setIsOpen(false);
                  // Возвращаем фокус на кнопку
                  if (buttonRef.current) {
                    buttonRef.current.focus();
                  }
                }}
              />
              <motion.div
                className="more-menu-button__menu more-menu-button__menu--mobile"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <div className="more-menu-button__menu-handle" />
                <button
                  className="more-menu-button__item"
                  onClick={handleIgnore}
                >
                  <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <span>{isIgnored ? 'Убрать из игнора' : 'Игнорировать'}</span>
                </button>

                <button
                  className="more-menu-button__item more-menu-button__item--danger"
                  onClick={handleBlock}
                >
                  <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>{isBlocked ? 'Разблокировать' : 'Заблокировать'}</span>
                </button>

                {canInviteToClan && (
                  <button
                    className="more-menu-button__item"
                    onClick={handleInviteToClan}
                  >
                    <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Пригласить в клан</span>
                  </button>
                )}

                <button
                  className="more-menu-button__item"
                  onClick={handleReport}
                >
                  <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Пожаловаться</span>
                </button>
              </motion.div>
            </>
          ) : (
            // Десктопная версия: Popover
            <div
              className="more-menu-button__menu"
              style={{
                left: `${menuPosition.x}px`,
                top: `${menuPosition.y}px`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="more-menu-button__item"
                onClick={handleIgnore}
              >
                <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                <span>{isIgnored ? 'Убрать из игнора' : 'Игнорировать'}</span>
              </button>

              <button
                className="more-menu-button__item more-menu-button__item--danger"
                onClick={handleBlock}
              >
                <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>{isBlocked ? 'Разблокировать' : 'Заблокировать'}</span>
              </button>

              {canInviteToClan && (
                <button
                  className="more-menu-button__item"
                  onClick={handleInviteToClan}
                >
                  <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Пригласить в клан</span>
                </button>
              )}

              <button
                className="more-menu-button__item"
                onClick={handleReport}
              >
                <svg className="more-menu-button__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Пожаловаться</span>
              </button>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Hover tooltip через Portal */}
      {showHoverTooltip && createPortal(
        <div
          className="common-tooltip"
          style={{ left: hoverTooltipPos.x, top: hoverTooltipPos.y }}
        >
          Ещё
        </div>,
        document.body
      )}
    </>
  );
}
