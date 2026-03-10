import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import './Breadcrumbs.css';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  const { translate } = useLanguage();
  
  // Don't show breadcrumbs on Hub page
  if (location.pathname === '/') {
    return null;
  }
  
  const breadcrumbs = generateBreadcrumbs(location.pathname, translate);
  
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="breadcrumb-item">
            {index < breadcrumbs.length - 1 ? (
              <>
                <Link to={crumb.path} className="breadcrumb-link">
                  {crumb.label}
                </Link>
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              </>
            ) : (
              <span className="breadcrumb-current" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function generateBreadcrumbs(pathname: string, translate: (key: string) => string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: translate('breadcrumb.home'), path: '/' }
  ];
  
  // Split path and filter empty segments
  const segments = pathname.split('/').filter(Boolean);
  
  // Build breadcrumbs from path segments
  let currentPath = '';
  
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = formatSegmentLabel(segment, translate);
    breadcrumbs.push({ label, path: currentPath });
  }
  
  return breadcrumbs;
}

function formatSegmentLabel(segment: string, translate: (key: string) => string): string {
  // Map of known segments to their translation keys
  const keyMap: Record<string, string> = {
    'api': 'breadcrumb.api',
    'technical': 'breadcrumb.technical',
    'guides': 'breadcrumb.guides',
    'plan': 'breadcrumb.plan',
    'auth': 'breadcrumb.auth',
    'client': 'breadcrumb.client',
    'server': 'breadcrumb.server',
    'database': 'breadcrumb.database',
    'games': 'breadcrumb.games',
    'social': 'breadcrumb.social',
    'stats': 'breadcrumb.stats',
    'subscription': 'breadcrumb.subscription',
    'deploy': 'breadcrumb.deploy',
    'design': 'breadcrumb.design',
    'start-here': 'breadcrumb.startHere',
    'instruction': 'breadcrumb.instruction',
    'docs-guide': 'breadcrumb.docsGuide',
    'mcp-setup': 'breadcrumb.mcpSetup',
    'update-plan': 'breadcrumb.updatePlan',
    'final-tasks': 'breadcrumb.finalTasks'
  };
  
  // Return translated label or capitalize the segment
  if (keyMap[segment]) {
    return translate(keyMap[segment]);
  }
  
  return capitalizeWords(segment.replace(/-/g, ' '));
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
