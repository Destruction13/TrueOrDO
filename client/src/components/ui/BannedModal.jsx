import { motion, AnimatePresence } from "framer-motion";
import "./BannedModal.css";

/**
 * BannedModal — модальное окно для уведомления об исключении из комнаты
 */
export default function BannedModal({ isOpen, roomCode, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="banned-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="banned-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="banned-modal__icon">
              🚫
            </div>
            
            <h2 className="banned-modal__title">
              Доступ ограничен
            </h2>
            
            <p className="banned-modal__message">
              Организатор комнаты {roomCode && (
                <span className="banned-modal__code">{roomCode}</span>
              )} исключил вас из игры. Вы не можете присоединиться к этой комнате повторно.
            </p>
            
            <button 
              className="banned-modal__button"
              onClick={onClose}
            >
              Понятно
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
