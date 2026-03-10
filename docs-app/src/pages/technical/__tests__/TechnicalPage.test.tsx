/**
 * TechnicalPage tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test-utils';
import { MemoryRouter } from 'react-router-dom';
import { TechnicalPage } from '../TechnicalPage';

describe('TechnicalPage', () => {
  it('should render technical hub when on root path', () => {
    render(
      <MemoryRouter initialEntries={['/technical']}>
        <TechnicalPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Technical Documentation')).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive technical documentation/i)).toBeInTheDocument();
  });

  it('should render all 10 technical sections in sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/technical']}>
        <TechnicalPage />
      </MemoryRouter>
    );

    // Each section appears twice: once in sidebar, once in hub
    expect(screen.getAllByText('Authentication').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Client').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Server').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Database').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Games').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Social').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Stats').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Subscription').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Deploy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Design').length).toBeGreaterThanOrEqual(1);
  });

  it('should render section cards in hub view', () => {
    render(
      <MemoryRouter initialEntries={['/technical']}>
        <TechnicalPage />
      </MemoryRouter>
    );

    const cards = screen.getAllByRole('link');
    // 10 sections in sidebar + 10 cards in hub = 20 links
    expect(cards.length).toBeGreaterThanOrEqual(10);
  });
});
