import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test-utils';
import { MemoryRouter } from 'react-router-dom';
import { GuidesPage } from '../GuidesPage';

describe('GuidesPage', () => {
  it('renders the guides hub page', () => {
    render(
      <MemoryRouter initialEntries={['/guides']}>
        <GuidesPage />
      </MemoryRouter>
    );

    // Check for main heading
    expect(screen.getByText('Guides & Tutorials')).toBeInTheDocument();
    
    // Check for description
    expect(screen.getByText(/Step-by-step guides and tutorials/i)).toBeInTheDocument();
  });

  it('renders all guide navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/guides']}>
        <GuidesPage />
      </MemoryRouter>
    );

    // Check for all guide sections in navigation
    // There are now two nav elements: breadcrumbs and guides-nav
    const navElements = screen.getAllByRole('navigation');
    expect(navElements.length).toBeGreaterThanOrEqual(1);
    
    // Check that all navigation links exist by checking if text is included
    const navLinks = screen.getAllByRole('link');
    const navTexts = navLinks.map(link => link.textContent || '').join(' ');
    
    expect(navTexts).toContain('Start Here');
    expect(navTexts).toContain('Instruction');
    expect(navTexts).toContain('Documentation Guide');
    expect(navTexts).toContain('MCP Setup');
    expect(navTexts).toContain('Update Plan');
    expect(navTexts).toContain('Final Tasks');
  });

  it('renders guide cards on hub page', () => {
    render(
      <MemoryRouter initialEntries={['/guides']}>
        <GuidesPage />
      </MemoryRouter>
    );

    // Check for guide card descriptions
    expect(screen.getByText('Begin your journey with TrueOrDO')).toBeInTheDocument();
    expect(screen.getByText('Main instruction (RU)')).toBeInTheDocument();
    expect(screen.getByText('How to work with documentation')).toBeInTheDocument();
    expect(screen.getByText('Setting up MCP servers')).toBeInTheDocument();
  });
});
