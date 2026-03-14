import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import FullProfileSidebar from "./FullProfileSidebar";
import FullProfileTabs from "./FullProfileTabs";
import useFocusTrap from "../../hooks/useFocusTrap";
import "./FullProfileModal.css";

/**
 * ProfileSkeleton — скелетон загрузки профиля
 */
function ProfileSkeleton() {
  return (
    <div className="full-profile-modal__skeleton">
      {/* Sidebar skeleton */}
      <div className="full-profile-modal__skeleton-sidebar">
        <div className="skeleton-avatar" />
        <div className="skeleton-line skeleton-line--lg" />
        <div className="skeleton-line skeleton-line--md" />
        <div className="skeleton-buttons">
          <div className="skeleton-btn" />
          <div className="skeleton-btn skeleton-btn--sm" />
        </div>
        <div className="skeleton-section">
          <div className="skeleton-line skeleton-line--sm" />
          <div className="skeleton-line skeleton-line--md" />
        </div>
      </div>
      
      {/* Tabs skeleton */}
      <div className="full-profile-modal__skeleton-tabs">
        <div className="skeleton-tabs-header">
          <div className="skeleton-tab" />
          <div className="skeleton-tab" />
          <div className="skeleton-tab" />
        </div>
        <div className="skeleton-content">
          <div className="skeleton-line skeleton-line--sm" />
          <div className="skeleton-cards">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
          <div className="skeleton-line skeleton-line--sm" style={{ marginTop: 24 }} />
          <div className="skeleton-game-card" />
          <div className="skeleton-game-card" />
        </div>
      </div>
    </div>
  );
}

/**
 * Полный профиль игрока — модальное окно с двухколоночным layout
 * Референс дизайна: image/README/fullprofdoska.png, image/README/active.png
 * 
 * Левая колонка: FullProfileSidebar (аватар, статус, никнейм, роли, заметка)
 * Правая колонка: FullProfileTabs (Доска, Активность, Вишлист)
 */
function FullProfileModal({ 
  isOpen, 
  onClose, 
  userId, 
  isSelf = false,
  initialTab = "board",
  socket,
  onAddFriend,
  onMoreMenu,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const beforeCloseCallbackRef = useRef(null);
  
  // Refs для focus management
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const triggerElementRef = useRef(null);

  // Focus trap для модального окна
  useFocusTrap(modalRef, isOpen);

  // Функция для регистрации колбэка сохранения при закрытии
  const handleBeforeClose = useCallback((callback) => {
    beforeCloseCallbackRef.current = callback;
  }, []);

  // Закрытие с сохранением и возвратом фокуса
  const handleClose = useCallback(() => {
    // Если есть зарегистрированный колбэк - вызываем его для сохранения
    if (beforeCloseCallbackRef.current) {
      beforeCloseCallbackRef.current();
      beforeCloseCallbackRef.current = null;
    }
    
    // Возвращаем фокус на trigger элемент
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
    }
    
    onClose();
  }, [onClose]);

  // Функция загрузки профиля (вынесена для переиспользования)
  const loadProfile = useCallback(() => {
    if (!userId || !socket) return;

    let isRequestCompleted = false;
    
    setIsLoading(true);
    setError(null);

    // Используем profile:get для получения данных
    socket.emit("profile:get", { targetUserId: userId }, (response) => {
      isRequestCompleted = true;
      
      if (response?.success && response?.profile) {
        // Добавляем дефолтные значения если нет данных
        const profileWithDefaults = {
          ...response.profile,
          favoriteGames: response.profile.favoriteGames || [],
          currentGames: response.profile.currentGames || [],
          wishlistGames: response.profile.wishlistGames || [],
          favoriteGame: response.profile.favoriteGame || null,
          widgets: response.profile.widgets || [
            { type: "favorite_games", isVisible: true },
            { type: "current_games", isVisible: true },
          ],
          activities: response.profile.activities || [],
        };
        setProfileData(profileWithDefaults);
      } else {
        console.error("Ошибка загрузки профиля:", response?.error);
        setError(response?.error || "Не удалось загрузить профиль");
      }
      setIsLoading(false);
    });

    // Таймаут на случай если сервер не отвечает
    const timeout = setTimeout(() => {
      if (!isRequestCompleted) {
        setError("Превышено время ожидания");
        setIsLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [userId, socket]);

  // Загрузка данных профиля при открытии модала
  useEffect(() => {
    if (!isOpen) return;
    loadProfile();
  }, [isOpen, loadProfile]);

  // Focus management при открытии модала
  useEffect(() => {
    if (!isOpen) return;

    // Сохраняем ссылку на элемент, который открыл модал
    triggerElementRef.current = document.activeElement;

    // Переводим фокус на первый focusable элемент (кнопка закрытия)
    // Используем небольшую задержку для завершения анимации
    const focusTimeout = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimeout);
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Блокировка скролла body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Клик по backdrop
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Обновление данных профиля (для редактирования)
  const handleProfileUpdate = useCallback((updates) => {
    setProfileData(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="full-profile-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            className="full-profile-modal__container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Кнопка закрытия */}
            <button 
              ref={closeButtonRef}
              className="full-profile-modal__close-btn"
              onClick={handleClose}
              aria-label="Закрыть"
            >
              ✕
            </button>

            {isLoading ? (
              <div className="full-profile-modal__loading">
                <ProfileSkeleton />
              </div>
            ) : error ? (
              <div className="full-profile-modal__error">
                <span className="full-profile-modal__error-icon">⚠️</span>
                <span>{error}</span>
                <button 
                  className="full-profile-modal__retry-btn"
                  onClick={() => setError(null)}
                >
                  Попробовать снова
                </button>
              </div>
            ) : (
              <div className="full-profile-modal__content">
                {/* Левая колонка — Sidebar */}
                <FullProfileSidebar
                  profileData={profileData}
                  isSelf={isSelf}
                  onProfileUpdate={handleProfileUpdate}
                  socket={socket}
                  onClose={onClose}
                  onAddFriend={onAddFriend}
                  onMoreMenu={onMoreMenu}
                  onBeforeClose={handleBeforeClose}
                  onReloadProfile={loadProfile}
                />

                {/* Правая колонка — Tabs */}
                <FullProfileTabs
                  profileData={profileData}
                  isSelf={isSelf}
                  initialTab={initialTab}
                  onProfileUpdate={handleProfileUpdate}
                  socket={socket}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

export default FullProfileModal;
