/**
 * TechnicalPage component
 * Main page for Technical documentation section with subsection navigation
 */

import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '../../components/layout';
import { useLanguage } from '../../contexts/LanguageContext';
import './TechnicalPage.css';

interface TechnicalSection {
  id: string;
  titleKey: string;
  path: string;
  icon: string;
}

const technicalSections: TechnicalSection[] = [
  { id: 'auth', titleKey: 'technical.auth.title', path: '/technical/auth', icon: '🔐' },
  { id: 'client', titleKey: 'technical.client.title', path: '/technical/client', icon: '💻' },
  { id: 'server', titleKey: 'technical.server.title', path: '/technical/server', icon: '🖥️' },
  { id: 'database', titleKey: 'technical.database.title', path: '/technical/database', icon: '🗄️' },
  { id: 'games', titleKey: 'technical.games.title', path: '/technical/games', icon: '🎮' },
  { id: 'social', titleKey: 'technical.social.title', path: '/technical/social', icon: '👥' },
  { id: 'stats', titleKey: 'technical.stats.title', path: '/technical/stats', icon: '📊' },
  { id: 'subscription', titleKey: 'technical.subscription.title', path: '/technical/subscription', icon: '💳' },
  { id: 'deploy', titleKey: 'technical.deploy.title', path: '/technical/deploy', icon: '🚀' },
  { id: 'design', titleKey: 'technical.design.title', path: '/technical/design', icon: '🎨' },
];

export const TechnicalPage: React.FC = () => {
  const location = useLocation();
  const { translate } = useLanguage();
  const isRootPath = location.pathname === '/technical' || location.pathname === '/technical/';

  return (
    <div className="technical-page">
      <div className="technical-sidebar">
        <div className="technical-sidebar-header">
          <h2>{translate('nav.technical')}</h2>
        </div>
        <nav className="technical-nav">
          {technicalSections.map((section) => (
            <Link
              key={section.id}
              to={section.path}
              className={`technical-nav-item ${location.pathname === section.path ? 'active' : ''}`}
            >
              <span className="technical-nav-icon">{section.icon}</span>
              <span className="technical-nav-label">{translate(section.titleKey)}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="technical-content">
        <Breadcrumbs />
        {isRootPath ? (
          <div className="technical-hub">
            <div className="technical-hub-header">
              <h1>{translate('section.technical.hub.title')}</h1>
              <p className="technical-hub-description">
                {translate('section.technical.hub.description')}
              </p>
            </div>
            <div className="technical-hub-grid">
              {technicalSections.map((section) => (
                <Link
                  key={section.id}
                  to={section.path}
                  className="technical-hub-card"
                >
                  <div className="technical-hub-card-icon">{section.icon}</div>
                  <h3 className="technical-hub-card-title">{translate(section.titleKey)}</h3>
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
