/**
 * ResponsiveLayout Component
 * 
 * Provides responsive layout for desktop viewports (1280px+)
 * Shows sidebar on screens wider than 1280px
 * Shows TOC on screens wider than 1440px
 * Displays warning message for narrow viewports
 * 
 * Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sidebar } from './Sidebar';
import { TableOfContents } from './TableOfContents';
import './ResponsiveLayout.css';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showTOC?: boolean;
  tocContent?: string;
}

/**
 * ResponsiveLayout component
 * Handles responsive layout with sidebar and TOC based on viewport width
 */
export function ResponsiveLayout({
  children,
  showSidebar = true,
  showTOC = true,
  tocContent = '',
}: ResponsiveLayoutProps) {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const { translate } = useLanguage();

  // Track viewport width
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if viewport is too narrow
  const isTooNarrow = viewportWidth < 1280;
  const shouldShowSidebar = showSidebar && viewportWidth >= 1280;
  const shouldShowTOC = showTOC && viewportWidth >= 1440 && tocContent.length > 0;

  return (
    <>
      {/* Viewport warning for narrow screens */}
      {isTooNarrow && (
        <div className="viewport-warning">
          <div className="viewport-warning-content">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="viewport-warning-icon"
            >
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p>{translate('misc.viewportTooSmall')}</p>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className={`responsive-layout ${isTooNarrow ? 'narrow-viewport' : ''}`}>
        {/* Sidebar - shown on screens wider than 1280px */}
        {shouldShowSidebar && (
          <aside className="responsive-layout-sidebar">
            <Sidebar />
          </aside>
        )}

        {/* Main content */}
        <main className="responsive-layout-main">
          {children}
        </main>

        {/* Table of Contents - shown on screens wider than 1440px */}
        {shouldShowTOC && (
          <aside className="responsive-layout-toc">
            <TableOfContents content={tocContent} />
          </aside>
        )}
      </div>
    </>
  );
}
