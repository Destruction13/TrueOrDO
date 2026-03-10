import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../test-utils';
import { SearchModal } from '../SearchModal';
import { searchEngine } from '../../../lib/search/SearchEngine';
import type { Document } from '../../../types';

describe('SearchModal', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();

  const testDocuments: Document[] = [
    {
      id: '1',
      title: 'Authentication Guide',
      content: 'This guide explains authentication',
      section: 'technical',
      path: '/technical/auth',
      metadata: {},
    },
    {
      id: '2',
      title: 'Database Setup',
      content: 'Learn about database configuration',
      section: 'technical',
      path: '/technical/database',
      metadata: {},
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    await searchEngine.indexContent(testDocuments);
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <SearchModal isOpen={false} onClose={mockOnClose} onNavigate={mockOnNavigate} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    expect(screen.getByPlaceholderText(/Search documentation/i)).toBeInTheDocument();
  });

  it('should focus input when modal opens', () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);
    expect(document.activeElement).toBe(input);
  });

  it('should call onClose when close button is clicked', () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const closeButton = screen.getByLabelText(/Close/i);
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const modal = screen.getByPlaceholderText(/Search documentation/i).closest('.search-modal');
    fireEvent.keyDown(modal!, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display hint for short queries', () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/Enter at least 2 characters/i)).toBeInTheDocument();
  });

  it('should display search results after typing', async () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);

    fireEvent.change(input, { target: { value: 'authentication' } });

    await waitFor(
      () => {
        expect(screen.getByText(/Authentication/i)).toBeInTheDocument();
        expect(screen.getByText(/Guide/i)).toBeInTheDocument();
      },
      { timeout: 300 }
    );
  });

  it('should display no results message for non-matching query', async () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);

    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(
      () => {
        expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      },
      { timeout: 300 }
    );
  });

  it('should navigate when result is clicked', async () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);

    fireEvent.change(input, { target: { value: 'authentication' } });

    await waitFor(() => {
      const results = document.querySelectorAll('.search-result-item');
      expect(results.length).toBeGreaterThan(0);
    });

    const result = document.querySelector('.search-result-item');
    if (result) {
      fireEvent.click(result);
    }

    expect(mockOnNavigate).toHaveBeenCalledWith('/technical/auth', expect.any(String));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should support keyboard navigation', async () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);

    fireEvent.change(input, { target: { value: 'database' } });

    await waitFor(() => {
      const results = document.querySelectorAll('.search-result-item');
      expect(results.length).toBeGreaterThan(0);
    });

    const modal = input.closest('.search-modal');

    // Press ArrowDown to select first result
    fireEvent.keyDown(modal!, { key: 'ArrowDown' });

    // Press Enter to navigate
    fireEvent.keyDown(modal!, { key: 'Enter' });

    expect(mockOnNavigate).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should filter results by section', async () => {
    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);

    fireEvent.change(input, { target: { value: 'database' } });

    await waitFor(() => {
      const results = document.querySelectorAll('.search-result-item');
      expect(results.length).toBeGreaterThan(0);
    });

    // Click technical filter button (not the section label in results)
    const filterButtons = screen.getAllByText('technical');
    const technicalFilterButton = filterButtons.find(
      (el) => el.classList.contains('search-filter-button')
    );
    if (technicalFilterButton) {
      fireEvent.click(technicalFilterButton);
    }

    // Results should still be visible (they're in technical section)
    const results = document.querySelectorAll('.search-result-item');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should debounce search input', async () => {
    const indexSpy = vi.spyOn(searchEngine, 'search');

    render(<SearchModal isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);
    const input = screen.getByPlaceholderText(/Search documentation/i);

    // Type multiple characters quickly
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'au' } });
    fireEvent.change(input, { target: { value: 'aut' } });

    // Search should not be called immediately
    expect(indexSpy).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(
      () => {
        expect(indexSpy).toHaveBeenCalled();
      },
      { timeout: 300 }
    );
  });
});
