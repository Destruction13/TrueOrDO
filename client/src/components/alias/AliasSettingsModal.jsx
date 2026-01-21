import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import "./AliasSettingsModal.css";

export default function AliasSettingsModal({ isOpen, onClose, settings, onSave, isHost }) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleSave = async () => {
    await onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="alias-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="alias-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="alias-modal__header">
            <h2>Настройки игры</h2>
            <button className="alias-modal__close" onClick={onClose}>×</button>
          </div>

          <div className="alias-modal__body">
            {/* Difficulty */}
            <div className="alias-setting">
              <label className="alias-setting__label">Сложность слов</label>
              <div className="alias-setting__options">
                {[
                  { value: "easy", label: "Лёгкий", desc: "Простые слова" },
                  { value: "normal", label: "Средний", desc: "Стандартная игра" },
                  { value: "hard", label: "Сложный", desc: "Для экспертов" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    className={`alias-setting__option ${localSettings.difficulty === opt.value ? "active" : ""}`}
                    onClick={() => isHost && setLocalSettings(s => ({ ...s, difficulty: opt.value }))}
                    disabled={!isHost}
                  >
                    <span className="alias-setting__option-label">{opt.label}</span>
                    <span className="alias-setting__option-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Turn time */}
            <div className="alias-setting">
              <label className="alias-setting__label">
                Время хода: <strong>{localSettings.turnSeconds} сек</strong>
              </label>
              <input
                type="range"
                min="30"
                max="180"
                step="10"
                value={localSettings.turnSeconds}
                onChange={(e) => isHost && setLocalSettings(s => ({ ...s, turnSeconds: +e.target.value }))}
                disabled={!isHost}
                className="alias-setting__range"
              />
              <div className="alias-setting__range-labels">
                <span>30 сек</span>
                <span>180 сек</span>
              </div>
            </div>

            {/* Target score */}
            <div className="alias-setting">
              <label className="alias-setting__label">
                Играем до: <strong>{localSettings.targetScore} очков</strong>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={localSettings.targetScore}
                onChange={(e) => isHost && setLocalSettings(s => ({ ...s, targetScore: +e.target.value }))}
                disabled={!isHost}
                className="alias-setting__range"
              />
              <div className="alias-setting__range-labels">
                <span>10</span>
                <span>100</span>
              </div>
            </div>

            {/* Skip penalty */}
            <div className="alias-setting">
              <label className="alias-setting__label">Штраф за пропуск</label>
              <div className="alias-setting__toggle">
                <button
                  className={`alias-setting__toggle-btn ${localSettings.skipPenalty === 0 ? "active" : ""}`}
                  onClick={() => isHost && setLocalSettings(s => ({ ...s, skipPenalty: 0 }))}
                  disabled={!isHost}
                >
                  Без штрафа
                </button>
                <button
                  className={`alias-setting__toggle-btn ${localSettings.skipPenalty === -1 ? "active" : ""}`}
                  onClick={() => isHost && setLocalSettings(s => ({ ...s, skipPenalty: -1 }))}
                  disabled={!isHost}
                >
                  -1 очко
                </button>
              </div>
            </div>
          </div>

          <div className="alias-modal__footer">
            {isHost ? (
              <>
                <Button variant="ghost" onClick={onClose}>Отмена</Button>
                <Button variant="primary" onClick={handleSave}>Сохранить</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={onClose}>Закрыть</Button>
            )}
          </div>

          {!isHost && (
            <div className="alias-modal__readonly">
              Только ведущий может изменять настройки
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
