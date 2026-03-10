/**
 * GuidesPage component
 * Main page for Guides section with guide navigation
 */

import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '../../components/layout';
import { useLanguage } from '../../contexts/LanguageContext';
import './GuidesPage.css';

interface GuideSection {
  id: string;
  titleKey: string;
  path: string;
  icon: string;
  descriptionKey: string;
}

const guideSections: GuideSection[] = [
  { 
    id: 'start-here', 
    titleKey: 'guide.startHere.title', 
    path: '/guides/start-here', 
    icon: '🚀',
    descriptionKey: 'guide.startHere.description'
  },
  { 
    id: 'instruction', 
    titleKey: 'guide.instruction.title', 
    path: '/guides/instruction', 
    icon: '📖',
    descriptionKey: 'guide.instruction.description'
  },
  { 
    id: 'docs-guide', 
    titleKey: 'guide.docsGuide.title', 
    path: '/guides/docs-guide', 
    icon: '📚',
    descriptionKey: 'guide.docsGuide.description'
  },
  { 
    id: 'mcp-setup', 
    titleKey: 'guide.mcpSetup.title', 
    path: '/guides/mcp-setup', 
    icon: '⚙️',
    descriptionKey: 'guide.mcpSetup.description'
  },
  { 
    id: 'update-plan', 
    titleKey: 'guide.updatePlan.title', 
    path: '/guides/update-plan', 
    icon: '📋',
    descriptionKey: 'guide.updatePlan.description'
  },
  { 
    id: 'final-tasks', 
    titleKey: 'guide.finalTasks.title', 
    path: '/guides/final-tasks', 
    icon: '✅',
    descriptionKey: 'guide.finalTasks.description'
  },
];

export const GuidesPage: React.FC = () => {
  const location = useLocation();
  const { translate } = useLanguage();
  const isRootPath = location.pathname === '/guides' || location.pathname === '/guides/';

  return (
    <div className="guides-page">
      <div className="guides-sidebar">
        <div className="guides-sidebar-header">
          <h2>{translate('nav.guides')}</h2>
        </div>
        <nav className="guides-nav">
          {guideSections.map((section) => (
            <Link
              key={section.id}
              to={section.path}
              className={`guides-nav-item ${location.pathname === section.path ? 'active' : ''}`}
            >
              <span className="guides-nav-icon">{section.icon}</span>
              <span className="guides-nav-label">{translate(section.titleKey)}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="guides-content">
        <Breadcrumbs />
        {isRootPath ? (
          <div className="guides-hub">
            <div className="guides-hub-header">
              <h1>{translate('section.guides.hub.title')}</h1>
              <p className="guides-hub-description">
                {translate('section.guides.hub.description')}
              </p>
            </div>
            <div className="guides-hub-grid">
              {guideSections.map((section) => (
                <Link
                  key={section.id}
                  to={section.path}
                  className="guides-hub-card"
                >
                  <div className="guides-hub-card-icon">{section.icon}</div>
                  <h3 className="guides-hub-card-title">{translate(section.titleKey)}</h3>
                  <p className="guides-hub-card-description">{translate(section.descriptionKey)}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
};
