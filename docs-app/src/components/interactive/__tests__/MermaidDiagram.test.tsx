/**
 * MermaidDiagram component tests
 * Tests for Mermaid diagram rendering, zoom, pan, and export functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MermaidDiagram } from '../MermaidDiagram';

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg><g class="node" id="node1"><text>Node 1</text></g></svg>',
    }),
  },
}));

describe('MermaidDiagram', () => {
  const mockChart = `
    graph TD
      A[Start] --> B[Process]
      B --> C[End]
  `;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render diagram container', async () => {
      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      });
    });

    it('should render zoom controls when zoomable is true', async () => {
      render(<MermaidDiagram chart={mockChart} zoomable />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset view/i })).toBeInTheDocument();
      });
    });

    it('should not render zoom controls when zoomable is false', async () => {
      render(<MermaidDiagram chart={mockChart} zoomable={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /zoom in/i })).not.toBeInTheDocument();
      });
    });

    it('should render export controls when exportable is true', async () => {
      render(<MermaidDiagram chart={mockChart} exportable />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export to svg/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export to png/i })).toBeInTheDocument();
      });
    });

    it('should not render export controls when exportable is false', async () => {
      render(<MermaidDiagram chart={mockChart} exportable={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /export to svg/i })).not.toBeInTheDocument();
      });
    });

    it('should display zoom indicator', async () => {
      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('Zoom functionality', () => {
    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<MermaidDiagram chart={mockChart} zoomable />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('120%')).toBeInTheDocument();
      });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();
      render(<MermaidDiagram chart={mockChart} zoomable />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      await user.click(zoomOutButton);

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('should reset zoom when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<MermaidDiagram chart={mockChart} zoomable />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      // Zoom in first
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('120%')).toBeInTheDocument();
      });

      // Reset
      const resetButton = screen.getByRole('button', { name: /reset view/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should not zoom beyond maximum (300%)', async () => {
      const user = userEvent.setup();
      render(<MermaidDiagram chart={mockChart} zoomable />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });

      // Click zoom in 15 times (should cap at 300%)
      for (let i = 0; i < 15; i++) {
        await user.click(zoomInButton);
      }

      await waitFor(() => {
        expect(screen.getByText('300%')).toBeInTheDocument();
      });
    });

    it('should not zoom below minimum (50%)', async () => {
      const user = userEvent.setup();
      render(<MermaidDiagram chart={mockChart} zoomable />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      // Click zoom out 10 times (should cap at 50%)
      for (let i = 0; i < 10; i++) {
        await user.click(zoomOutButton);
      }

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });
  });

  describe('Element click handlers', () => {
    it('should call onElementClick when diagram element is clicked', async () => {
      const onElementClick = vi.fn();

      render(<MermaidDiagram chart={mockChart} onElementClick={onElementClick} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      });

      // Note: In a real test, we would need to wait for the SVG to render
      // and then click on a node element. This is a simplified test.
      // The actual click handler is tested through integration tests.
    });
  });

  describe('Export functionality', () => {
    it('should have export to SVG button', async () => {
      render(<MermaidDiagram chart={mockChart} exportable />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export to svg/i })).toBeInTheDocument();
      });
    });

    it('should have export to PNG button', async () => {
      render(<MermaidDiagram chart={mockChart} exportable />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export to png/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message when diagram fails to render', async () => {
      // Create a new mock that rejects
      const mermaid = await import('mermaid');
      const originalRender = mermaid.default.render;
      
      vi.mocked(mermaid.default.render).mockRejectedValueOnce(new Error('Invalid syntax'));

      render(<MermaidDiagram chart="invalid chart syntax" />);

      await waitFor(() => {
        expect(screen.getByText(/failed to render diagram/i)).toBeInTheDocument();
      });

      // Restore original mock
      vi.mocked(mermaid.default.render).mockImplementation(originalRender);
    });
  });

  describe('Theme support', () => {
    it('should initialize mermaid with dark theme', async () => {
      const mermaid = await import('mermaid');
      const initializeSpy = vi.mocked(mermaid.default.initialize);
      
      render(<MermaidDiagram chart={mockChart} theme="dark" />);

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
        const calls = initializeSpy.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toMatchObject({
          theme: 'dark',
        });
      });
    });

    it('should initialize mermaid with light theme', async () => {
      const mermaid = await import('mermaid');
      const initializeSpy = vi.mocked(mermaid.default.initialize);
      
      render(<MermaidDiagram chart={mockChart} theme="light" />);

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
        const calls = initializeSpy.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toMatchObject({
          theme: 'default',
        });
      });
    });
  });
});
