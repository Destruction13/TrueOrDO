import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test-utils';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('should not render on Hub page (root path)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(container.querySelector('.breadcrumbs')).toBeNull();
  });

  it('should render breadcrumbs for API page', () => {
    render(
      <MemoryRouter initialEntries={['/api']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
  });

  it('should render breadcrumbs for nested Technical page', () => {
    render(
      <MemoryRouter initialEntries={['/technical/auth']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
  });

  it('should render breadcrumbs for Guides subsection', () => {
    render(
      <MemoryRouter initialEntries={['/guides/start-here']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
    expect(screen.getByText('Start Here')).toBeInTheDocument();
  });

  it('should make all breadcrumbs except current clickable', () => {
    render(
      <MemoryRouter initialEntries={['/technical/auth']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    // Home and Technical should be links
    const homeLink = screen.getByText('Home').closest('a');
    const technicalLink = screen.getByText('Technical').closest('a');
    
    expect(homeLink).toHaveAttribute('href', '/');
    expect(technicalLink).toHaveAttribute('href', '/technical');
    
    // Current page (Authentication) should not be a link
    const currentPage = screen.getByText('Authentication');
    expect(currentPage.closest('a')).toBeNull();
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('should display separators between breadcrumbs', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/technical/auth']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    const separators = container.querySelectorAll('.breadcrumb-separator');
    // Should have 2 separators for 3 breadcrumbs (Home / Technical / Auth)
    expect(separators).toHaveLength(2);
  });

  it('should format segment labels correctly', () => {
    render(
      <MemoryRouter initialEntries={['/technical/database']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('should handle hyphenated segments', () => {
    render(
      <MemoryRouter initialEntries={['/guides/mcp-setup']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(screen.getByText('MCP Setup')).toBeInTheDocument();
  });

  it('should capitalize unknown segments', () => {
    render(
      <MemoryRouter initialEntries={['/unknown/custom-page']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Custom Page')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/technical/auth']}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    
    const nav = container.querySelector('nav');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    
    const currentPage = screen.getByText('Authentication');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });
});
