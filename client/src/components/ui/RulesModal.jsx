import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import "./RulesModal.css";

/**
 * RulesModal — модальное окно с правилами игры
 */
export default function RulesModal({ isOpen, onClose }) {
  // Блокируем скролл body когда модалка открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="rules-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal container - центрирует контент */}
          <motion.div
            className="rules-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* Modal box - сама карточка */}
            <motion.div
              className="rules-modal__box"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="rules-modal__header">
              <div className="rules-modal__title-wrapper">
                <span className="rules-modal__icon">📖</span>
                <h2 className="rules-modal__title">Правила игры</h2>
              </div>
              <button className="rules-modal__close" onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="rules-modal__content">
              {/* Section 1 */}
              <section className="rules-section">
                <div className="rules-section__header">
                  <span className="rules-section__number">1</span>
                  <h3 className="rules-section__title">Очерёдность</h3>
                </div>
                <div className="rules-section__body">
                  <p>Игроки ходят по очереди.</p>
                  <p><strong>Ход</strong> — это выбор цели. Выбрать можно любого игрока, кроме себя.</p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="rules-section">
                <div className="rules-section__header">
                  <span className="rules-section__number">2</span>
                  <h3 className="rules-section__title">Правда или Действие</h3>
                </div>
                <div className="rules-section__body">
                  <p>Нельзя выбирать одну и ту же опцию <strong>больше двух раз подряд</strong>.</p>
                  <p>После двух одинаковых выборов — принудительно назначается альтернатива.</p>
                  <p className="rules-note">Счётчик индивидуальный и сбрасывается после смены варианта.</p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="rules-section">
                <div className="rules-section__header">
                  <span className="rules-section__number">3</span>
                  <h3 className="rules-section__title">Принятие задания</h3>
                </div>
                <div className="rules-section__body">
                  <p>После получения задания его можно:</p>
                  <ul className="rules-list">
                    <li className="rules-list__item rules-list__item--accept">
                      <span className="rules-list__icon">✓</span>
                      <span><strong>Принять</strong> — запускается таймер на выполнение</span>
                    </li>
                    <li className="rules-list__item rules-list__item--decline">
                      <span className="rules-list__icon">✗</span>
                      <span><strong>Отклонить</strong> — автоматический репорт</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section className="rules-section">
                <div className="rules-section__header">
                  <span className="rules-section__number">4</span>
                  <h3 className="rules-section__title">Голосование</h3>
                </div>
                <div className="rules-section__body">
                  <p>После выполнения задания все игроки, <strong>кроме выполнявшего</strong>, голосуют:</p>
                  <div className="rules-votes">
                    <span className="rules-vote rules-vote--approve">Засчитано</span>
                    <span className="rules-vote rules-vote--report">Репорт</span>
                  </div>
                  <p className="rules-note">Решение принимается простым большинством голосов.</p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="rules-section">
                <div className="rules-section__header">
                  <span className="rules-section__number">5</span>
                  <h3 className="rules-section__title">Репорты и наказания</h3>
                </div>
                <div className="rules-section__body">
                  <p>Репорты накапливаются за игру:</p>
                  <div className="rules-reports">
                    <div className="rules-report">
                      <span className="rules-report__count">1</span>
                      <span className="rules-report__text">Предупреждение</span>
                    </div>
                    <div className="rules-report rules-report--warning">
                      <span className="rules-report__count">2</span>
                      <span className="rules-report__text">Негативный статус</span>
                    </div>
                    <div className="rules-report rules-report--chaos">
                      <span className="rules-report__count">3</span>
                      <span className="rules-report__text">Режим Хаос</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section className="rules-section rules-section--chaos">
                <div className="rules-section__header">
                  <span className="rules-section__number rules-section__number--chaos">🔥</span>
                  <h3 className="rules-section__title">Режим Хаос</h3>
                </div>
                <div className="rules-section__body">
                  <p>В режиме Хаос игра становится <strong>значительно сложнее</strong>:</p>
                  <ul className="rules-list rules-list--chaos">
                    <li>Выбор «Правда» или «Действие» делается <strong>автоматически</strong></li>
                    <li>Ограничения по счётчикам <strong>не применяются</strong></li>
                    <li>Появляются <strong>особые хаос-задания</strong> — более провокационные и сложные</li>
                    <li>Вопросы правды становятся <strong>глубже и острее</strong></li>
                  </ul>
                  <p className="rules-warning">
                    ⚠️ Хаос — это наказание за отказы. Играйте честно, чтобы избежать его!
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
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
