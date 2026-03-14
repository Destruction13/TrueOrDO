import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import "./MiniProfileMoreMenu.css";

// Причины жалобы на профиль
const REPORT_REASONS = [
  { value: "offensive_avatar", label: "Оскорбительный аватар" },
  { value: "offensive_nickname", label: "Оскорбительный никнейм" },
  { value: "offensive_bio", label: "Оскорбительное описание" },
  { value: "spam", label: "Спам" },
  { value: "other", label: "Другое" },
];

/**
 * MiniProfileMoreMenu - Выпадающее меню с дополнительными действиями
 */
export default function MiniProfileMoreMenu({
  targetUserId,
  profile,
  socket,
  position,
  onClose,
  onOpenFullProfile,
}) {
  const menuRef = useRef(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Вычисление позиции меню
  useEffect(() => {
    if (!menuRef.current || !position) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const menuWidth = rect.width || 220;
    const menuHeight = rect.height || 250;
    const padding = 8;

    let left = position.x;
    let top = position.y;

    // Корректировка по горизонтали
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    // Корректировка по вертикали
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    setMenuPosition({ top, left });
  }, [position]);

  // Закрытие при клике вне меню
  useEffect(() => {
    if (showReportModal) return; // Не закрываем если открыт модал жалобы

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, showReportModal]);

  // Полный профиль
  const handleFullProfile = useCallback(() => {
    onOpenFullProfile?.(targetUserId);
    onClose?.();
  }, [onOpenFullProfile, targetUserId, onClose]);

  // Пригласить в клан
  const handleInviteToClan = useCallback(() => {
    if (!socket || !targetUserId || !profile?.viewerClanId) return;
    
    setActionLoading("invite");
    socket.emit("clan:invite:send", {
      clanId: profile.viewerClanId,
      targetUserId,
    }, (response) => {
      setActionLoading(null);
      if (response.ok) {
        onClose?.();
      } else {
        console.error("[MiniProfileMoreMenu] Clan invite error:", response.error);
      }
    });
  }, [socket, targetUserId, profile?.viewerClanId, onClose]);

  // Игнорировать
  const handleIgnore = useCallback(() => {
    if (!socket || !targetUserId) return;
    
    const isIgnored = profile?.isIgnored;
    const event = isIgnored ? "social:ignore:remove" : "social:ignore:add";
    
    setActionLoading("ignore");
    socket.emit(event, { targetUserId }, (response) => {
      setActionLoading(null);
      if (response.ok) {
        onClose?.();
      } else {
        console.error("[MiniProfileMoreMenu] Ignore error:", response.error);
      }
    });
  }, [socket, targetUserId, profile?.isIgnored, onClose]);

  // Заблокировать
  const handleBlock = useCallback(() => {
    if (!socket || !targetUserId) return;
    
    const isBlocked = profile?.friendshipStatus === "blocked";
    const event = isBlocked ? "friends:unblock" : "friends:block";
    
    setActionLoading("block");
    socket.emit(event, { targetUserId }, (response) => {
      setActionLoading(null);
      if (response.success || response.ok) {
        onClose?.();
      } else {
        console.error("[MiniProfileMoreMenu] Block error:", response.error);
      }
    });
  }, [socket, targetUserId, profile?.friendshipStatus, onClose]);

  // Пожаловаться
  const handleReport = useCallback(() => {
    setShowReportModal(true);
  }, []);

  // Отправить жалобу
  const handleSubmitReport = useCallback(() => {
    if (!socket || !targetUserId || !reportReason) return;
    
    setReportLoading(true);
    socket.emit("social:profile:report", {
      targetUserId,
      reason: reportReason,
      comment: reportComment || null,
    }, (response) => {
      setReportLoading(false);
      if (response.ok) {
        setShowReportModal(false);
        onClose?.();
      } else {
        console.error("[MiniProfileMoreMenu] Report error:", response.error);
      }
    });
  }, [socket, targetUserId, reportReason, reportComment, onClose]);

  // Закрыть модал жалобы
  const handleCloseReportModal = useCallback(() => {
    setShowReportModal(false);
    setReportReason("");
    setReportComment("");
  }, []);

  const isBlocked = profile?.friendshipStatus === "blocked";
  const isIgnored = profile?.isIgnored;
  const canInviteToClan = profile?.canInviteToClan;

  const menuContent = (
    <motion.div
      ref={menuRef}
      className="mini-profile-more-menu"
      style={{ top: menuPosition.top, left: menuPosition.left }}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      {/* Полный профиль */}
      <button className="mini-profile-more-menu__item" onClick={handleFullProfile}>
        <span className="mini-profile-more-menu__icon">👤</span>
        <span>Полный профиль</span>
      </button>

      {/* Пригласить в клан */}
      {canInviteToClan && (
        <button
          className="mini-profile-more-menu__item"
          onClick={handleInviteToClan}
          disabled={actionLoading === "invite"}
        >
          <span className="mini-profile-more-menu__icon">🏰</span>
          <span>{actionLoading === "invite" ? "Отправка..." : "Пригласить в клан"}</span>
        </button>
      )}

      <div className="mini-profile-more-menu__divider" />

      {/* Игнорировать */}
      <button
        className="mini-profile-more-menu__item mini-profile-more-menu__item--warning"
        onClick={handleIgnore}
        disabled={actionLoading === "ignore"}
      >
        <span className="mini-profile-more-menu__icon">{isIgnored ? "👁️" : "🙈"}</span>
        <span>
          {actionLoading === "ignore"
            ? "Загрузка..."
            : isIgnored
              ? "Убрать из игнора"
              : "Игнорировать"}
        </span>
      </button>

      {/* Заблокировать */}
      <button
        className="mini-profile-more-menu__item mini-profile-more-menu__item--danger"
        onClick={handleBlock}
        disabled={actionLoading === "block"}
      >
        <span className="mini-profile-more-menu__icon">{isBlocked ? "🔓" : "🚫"}</span>
        <span>
          {actionLoading === "block"
            ? "Загрузка..."
            : isBlocked
              ? "Разблокировать"
              : "Заблокировать"}
        </span>
      </button>

      <div className="mini-profile-more-menu__divider" />

      {/* Пожаловаться */}
      <button
        className="mini-profile-more-menu__item mini-profile-more-menu__item--danger"
        onClick={handleReport}
      >
        <span className="mini-profile-more-menu__icon">⚠️</span>
        <span>Пожаловаться</span>
      </button>
    </motion.div>
  );

  const reportModalContent = showReportModal && (
    <motion.div
      className="mini-profile-report-modal__overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleCloseReportModal}
    >
      <motion.div
        className="mini-profile-report-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mini-profile-report-modal__header">
          <h3>Пожаловаться на профиль</h3>
          <button
            className="mini-profile-report-modal__close"
            onClick={handleCloseReportModal}
          >
            ✕
          </button>
        </div>

        <div className="mini-profile-report-modal__content">
          <p className="mini-profile-report-modal__subtitle">
            Выберите причину жалобы на профиль пользователя{" "}
            <strong>{profile?.nickname}</strong>
          </p>

          <div className="mini-profile-report-modal__reasons">
            {REPORT_REASONS.map((reason) => (
              <label key={reason.value} className="mini-profile-report-modal__reason">
                <input
                  type="radio"
                  name="reportReason"
                  value={reason.value}
                  checked={reportReason === reason.value}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <span>{reason.label}</span>
              </label>
            ))}
          </div>

          <textarea
            className="mini-profile-report-modal__comment"
            placeholder="Дополнительный комментарий (необязательно)"
            value={reportComment}
            onChange={(e) => setReportComment(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="mini-profile-report-modal__footer">
          <button
            className="mini-profile-report-modal__btn mini-profile-report-modal__btn--cancel"
            onClick={handleCloseReportModal}
          >
            Отмена
          </button>
          <button
            className="mini-profile-report-modal__btn mini-profile-report-modal__btn--submit"
            onClick={handleSubmitReport}
            disabled={!reportReason || reportLoading}
          >
            {reportLoading ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {menuContent}
      {reportModalContent}
    </AnimatePresence>,
    document.body
  );
}
