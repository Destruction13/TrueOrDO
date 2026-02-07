import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";
import "./BatteryModeButton.css";

export default function BatteryModeButton({ gameId }) {
  const { toggleShaders, isShadersDisabled } = useSettings();
  const [showModal, setShowModal] = useState(false);

  // Шейдеры сейчас отключены = режим экономии включён
  const isBatterySaveMode = isShadersDisabled(gameId);

  const handleClick = () => {
    // Всегда показываем модалку для подтверждения
    setShowModal(true);
  };

  const handleConfirm = () => {
    toggleShaders(gameId);
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      <button
        className={`battery-mode-btn ${isBatterySaveMode ? "battery-mode-btn--active" : ""}`}
        onClick={handleClick}
        title={isBatterySaveMode ? "Шейдеры отключены (экономия батареи)" : "Включить режим экономии батареи"}
        aria-label="Режим экономии батареи"
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="battery-mode-btn__icon"
        >
          {/* Батарея */}
          <rect x="2" y="7" width="18" height="10" rx="2" ry="2" />
          <line x1="22" y1="11" x2="22" y2="13" />
          {/* Молния (когда режим экономии включён) */}
          {isBatterySaveMode && (
            <path d="M12 9L10 12H14L12 15" strokeWidth="1.5" />
          )}
          {/* Уровень заряда (когда шейдеры работают) */}
          {!isBatterySaveMode && (
            <rect x="4" y="9" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
          )}
        </svg>
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="battery-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          >
            <motion.div
              className="battery-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`battery-modal__icon ${isBatterySaveMode ? "battery-modal__icon--enable" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="18" height="10" rx="2" ry="2" />
                  <line x1="22" y1="11" x2="22" y2="13" />
                  {isBatterySaveMode ? (
                    <rect x="4" y="9" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
                  ) : (
                    <path d="M12 9L10 12H14L12 15" strokeWidth="1.5" />
                  )}
                </svg>
              </div>
              
              <h2 className="battery-modal__title">
                {isBatterySaveMode ? "Включить шейдеры?" : "Режим экономии батареи"}
              </h2>
              
              <p className="battery-modal__text">
                {isBatterySaveMode 
                  ? "Включение анимированных фонов (шейдеров) повысит энергопотребление на устройстве."
                  : "Эта функция отключит анимированные фоны (шейдеры) в этой игре, что повысит энергоэффективность на устройстве."
                }
              </p>
              
              <p className="battery-modal__note">
                Игровая логика останется без изменений — изменится только визуальное оформление.
              </p>

              <div className="battery-modal__buttons">
                <button 
                  className="battery-modal__btn battery-modal__btn--cancel"
                  onClick={handleCancel}
                >
                  Отмена
                </button>
                <button 
                  className={`battery-modal__btn ${isBatterySaveMode ? "battery-modal__btn--enable" : "battery-modal__btn--confirm"}`}
                  onClick={handleConfirm}
                >
                  {isBatterySaveMode ? "Включить" : "Отключить"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
