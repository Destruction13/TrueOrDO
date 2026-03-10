import { useEffect, useState } from 'react';
import './ProgressBar.css';

/**
 * ProgressBar component that displays reading progress at the top of the page.
 * Shows how much of the page content the user has scrolled through.
 * 
 * Requirements: 3.8, 3.9
 */
export function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollableHeight = docHeight - windowHeight;

      if (scrollableHeight <= 0) {
        setProgress(100);
        return;
      }

      const scrollProgress = Math.min(100, (scrollTop / scrollableHeight) * 100);
      setProgress(scrollProgress);
    };

    // Calculate initial progress
    calculateProgress();

    // Update progress on scroll
    window.addEventListener('scroll', calculateProgress);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', calculateProgress);
    };
  }, []);

  return (
    <div className="progress-bar-container" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <div 
        className="progress-bar-fill" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
