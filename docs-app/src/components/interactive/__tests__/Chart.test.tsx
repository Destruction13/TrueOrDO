/**
 * Unit tests for Chart component
 * 
 * Tests:
 * - Rendering different chart types
 * - Interactive tooltips
 * - Export functionality
 * - Empty state handling
 * - Zoom functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chart } from '../Chart';
import type { ChartData } from '../../../types';

describe('Chart Component', () => {
  const mockData: ChartData[] = [
    { month: 'Jan', users: 100 },
    { month: 'Feb', users: 150 },
    { month: 'Mar', users: 200 },
    { month: 'Apr', users: 180 },
    { month: 'May', users: 220 },
  ];

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    (globalThis as any).URL = {
      createObjectURL: vi.fn(() => 'mock-url'),
      revokeObjectURL: vi.fn(),
    };
  });

  describe('Rendering', () => {
    it('should render line chart', () => {
      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          title="User Growth"
        />
      );

      expect(screen.getByText('User Growth')).toBeInTheDocument();
    });

    it('should render bar chart', () => {
      render(
        <Chart
          data={mockData}
          type="bar"
          xKey="month"
          yKey="users"
        />
      );

      // Check that chart container exists
      const container = document.querySelector('.chart-container');
      expect(container).toBeInTheDocument();
    });

    it('should render area chart', () => {
      render(
        <Chart
          data={mockData}
          type="area"
          xKey="month"
          yKey="users"
        />
      );

      const container = document.querySelector('.chart-container');
      expect(container).toBeInTheDocument();
    });

    it('should render pie chart', () => {
      render(
        <Chart
          data={mockData}
          type="pie"
          xKey="month"
          yKey="users"
        />
      );

      const container = document.querySelector('.chart-container');
      expect(container).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          title="Monthly Statistics"
        />
      );

      expect(screen.getByText('Monthly Statistics')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
        />
      );

      const title = document.querySelector('.chart-title');
      expect(title).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no data provided', () => {
      render(
        <Chart
          data={[]}
          type="line"
          xKey="month"
          yKey="users"
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      render(
        <Chart
          data={[]}
          type="line"
          xKey="month"
          yKey="users"
        />
      );

      // Recharts container should not be present
      const recharts = document.querySelector('.recharts-wrapper');
      expect(recharts).not.toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('should show export button when exportable is true', () => {
      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          exportable={true}
        />
      );

      const exportButton = screen.getByLabelText('Export to PNG');
      expect(exportButton).toBeInTheDocument();
    });

    it('should not show export button when exportable is false', () => {
      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          exportable={false}
        />
      );

      const exportButton = screen.queryByLabelText('Export to PNG');
      expect(exportButton).not.toBeInTheDocument();
    });

    it('should not show reset zoom button initially', () => {
      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          zoomable={true}
        />
      );

      const resetButton = screen.queryByLabelText('Reset zoom');
      expect(resetButton).not.toBeInTheDocument();
    });

    it('should not show zoom controls for pie chart', () => {
      render(
        <Chart
          data={mockData}
          type="pie"
          xKey="month"
          yKey="users"
          zoomable={true}
        />
      );

      const resetButton = screen.queryByLabelText('Reset zoom');
      expect(resetButton).not.toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should have export button that can be clicked', async () => {
      const user = userEvent.setup();

      render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          exportable={true}
        />
      );

      const exportButton = screen.getByLabelText('Export to PNG');
      expect(exportButton).toBeInTheDocument();
      
      // Verify button is clickable (doesn't throw)
      await user.click(exportButton);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on buttons', () => {
      const { container } = render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          exportable={true}
        />
      );

      const exportButton = container.querySelector('[aria-label="Export to PNG"]');
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).toHaveAttribute('type', 'button');
    });

    it('should have proper title attributes for tooltips', () => {
      const { container } = render(
        <Chart
          data={mockData}
          type="line"
          xKey="month"
          yKey="users"
          exportable={true}
        />
      );

      const exportButton = container.querySelector('[title="Export to PNG"]');
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('should handle numeric data correctly', () => {
      const numericData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 30 },
      ];

      const { container } = render(
        <Chart
          data={numericData}
          type="line"
          xKey="x"
          yKey="y"
        />
      );

      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });

    it('should handle string data correctly', () => {
      const stringData = [
        { category: 'A', value: 100 },
        { category: 'B', value: 200 },
        { category: 'C', value: 150 },
      ];

      const { container } = render(
        <Chart
          data={stringData}
          type="bar"
          xKey="category"
          yKey="value"
        />
      );

      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        value: Math.random() * 1000,
      }));

      const { container } = render(
        <Chart
          data={largeData}
          type="line"
          xKey="index"
          yKey="value"
        />
      );

      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });
  });

  describe('Chart Types', () => {
    it('should render different chart types with same data', () => {
      const types: Array<'line' | 'bar' | 'area' | 'pie'> = ['line', 'bar', 'area', 'pie'];

      types.forEach((type) => {
        const { container, unmount } = render(
          <Chart
            data={mockData}
            type={type}
            xKey="month"
            yKey="users"
          />
        );

        expect(container.querySelector('.chart-container')).toBeInTheDocument();

        unmount();
      });
    });
  });
});
