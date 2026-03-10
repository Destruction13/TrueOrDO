import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScrollToTop } from '../ScrollToTop';
import * as smoothScrollModule from '../../../lib/animation/smooth-scroll';

// Mock smooth scroll utility
vi.mock('../../../lib/animation/smooth-scroll', () => ({
  smoothScrollToTop: vi.fn(),
}));

// Mock Framer Motion to avoid context issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ScrollToTop', () => {
  beforeEach(() => {
    // Mock window.scrollTo
    window.scrollTo = vi.fn();
    
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render button when at top of page', () => {
    render(<ScrollToTop />);
    
    const button = screen.queryByRole('button', { name: /scroll to top/i });
    expect(button).not.toBeInTheDocument();
  });

  it('should render button when scrolled down more than 300px', async () => {
    render(<ScrollToTop />);
    
    // Simulate scroll
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 400
    });
    
    fireEvent.scroll(window);
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /scroll to top/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('should hide button when scrolled back to top', async () => {
    render(<ScrollToTop />);
    
    // Scroll down
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 400
    });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();
    });
    
    // Scroll back to top
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0
    });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /scroll to top/i })).not.toBeInTheDocument();
    });
  });

  it('should scroll to top with smooth behavior when clicked', async () => {
    render(<ScrollToTop />);
    
    // Scroll down to show button
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 500
    });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();
    });
    
    const button = screen.getByRole('button', { name: /scroll to top/i });
    fireEvent.click(button);
    
    expect(smoothScrollModule.smoothScrollToTop).toHaveBeenCalledWith({ duration: 600 });
  });

  it('should have proper accessibility attributes', async () => {
    render(<ScrollToTop />);
    
    // Scroll down to show button
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 400
    });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /scroll to top/i });
      expect(button).toHaveAttribute('aria-label', 'Scroll to top');
      expect(button).toHaveAttribute('title', 'Scroll to top');
    });
  });

  it('should show button at exactly 301px scroll', async () => {
    render(<ScrollToTop />);
    
    // Scroll to just above threshold
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 300
    });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /scroll to top/i })).not.toBeInTheDocument();
    });
    
    // Scroll to just above threshold
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 301
    });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();
    });
  });

  it('should cleanup scroll event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<ScrollToTop />);
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
