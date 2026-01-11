import { motion, AnimatePresence } from "framer-motion";
import "./GameEndedModal.css";

/**
 * GameEndedModal — модальное окно уведомления о завершении игры организатором
 */
export default function GameEndedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="game-ended-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="game-ended-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="game-ended-modal__icon">
              🏁
            </div>
            
            <h2 className="game-ended-modal__title">
              Игра завершена
            </h2>
            
            <p className="game-ended-modal__message">
              Организатор завершил игру. Спасибо за участие!
            </p>
            
            <button 
              className="game-ended-modal__button"
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
