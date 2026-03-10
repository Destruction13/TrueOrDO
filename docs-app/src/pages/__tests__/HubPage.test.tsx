import { render, screen } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HubPage } from '../HubPage';

describe('HubPage', () => {
  function renderHubPage() {
    return render(
      <BrowserRouter>
        <HubPage />
      </BrowserRouter>
    );
  }

  it('should render hero section with title and description', () => {
    renderHubPage();

    expect(screen.getByText('TrueOrDO Documentation')).toBeInTheDocument();
    expect(screen.getByText(/Interactive documentation system/i)).toBeInTheDocument();
  });

  it('should render all four section cards', () => {
    renderHubPage();

    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.getByText('Technical Sections')).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
    expect(screen.getByText('Development Plan')).toBeInTheDocument();
  });

  it('should render section cards with correct descriptions', () => {
    renderHubPage();

    expect(screen.getByText(/Complete REST API reference/i)).toBeInTheDocument();
    expect(screen.getByText(/Architecture and technical details/i)).toBeInTheDocument();
    expect(screen.getByText(/Step-by-step guides and tutorials/i)).toBeInTheDocument();
    expect(screen.getByText(/Bug tracker and development roadmap/i)).toBeInTheDocument();
  });

  it('should render section cards with correct icons', () => {
    renderHubPage();

    expect(screen.getByText('📡')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('should render section cards as links with correct paths', () => {
    renderHubPage();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);

    const apiLink = links.find(link => link.getAttribute('href') === '/api');
    const technicalLink = links.find(link => link.getAttribute('href') === '/technical');
    const guidesLink = links.find(link => link.getAttribute('href') === '/guides');
    const planLink = links.find(link => link.getAttribute('href') === '/plan');

    expect(apiLink).toBeInTheDocument();
    expect(technicalLink).toBeInTheDocument();
    expect(guidesLink).toBeInTheDocument();
    expect(planLink).toBeInTheDocument();
  });

  it('should have correct CSS classes', () => {
    renderHubPage();

    const hubPage = screen.getByText('TrueOrDO Documentation').closest('.hub-page');
    expect(hubPage).toBeInTheDocument();

    const hero = screen.getByText('TrueOrDO Documentation').closest('.hub-hero');
    expect(hero).toBeInTheDocument();

    const title = screen.getByText('TrueOrDO Documentation');
    expect(title).toHaveClass('hub-hero-title');

    const description = screen.getByText(/Interactive documentation system/i);
    expect(description).toHaveClass('hub-hero-description');
  });
});
