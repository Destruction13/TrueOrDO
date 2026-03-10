/**
 * Unit tests for ErrorMessage component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message with default title', () => {
    render(<ErrorMessage message="Something went wrong" />);
    
    expect(screen.getByText('Error Loading Content')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(
      <ErrorMessage
        title="Custom Error"
        message="Custom error message"
      />
    );
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should display file path when provided', () => {
    render(
      <ErrorMessage
        message="File not found"
        filePath="/docs/api/README.md"
      />
    );
    
    expect(screen.getByText('File:')).toBeInTheDocument();
    expect(screen.getByText('/docs/api/README.md')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    
    render(
      <ErrorMessage
        message="Failed to load"
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onGoHome when home button is clicked', async () => {
    const user = userEvent.setup();
    const onGoHome = vi.fn();
    
    render(
      <ErrorMessage
        message="Failed to load"
        onGoHome={onGoHome}
      />
    );
    
    const homeButton = screen.getByRole('button', { name: /go to home/i });
    await user.click(homeButton);
    
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('should call onGoBack when back button is clicked', async () => {
    const user = userEvent.setup();
    const onGoBack = vi.fn();
    
    render(
      <ErrorMessage
        message="Failed to load"
        onGoBack={onGoBack}
      />
    );
    
    const backButton = screen.getByRole('button', { name: /go back/i });
    await user.click(backButton);
    
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it('should show technical details when showDetails is true', () => {
    render(
      <ErrorMessage
        message="Failed to load"
        showDetails={true}
        details="Network error: timeout"
      />
    );
    
    expect(screen.getByText('Technical details')).toBeInTheDocument();
    expect(screen.getByText('Network error: timeout')).toBeInTheDocument();
  });

  it('should not show technical details when showDetails is false', () => {
    render(
      <ErrorMessage
        message="Failed to load"
        showDetails={false}
        details="Network error: timeout"
      />
    );
    
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
  });

  it('should render all recovery buttons when provided', () => {
    render(
      <ErrorMessage
        message="Failed to load"
        onRetry={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('should not render buttons when handlers are not provided', () => {
    render(<ErrorMessage message="Failed to load" />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
