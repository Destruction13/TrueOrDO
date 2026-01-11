import { motion, AnimatePresence } from "framer-motion";
import "./ConfirmEndGameModal.css";

/**
 * ConfirmEndGameModal — модальное окно подтверждения завершения игры
 */
export default function ConfirmEndGameModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-end-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-end-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-end-modal__icon">
              ⚠️
            </div>
            
            <h2 className="confirm-end-modal__title">
              Завершить игру?
            </h2>
            
            <p className="confirm-end-modal__message">
              Все игроки будут отключены от комнаты и перенаправлены в главное меню. Это действие нельзя отменить.
            </p>
            
            <div className="confirm-end-modal__buttons">
              <button 
                className="confirm-end-modal__button confirm-end-modal__button--cancel"
                onClick={onCancel}
              >
                Нет
              </button>
              <button 
                className="confirm-end-modal__button confirm-end-modal__button--confirm"
                onClick={onConfirm}
              >
                Да, завершить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
