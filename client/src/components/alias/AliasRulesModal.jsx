import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import "../ui/RulesModal.css";

/**
 * AliasRulesModal — модальное окно с правилами игры Alias
 * Использует стили от RulesModal для консистентности
 */
export default function AliasRulesModal({ isOpen, onClose }) {
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
                {/* Section 1: Суть игры */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">1</span>
                    <h3 className="rules-section__title">Суть игры</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>Объясняйте слова своей команде, не называя само слово и однокоренные.</p>
                    <p>За каждое угаданное слово — <strong>+1 очко</strong>. Побеждает команда, первой набравшая целевой счёт.</p>
                  </div>
                </section>

                {/* Section 2: Ход игры */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">2</span>
                    <h3 className="rules-section__title">Ход игры</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>Команды ходят по очереди. Объясняющий меняется каждый раунд.</p>
                    <p>После раунда игроки проверяют результаты и могут исправить ошибки в подсчёте.</p>
                  </div>
                </section>

                {/* Section 3: Запреты */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">3</span>
                    <h3 className="rules-section__title">Запрещено</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span><strong>Однокоренные</strong> — «бегун» = пробежка + человек</span>
                      </li>
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span><strong>Созвучные</strong> — «лодка» = водка, но на ней плавают</span>
                      </li>
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span><strong>Переводы</strong> — «собака» = dog на русском</span>
                      </li>
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span><strong>Буквы/слоги</strong> — «аффирмация» = заканчивается на «ция»</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 4: Разрешено */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">4</span>
                    <h3 className="rules-section__title">Разрешено</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span><strong>Синонимы/антонимы</strong> — «шум и...» для «гам»</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span><strong>Описания</strong> — «детёныш лошади» для «жеребёнок»</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span><strong>Рифмы</strong> — «против лома нет...» для «приём»</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 5: Подсчёт очков */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">5</span>
                    <h3 className="rules-section__title">Подсчёт очков</h3>
                  </div>
                  <div className="rules-section__body">
                    <div className="rules-votes">
                      <span className="rules-vote rules-vote--approve">Угадано +1</span>
                      <span className="rules-vote rules-vote--report">Пропуск −1/0</span>
                    </div>
                    <p className="rules-note">Штраф за пропуск настраивается в параметрах. Правила можно согласовать до игры.</p>
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
