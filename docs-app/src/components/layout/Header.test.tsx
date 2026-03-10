import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';

describe('Header', () => {
  it('should render header with title', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('TrueOrDO Docs')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <BrowserRouter>
        <Header className="custom-class" />
      </BrowserRouter>
    );
    const header = container.querySelector('header');
    expect(header).toHaveClass('custom-class');
  });
});
