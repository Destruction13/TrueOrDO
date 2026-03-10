import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { SectionCard } from '../SectionCard';

describe('SectionCard', () => {
  const defaultProps = {
    icon: '📡',
    title: 'API Documentation',
    description: 'Complete REST API reference',
    path: '/api'
  };

  function renderCard(props = defaultProps) {
    return render(
      <BrowserRouter>
        <SectionCard {...props} />
      </BrowserRouter>
    );
  }

  it('should render icon, title, and description', () => {
    renderCard();

    expect(screen.getByText('📡')).toBeInTheDocument();
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.getByText('Complete REST API reference')).toBeInTheDocument();
  });

  it('should render as a link with correct path', () => {
    renderCard();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/api');
  });

  it('should have correct CSS classes', () => {
    renderCard();

    const link = screen.getByRole('link');
    expect(link).toHaveClass('section-card-link');

    const icon = screen.getByText('📡');
    expect(icon).toHaveClass('section-card-icon');

    const title = screen.getByText('API Documentation');
    expect(title).toHaveClass('section-card-title');

    const description = screen.getByText('Complete REST API reference');
    expect(description).toHaveClass('section-card-description');
  });

  it('should render different sections correctly', () => {
    const technicalProps = {
      icon: '⚙️',
      title: 'Technical Sections',
      description: 'Architecture and technical details',
      path: '/technical'
    };

    renderCard(technicalProps);

    expect(screen.getByText('⚙️')).toBeInTheDocument();
    expect(screen.getByText('Technical Sections')).toBeInTheDocument();
    expect(screen.getByText('Architecture and technical details')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/technical');
  });
});
