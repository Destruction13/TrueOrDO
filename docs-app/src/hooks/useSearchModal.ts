import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to manage search modal state and keyboard shortcuts
 */
export function useSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNavigate = useCallback(
    (path: string, anchor?: string) => {
      navigate(path);

      // Scroll to anchor after navigation
      if (anchor) {
        setTimeout(() => {
          const element = document.querySelector(anchor);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    },
    [navigate]
  );

  return {
    isOpen,
    openSearch,
    closeSearch,
    handleNavigate,
  };
}
