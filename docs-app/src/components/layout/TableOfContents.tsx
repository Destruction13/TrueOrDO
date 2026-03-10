/**
 * TableOfContents component
 * Extracts headings from Markdown content and builds a hierarchical TOC structure
 * Highlights current section on scroll
 */

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './TableOfContents.css';

export interface TOCItem {
  id: string;
  title: string;
  level: number;
  children?: TOCItem[];
}

interface TableOfContentsProps {
  content: string;
}

/**
 * Generate a slug from heading text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Extract headings from Markdown content
 */
function extractHeadings(content: string): TOCItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length; // Number of # characters
    const title = match[2].trim();
    const id = generateSlug(title);

    headings.push({
      id,
      title,
      level,
    });
  }

  return headings;
}

/**
 * Build hierarchical TOC structure from flat list of headings
 */
function buildHierarchy(headings: TOCItem[]): TOCItem[] {
  if (headings.length === 0) return [];

  const root: TOCItem[] = [];
  const stack: TOCItem[] = [];

  headings.forEach((heading) => {
    const item: TOCItem = { ...heading, children: [] };

    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level heading
      root.push(item);
    } else {
      // Child heading
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    }

    stack.push(item);
  });

  return root;
}

/**
 * TableOfContents component
 */
export function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const { translate } = useLanguage();

  // Extract and build TOC structure
  const tocItems = useMemo(() => {
    const headings = extractHeadings(content);
    return buildHierarchy(headings);
  }, [content]);

  // Track scroll position and highlight current section
  useEffect(() => {
    const handleScroll = () => {
      // Get all heading elements
      const headingElements = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
      
      if (headingElements.length === 0) return;

      // Find the current heading based on scroll position
      let currentId = '';
      const scrollPosition = window.scrollY + 100; // Offset for better UX

      headingElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;

        if (elementTop <= scrollPosition) {
          currentId = element.id;
        }
      });

      setActiveId(currentId);
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle click on TOC item
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Render TOC item recursively
  const renderTOCItem = (item: TOCItem) => {
    const isActive = activeId === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.id} className={`toc-item toc-level-${item.level}`}>
        <a
          href={`#${item.id}`}
          className={`toc-link ${isActive ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            handleClick(item.id);
          }}
        >
          {item.title}
        </a>
        {hasChildren && (
          <ul className="toc-list">
            {item.children!.map(renderTOCItem)}
          </ul>
        )}
      </li>
    );
  };

  // Don't render if no headings
  if (tocItems.length === 0) {
    return null;
  }

  return (
    <nav className="table-of-contents" aria-label="Table of contents">
      <h2 className="toc-title">{translate('misc.onThisPage')}</h2>
      <ul className="toc-list">
        {tocItems.map(renderTOCItem)}
      </ul>
    </nav>
  );
}
