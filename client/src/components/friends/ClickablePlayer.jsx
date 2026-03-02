import { useState, useRef, useCallback } from "react";
import { MiniProfile, MiniProfileMoreMenu, FullProfileModal } from "../profile";
import "./ClickablePlayer.css";

/**
 * Обёртка для никнеймов игроков, делающая их кликабельными
 * При клике открывается MiniProfile (Discord-style popup)
 * 
 * @param {string} odlerId - ID пользователя
 * @param {string} odlerNickname - никнейм пользователя
 * @param {string} avatar - URL аватара
 * @param {string} frameSlug - рамка аватара
 * @param {string} onlineStatus - статус онлайн (online/offline/in_game/idle)
 * @param {string} currentGameType - тип текущей игры
 * @param {string} currentRoomCode - код текущей комнаты
 * @param {object} nicknameStyle - стиль никнейма
 * @param {string} relationshipStatus - статус отношений (none/friends/pending_sent/pending_received/blocked/self)
 * @param {object} socket - Socket.IO instance
 * @param {string} currentUserId - ID текущего пользователя (для определения "свой профиль")
 * @param {function} onOpenChat - callback при открытии чата
 * @param {function} onOpenProfile - callback при открытии полного профиля
 * @param {function} onInviteToGame - callback при приглашении в игру
 * @param {ReactNode} children - содержимое (никнейм)
 * @param {boolean} disabled - отключить кликабельность
 * @param {string} className - дополнительный класс
 */
export default function ClickablePlayer({
  odlerId,
  odlerNickname,
  avatar,
  frameSlug,
  onlineStatus,
  currentGameType,
  currentRoomCode,
  nicknameStyle,
  relationshipStatus = "none",
  socket,
  currentUserId,
  onOpenChat,
  onOpenProfile,
  onInviteToGame,
  children,
  disabled = false,
  className = "",
}) {
  const [miniProfileOpen, setMiniProfileOpen] = useState(false);
  const [miniProfilePosition, setMiniProfilePosition] = useState({ x: 0, y: 0 });
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuPosition, setMoreMenuPosition] = useState({ x: 0, y: 0 });
  const [moreMenuProfile, setMoreMenuProfile] = useState(null);
  const [fullProfileOpen, setFullProfileOpen] = useState(false);
  const triggerRef = useRef(null);

  // Обработчик открытия полного профиля
  const handleOpenFullProfile = useCallback((userId) => {
    if (onOpenProfile) {
      onOpenProfile(userId);
    } else {
      setFullProfileOpen(true);
    }
    setMiniProfileOpen(false);
  }, [onOpenProfile]);

  // Обработчик клика — открывает MiniProfile
  const handleClick = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Позиция справа от элемента
    setMiniProfilePosition({
      x: rect.right,
      y: rect.top,
    });
    setMiniProfileOpen(true);
  }, [disabled]);

  // Обработчик контекстного меню — также открывает MiniProfile
  const handleContextMenu = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();

    setMiniProfilePosition({
      x: e.clientX,
      y: e.clientY,
    });
    setMiniProfileOpen(true);
  }, [disabled]);

  // Закрытие MiniProfile
  const handleCloseMiniProfile = useCallback(() => {
    setMiniProfileOpen(false);
  }, []);

  // Открытие меню "ещё" (⋮)
  const handleMoreMenu = useCallback((targetUserId, profile, event) => {
    setMoreMenuProfile(profile);
    setMoreMenuPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setMoreMenuOpen(true);
  }, []);

  // Закрытие меню "ещё"
  const handleCloseMoreMenu = useCallback(() => {
    setMoreMenuOpen(false);
    setMoreMenuProfile(null);
  }, []);

  const isSelf = relationshipStatus === "self" || currentUserId === odlerId;

  return (
    <>
      <span
        ref={triggerRef}
        className={`clickable-player ${className} ${disabled ? "clickable-player--disabled" : ""}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e);
          }
        }}
      >
        {children}
      </span>

      {/* MiniProfile - Discord-style popup */}
      {miniProfileOpen && (
        <MiniProfile
          targetUserId={odlerId}
          socket={socket}
          currentUserId={currentUserId}
          position={miniProfilePosition}
          onClose={handleCloseMiniProfile}
          onOpenChat={onOpenChat}
          onOpenFullProfile={handleOpenFullProfile}
          onMoreMenu={handleMoreMenu}
        />
      )}

      {/* More Menu - выпадающее меню с доп. действиями */}
      {moreMenuOpen && (
        <MiniProfileMoreMenu
          targetUserId={odlerId}
          profile={moreMenuProfile}
          socket={socket}
          position={moreMenuPosition}
          onClose={handleCloseMoreMenu}
          onOpenFullProfile={handleOpenFullProfile}
        />
      )}

      {/* Полный профиль (модальное окно) */}
      <FullProfileModal
        isOpen={fullProfileOpen}
        userId={odlerId}
        isSelf={isSelf}
        socket={socket}
        onClose={() => setFullProfileOpen(false)}
        onOpenChat={onOpenChat}
      />
    </>
  );
}
