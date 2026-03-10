/**
 * useKeyboardNavigation Hook
 * 
 * Provides comprehensive keyboard navigation support for the application
 * Ensures all interactive elements are keyboard accessible
 * 
 * Validates: Requirements 19.1, 19.2, 19.4, 19.5, 19.6
 */

import { useEffect, useCallback } from 'react';

interface KeyboardNavigationOptions {
  /**
   * Enable Tab key navigation
   */
  enableTab?: boolean;

  /**
   * Enable Arrow key navigation
   */
  enableArrows?: boolean;

  /**
   * Enable Enter/Space for activation
   */
  enableActivation?: boolean;

  /**
   * Enable Escape key for closing/canceling
   */
  enableEscape?: boolean;

  /**
   * Custom key handlers
   */
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

/**
 * Hook for managing keyboard navigation
 * Provides accessible keyboard controls for interactive elements
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enableTab: _enableTab = true,
    enableArrows = true,
    enableActivation = true,
    enableEscape = true,
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle Escape key
      if (enableEscape && event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Handle Enter key
      if (enableActivation && event.key === 'Enter' && onEnter) {
        event.preventDefault();
        onEnter();
        return;
      }

      // Handle Arrow keys
      if (enableArrows) {
        switch (event.key) {
          case 'ArrowUp':
            if (onArrowUp) {
              event.preventDefault();
              onArrowUp();
            }
            break;
          case 'ArrowDown':
            if (onArrowDown) {
              event.preventDefault();
              onArrowDown();
            }
            break;
          case 'ArrowLeft':
            if (onArrowLeft) {
              event.preventDefault();
              onArrowLeft();
            }
            break;
          case 'ArrowRight':
            if (onArrowRight) {
              event.preventDefault();
              onArrowRight();
            }
            break;
        }
      }
    },
    [
      enableEscape,
      enableActivation,
      enableArrows,
      onEscape,
      onEnter,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    /**
     * Props to spread on focusable elements
     */
    keyboardProps: {
      tabIndex: 0,
      onKeyDown: (e: React.KeyboardEvent) => {
        handleKeyDown(e.nativeEvent);
      },
    },
  };
}

/**
 * Hook for managing focus indicators
 * Ensures visible focus indicators for keyboard navigation
 */
export function useFocusIndicator() {
  useEffect(() => {
    // Add focus-visible class to body when keyboard navigation is detected
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

/**
 * Hook for trapping focus within a container (e.g., modals)
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap activates
    firstElement?.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}
