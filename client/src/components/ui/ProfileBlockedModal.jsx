import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import "./ProfileBlockedModal.css";

/**
 * Модальное окно при блокировке профиля из-за жалоб
 */
export default function ProfileBlockedModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleEditProfile = () => {
    navigate("/profile");
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="profile-blocked-modal__overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="profile-blocked-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="profile-blocked-modal__icon">⚠️</div>
          
          <h2 className="profile-blocked-modal__title">
            Профиль заблокирован
          </h2>
          
          <p className="profile-blocked-modal__message">
            На ваш профиль поступило много жалоб от других пользователей.
            Пожалуйста, отредактируйте профиль (аватар, никнейм, описание)
            в соответствии с правилами сообщества.
          </p>
          
          <p className="profile-blocked-modal__warning">
            До редактирования профиля доступ к играм будет ограничен.
          </p>

          <div className="profile-blocked-modal__actions">
            <Button
              variant="primary"
              size="medium"
              onClick={handleEditProfile}
            >
              ✏️ Редактировать профиль
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
