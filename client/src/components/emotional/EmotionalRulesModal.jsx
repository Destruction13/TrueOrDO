import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import "../ui/RulesModal.css";

/**
 * EmotionalRulesModal — модальное окно с правилами игры «Эмоциональный интеллект»
 * Использует общие стили RulesModal.css для консистентности.
 */
export default function EmotionalRulesModal({ isOpen, onClose }) {
  // Блокируем скролл body когда модалка открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="rules-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="rules-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="rules-modal__box"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rules-modal__header">
                <div className="rules-modal__title-wrapper">
                  <span className="rules-modal__icon">🧠</span>
                  <h2 className="rules-modal__title">Правила «Эмоциональный интеллект»</h2>
                </div>
                <button className="rules-modal__close" onClick={onClose}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="rules-modal__content">
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">1</span>
                    <h3 className="rules-section__title">Суть</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>
                      Ведущий получает <strong>секретную эмоцию</strong>. Всем игрокам показывается одно слово.
                      Каждый игрок выбирает эмоцию, с которой он бы ассоциировал это слово.
                    </p>
                    <p>
                      Задача — <strong>угадать эмоцию ведущего</strong>. Ведущий, в свою очередь, пытается понять,
                      как думают остальные.
                    </p>
                  </div>
                </section>

                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">2</span>
                    <h3 className="rules-section__title">Раунд</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Ведущий тянет эмоцию втайне от остальных</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Появляется слово (или фраза)</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Все выбирают эмоцию и выкладывают карту</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Открывается «стол», начинается голосование</span>
                      </li>
                    </ul>
                    <p className="rules-note">
                      Точная система очков и тонкости (таймер, пропуски, конец игры) будут расширены в следующих итерациях.
                    </p>
                  </div>
                </section>

                <section className="rules-section rules-section--chaos">
                  <div className="rules-section__header">
                    <span className="rules-section__number rules-section__number--chaos">⚠️</span>
                    <h3 className="rules-section__title">Важно</h3>
                  </div>
                  <div className="rules-section__body">
                    <p className="rules-warning">
                      Игра в разработке: на текущем этапе доступен каркас комнат и синхронизация, а полноценные правила и
                      механика будут добавляться по плану.
                    </p>
                  </div>
                </section>
              </div>

              <div className="rules-modal__footer">
                <button className="rules-modal__button" onClick={onClose}>
                  Понятно!
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
