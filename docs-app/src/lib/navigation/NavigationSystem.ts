import type { TOCItem } from '../../types';

/**
 * NavigationSystem - Manages navigation, breadcrumbs, TOC, and reading progress
 */
export class NavigationSystem {
  /**
   * Get current path from window location
   */
  getCurrentPath(): string {
    return window.location.pathname;
  }

  /**
   * Navigate to a path with optional smooth scroll to anchor
   */
  navigateTo(path: string, anchor?: string): void {
    // Use history API for navigation
    window.history.pushState({}, '', path);

    // Dispatch popstate event to trigger React Router
    window.dispatchEvent(new PopStateEvent('popstate'));

    // Scroll to anchor if provided
    if (anchor) {
      setTimeout(() => {
        const element = document.querySelector(anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Generate breadcrumbs from current path
   */
  getBreadcrumbs(): Array<{ label: string; path: string }> {
    const path = this.getCurrentPath();
    const segments = path.split('/').filter(Boolean);

    const breadcrumbs: Array<{ label: string; path: string }> = [
      { label: 'Home', path: '/' },
    ];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      breadcrumbs.push({
        label: this.formatSegmentLabel(segment),
        path: currentPath,
      });
    }

    return breadcrumbs;
  }

  /**
   * Format path segment into readable label
   */
  private formatSegmentLabel(segment: string): string {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract table of contents from markdown content
   */
  getTableOfContents(content: string): TOCItem[] {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: TOCItem[] = [];
    const stack: TOCItem[] = [];

    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = this.generateHeadingId(title);

      const item: TOCItem = {
        id,
        title,
        level,
        children: [],
      };

      // Find parent based on level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level heading
        headings.push(item);
      } else {
        // Nested heading
        const parent = stack[stack.length - 1];
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      }

      stack.push(item);
    }

    return headings;
  }

  /**
   * Generate ID from heading text (slug)
   */
  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Calculate reading progress based on scroll position
   */
  getReadingProgress(): number {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const scrollableHeight = docHeight - windowHeight;

    if (scrollableHeight <= 0) return 100;

    return Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
  }

  /**
   * Smooth scroll to top of page
   */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Smooth scroll to element by ID
   */
  scrollToElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Check if element is in viewport
   */
  isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Get active heading based on scroll position
   */
  getActiveHeading(headings: TOCItem[]): string | null {
    const scrollTop = window.scrollY + 100; // Offset for header

    // Flatten headings
    const flatHeadings = this.flattenHeadings(headings);

    // Find the last heading that is above the scroll position
    let activeId: string | null = null;

    for (const heading of flatHeadings) {
      const element = document.getElementById(heading.id);
      if (element && element.offsetTop <= scrollTop) {
        activeId = heading.id;
      }
    }

    return activeId;
  }

  /**
   * Flatten nested headings into a single array
   */
  private flattenHeadings(headings: TOCItem[]): TOCItem[] {
    const flat: TOCItem[] = [];

    const flatten = (items: TOCItem[]) => {
      for (const item of items) {
        flat.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    };

    flatten(headings);
    return flat;
  }
}

// Singleton instance
export const navigationSystem = new NavigationSystem();
