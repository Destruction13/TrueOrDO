/**
 * Smooth Scroll Utilities
 * Provides smooth scrolling behavior for anchor links and navigation
 */

export interface SmoothScrollOptions {
  duration?: number;
  offset?: number;
  easing?: (t: number) => number;
}

/**
 * Easing function for smooth animation
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smooth scroll to a target element
 */
export function smoothScrollTo(
  target: HTMLElement | string,
  options: SmoothScrollOptions = {}
): void {
  const { duration = 800, offset = 0, easing = easeInOutCubic } = options;

  // Get target element
  const element =
    typeof target === 'string' ? document.querySelector(target) : target;

  if (!element) {
    console.warn('Smooth scroll target not found:', target);
    return;
  }

  // Calculate target position
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    window.scrollTo(0, startPosition + distance * easedProgress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Smooth scroll to top of page
 */
export function smoothScrollToTop(options: SmoothScrollOptions = {}): void {
  const { duration = 800, easing = easeInOutCubic } = options;

  const startPosition = window.pageYOffset;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    window.scrollTo(0, startPosition * (1 - easedProgress));

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Enable smooth scroll behavior for anchor links
 */
export function enableSmoothScrollForAnchors(options: SmoothScrollOptions = {}): () => void {
  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a[href^="#"]');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    event.preventDefault();
    smoothScrollTo(href, options);

    // Update URL without jumping
    if (history.pushState) {
      history.pushState(null, '', href);
    }
  }

  document.addEventListener('click', handleClick);

  return () => {
    document.removeEventListener('click', handleClick);
  };
}
