import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import "./EmotionalSettingsModal.css";

export default function EmotionalSettingsModal({ isOpen, onClose, settings, onSave, onNewGame, isHost }) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleSave = async () => {
    await onSave?.(localSettings);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="emotional-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="emotional-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="emotional-modal__header">
            <h2>Настройки комнаты</h2>
            <button className="emotional-modal__close" onClick={onClose} type="button">
              ×
            </button>
          </div>

          <div className="emotional-modal__body">
            <div className="emotional-setting">
              <label className="emotional-setting__label">
                Играем до: <strong>{localSettings?.targetScore ?? 15} очков</strong>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={localSettings?.targetScore ?? 15}
                onChange={(e) =>
                  isHost &&
                  setLocalSettings((s) => ({
                    ...(s || {}),
                    targetScore: +e.target.value,
                  }))
                }
                disabled={!isHost}
                className="emotional-setting__range"
              />
              <div className="emotional-setting__range-labels">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            <div className="emotional-setting">
              <label className="emotional-setting__label">Разрешить пропуск хода</label>
              <div className="emotional-setting__toggle">
                <button
                  type="button"
                  className={`emotional-setting__toggle-btn ${localSettings?.allowSkip ? "active" : ""}`}
                  onClick={() => isHost && setLocalSettings((s) => ({ ...(s || {}), allowSkip: true }))}
                  disabled={!isHost}
                >
                  Да
                </button>
                <button
                  type="button"
                  className={`emotional-setting__toggle-btn ${localSettings?.allowSkip === false ? "active" : ""}`}
                  onClick={() => isHost && setLocalSettings((s) => ({ ...(s || {}), allowSkip: false }))}
                  disabled={!isHost}
                >
                  Нет
                </button>
              </div>
            </div>

            {isHost ? (
              <div className="emotional-setting">
                <button
                  className="emotional-setting__danger"
                  type="button"
                  onClick={async () => {
                    await onNewGame?.();
                    onClose?.();
                  }}
                >
                  Новая игра (сбросить)
                </button>
              </div>
            ) : null}
          </div>

          <div className="emotional-modal__footer">
            {isHost ? (
              <>
                <Button variant="ghost" onClick={onClose}>
                  Отмена
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Сохранить
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={onClose}>
                Закрыть
              </Button>
            )}
          </div>

          {!isHost ? (
            <div className="emotional-modal__readonly">Только хост может менять настройки</div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
