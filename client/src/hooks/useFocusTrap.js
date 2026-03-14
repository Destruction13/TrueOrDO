import { useEffect } from 'react';

/**
 * Hook для реализации focus trap в модальных окнах
 * Предотвращает выход фокуса за пределы контейнера при навигации Tab/Shift+Tab
 * 
 * @param {React.RefObject} containerRef - Ref на контейнер модального окна
 * @param {boolean} isActive - Активен ли focus trap
 */
export default function useFocusTrap(containerRef, isActive) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Получаем все focusable элементы внутри контейнера
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');

      return Array.from(container.querySelectorAll(focusableSelectors));
    };

    const handleKeyDown = (e) => {
      // Обрабатываем только Tab
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab на первом элементе -> переход на последний
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab на последнем элементе -> переход на первый
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}
