import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  beforeEach(() => {
    // Reset scroll position
    window.scrollY = 0;
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render progress bar container', () => {
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should have correct ARIA attributes', () => {
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuenow');
  });

  it('should show 0% progress at top of page', () => {
    window.scrollY = 0;
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('should show 100% progress when scrolled to bottom', () => {
    // Scroll to bottom: scrollY = scrollHeight - innerHeight
    window.scrollY = 1200; // 2000 - 800 = 1200
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should show 50% progress when scrolled halfway', () => {
    // Halfway: scrollY = (scrollHeight - innerHeight) / 2
    window.scrollY = 600; // 1200 / 2 = 600
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should update progress on scroll', () => {
    const { rerender } = render(<ProgressBar />);
    
    // Initial state
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    
    // Simulate scroll
    window.scrollY = 600;
    window.dispatchEvent(new Event('scroll'));
    
    rerender(<ProgressBar />);
    progressBar = screen.getByRole('progressbar');
    
    // Progress should update (approximately 50%)
    const progress = parseInt(progressBar.getAttribute('aria-valuenow') || '0');
    expect(progress).toBeGreaterThan(40);
    expect(progress).toBeLessThan(60);
  });

  it('should handle pages with no scrollable content', () => {
    // Page height equals viewport height
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
    
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should not exceed 100% progress', () => {
    // Scroll beyond bottom (edge case)
    window.scrollY = 2000;
    render(<ProgressBar />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should render progress bar fill with correct width', () => {
    window.scrollY = 600; // 50% progress
    const { container } = render(<ProgressBar />);
    
    const fill = container.querySelector('.progress-bar-fill');
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '50%' });
  });

  it('should clean up scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<ProgressBar />);
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
