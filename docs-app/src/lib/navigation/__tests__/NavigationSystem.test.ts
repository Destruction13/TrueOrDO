import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationSystem } from '../NavigationSystem';

describe('NavigationSystem', () => {
  let navigationSystem: NavigationSystem;

  beforeEach(() => {
    navigationSystem = new NavigationSystem();
    // Reset window location
    window.history.pushState({}, '', '/');
  });

  describe('getCurrentPath', () => {
    it('should return current pathname', () => {
      window.history.pushState({}, '', '/technical/auth');
      const path = navigationSystem.getCurrentPath();
      expect(path).toBe('/technical/auth');
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return home breadcrumb for root path', () => {
      window.history.pushState({}, '', '/');
      const breadcrumbs = navigationSystem.getBreadcrumbs();

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({ label: 'Home', path: '/' });
    });

    it('should generate breadcrumbs for nested path', () => {
      window.history.pushState({}, '', '/technical/auth');
      const breadcrumbs = navigationSystem.getBreadcrumbs();

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({ label: 'Home', path: '/' });
      expect(breadcrumbs[1]).toEqual({ label: 'Technical', path: '/technical' });
      expect(breadcrumbs[2]).toEqual({ label: 'Auth', path: '/technical/auth' });
    });

    it('should format hyphenated segments', () => {
      window.history.pushState({}, '', '/technical/auth-guide');
      const breadcrumbs = navigationSystem.getBreadcrumbs();

      expect(breadcrumbs[2].label).toBe('Auth Guide');
    });
  });

  describe('getTableOfContents', () => {
    it('should extract headings from markdown', () => {
      const markdown = `
# Introduction
Some content here.

## Getting Started
More content.

### Installation
Details about installation.

## Configuration
Configuration details.
      `;

      const toc = navigationSystem.getTableOfContents(markdown);

      expect(toc).toHaveLength(1); // One h1
      expect(toc[0].title).toBe('Introduction');
      expect(toc[0].level).toBe(1);
      expect(toc[0].children).toHaveLength(2); // Two h2s
    });

    it('should generate IDs for headings', () => {
      const markdown = '# Getting Started\n## Installation Guide';
      const toc = navigationSystem.getTableOfContents(markdown);

      expect(toc[0].id).toBe('getting-started');
      expect(toc[0].children?.[0].id).toBe('installation-guide');
    });

    it('should handle empty content', () => {
      const toc = navigationSystem.getTableOfContents('');
      expect(toc).toEqual([]);
    });

    it('should handle content without headings', () => {
      const markdown = 'Just some regular text without any headings.';
      const toc = navigationSystem.getTableOfContents(markdown);
      expect(toc).toEqual([]);
    });

    it('should handle nested headings correctly', () => {
      const markdown = `
# Level 1
## Level 2
### Level 3
#### Level 4
## Another Level 2
      `;

      const toc = navigationSystem.getTableOfContents(markdown);

      expect(toc).toHaveLength(1);
      expect(toc[0].children).toHaveLength(2);
      expect(toc[0].children?.[0].children).toHaveLength(1);
    });
  });

  describe('getReadingProgress', () => {
    it('should return 0 when at top of page', () => {
      // Mock scroll position
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const progress = navigationSystem.getReadingProgress();
      expect(progress).toBe(0);
    });

    it('should return 100 when at bottom of page', () => {
      Object.defineProperty(window, 'scrollY', { value: 1200, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const progress = navigationSystem.getReadingProgress();
      expect(progress).toBe(100);
    });

    it('should return 50 when halfway through page', () => {
      Object.defineProperty(window, 'scrollY', { value: 600, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const progress = navigationSystem.getReadingProgress();
      expect(progress).toBe(50);
    });

    it('should return 100 for short pages', () => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 500, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const progress = navigationSystem.getReadingProgress();
      expect(progress).toBe(100);
    });
  });

  describe('scrollToTop', () => {
    it('should call window.scrollTo with smooth behavior', () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo');
      navigationSystem.scrollToTop();

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });
  });

  describe('scrollToElement', () => {
    it('should scroll to element if it exists', () => {
      const element = document.createElement('div');
      element.id = 'test-element';
      const scrollIntoViewSpy = vi.fn();
      element.scrollIntoView = scrollIntoViewSpy;
      document.body.appendChild(element);

      navigationSystem.scrollToElement('test-element');

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });

      document.body.removeChild(element);
    });

    it('should not throw if element does not exist', () => {
      expect(() => {
        navigationSystem.scrollToElement('nonexistent');
      }).not.toThrow();
    });
  });

  describe('getActiveHeading', () => {
    it('should return null when no headings', () => {
      const activeId = navigationSystem.getActiveHeading([]);
      expect(activeId).toBeNull();
    });

    it('should return the active heading based on scroll position', () => {
      // Create mock elements
      const heading1 = document.createElement('h2');
      heading1.id = 'heading-1';
      Object.defineProperty(heading1, 'offsetTop', { value: 100 });
      document.body.appendChild(heading1);

      const heading2 = document.createElement('h2');
      heading2.id = 'heading-2';
      Object.defineProperty(heading2, 'offsetTop', { value: 500 });
      document.body.appendChild(heading2);

      Object.defineProperty(window, 'scrollY', { value: 300, writable: true });

      const toc = [
        { id: 'heading-1', title: 'Heading 1', level: 2 },
        { id: 'heading-2', title: 'Heading 2', level: 2 },
      ];

      const activeId = navigationSystem.getActiveHeading(toc);
      expect(activeId).toBe('heading-1');

      document.body.removeChild(heading1);
      document.body.removeChild(heading2);
    });
  });
});
