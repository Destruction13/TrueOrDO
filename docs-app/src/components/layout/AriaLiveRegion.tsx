/**
 * AriaLiveRegion Component
 * 
 * Provides ARIA live regions for screen reader announcements
 * Announces dynamic content changes for accessibility
 * 
 * Validates: Requirements 19.3
 */

import { useEffect, useState } from 'react';
import './AriaLiveRegion.css';

type PolitenessLevel = 'polite' | 'assertive' | 'off';

interface AriaLiveRegionProps {
  /**
   * Politeness level for announcements
   * - polite: Wait for current speech to finish
   * - assertive: Interrupt current speech
   * - off: No announcements
   */
  politeness?: PolitenessLevel;

  /**
   * Message to announce
   */
  message?: string;

  /**
   * Clear message after announcement
   */
  clearAfter?: number;
}

/**
 * AriaLiveRegion component
 * Provides accessible announcements for screen readers
 */
export function AriaLiveRegion({
  politeness = 'polite',
  message = '',
  clearAfter = 3000,
}: AriaLiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);

      // Clear message after specified time
      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setCurrentMessage('');
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      className="aria-live-region"
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {currentMessage}
    </div>
  );
}

/**
 * Hook for managing ARIA live announcements
 */
export function useAriaLive() {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<PolitenessLevel>('polite');

  /**
   * Announce a message to screen readers
   */
  const announce = (text: string, level: PolitenessLevel = 'polite') => {
    setMessage(text);
    setPoliteness(level);
  };

  /**
   * Announce politely (wait for current speech)
   */
  const announcePolite = (text: string) => {
    announce(text, 'polite');
  };

  /**
   * Announce assertively (interrupt current speech)
   */
  const announceAssertive = (text: string) => {
    announce(text, 'assertive');
  };

  /**
   * Clear current announcement
   */
  const clear = () => {
    setMessage('');
  };

  return {
    message,
    politeness,
    announce,
    announcePolite,
    announceAssertive,
    clear,
    AriaLiveRegion: () => (
      <AriaLiveRegion message={message} politeness={politeness} />
    ),
  };
}
