import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteractiveTable } from '../InteractiveTable';
import type { Column } from '../../../types';

describe('InteractiveTable', () => {
  const mockData = [
    { id: 1, name: 'Alice', age: 30, city: 'New York' },
    { id: 2, name: 'Bob', age: 25, city: 'Los Angeles' },
    { id: 3, name: 'Charlie', age: 35, city: 'Chicago' },
    { id: 4, name: 'David', age: 28, city: 'Houston' },
  ];

  const mockColumns: Column[] = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Name' },
    { key: 'age', title: 'Age' },
    { key: 'city', title: 'City' },
  ];

  describe('Basic Rendering', () => {
    it('should render table with data', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('should render column headers', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(<InteractiveTable data={[]} columns={mockColumns} />);

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  describe('Column Sorting', () => {
    it('should sort by column in ascending order', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      // Click on Age column header
      const ageHeader = screen.getByRole('button', { name: /Age/i });
      await user.click(ageHeader);

      // Get all table rows
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Skip header row

      // Check order: 25, 28, 30, 35
      expect(within(dataRows[0]).getByText('25')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('28')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('30')).toBeInTheDocument();
      expect(within(dataRows[3]).getByText('35')).toBeInTheDocument();
    });

    it('should sort by column in descending order on second click', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const ageHeader = screen.getByRole('button', { name: /Age/i });
      
      // First click - ascending
      await user.click(ageHeader);
      
      // Second click - descending
      await user.click(ageHeader);

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);

      // Check order: 35, 30, 28, 25
      expect(within(dataRows[0]).getByText('35')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('30')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('28')).toBeInTheDocument();
      expect(within(dataRows[3]).getByText('25')).toBeInTheDocument();
    });

    it('should sort strings alphabetically', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Name/i });
      await user.click(nameHeader);

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);

      // Check alphabetical order
      expect(within(dataRows[0]).getByText('Alice')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('Bob')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('Charlie')).toBeInTheDocument();
      expect(within(dataRows[3]).getByText('David')).toBeInTheDocument();
    });

    it('should display sort indicator', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const ageHeader = screen.getByRole('button', { name: /Age/i });
      await user.click(ageHeader);

      // Check for ascending indicator
      expect(ageHeader.textContent).toContain('▲');

      // Click again for descending
      await user.click(ageHeader);
      expect(ageHeader.textContent).toContain('▼');
    });

    it('should not sort when sortable is false', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} sortable={false} />);

      const ageHeader = screen.getByRole('button', { name: /Age/i });
      await user.click(ageHeader);

      // Data should remain in original order
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      expect(within(dataRows[0]).getByText('30')).toBeInTheDocument(); // Alice's age
    });
  });

  describe('Column Filtering', () => {
    it('should filter by column value', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      // Find the filter input for Name column
      const filterInputs = screen.getAllByPlaceholderText(/Filter/i);
      const nameFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('Name')
      );

      expect(nameFilter).toBeDefined();
      await user.type(nameFilter!, 'Bob');

      // Only Bob should be visible
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });

    it('should filter case-insensitively', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const filterInputs = screen.getAllByPlaceholderText(/Filter/i);
      const nameFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('Name')
      );

      await user.type(nameFilter!, 'bob');

      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should apply multiple column filters', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const filterInputs = screen.getAllByPlaceholderText(/Filter/i);
      const cityFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('City')
      );

      // Filter by city containing 'o'
      await user.type(cityFilter!, 'o');

      // Should show Houston, Los Angeles, New York, Chicago (all have 'o')
      expect(screen.getByText('Houston')).toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
    });

    it('should not show filter inputs when filterable is false', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} filterable={false} />);

      const filterInputs = screen.queryAllByPlaceholderText(/Filter/i);
      expect(filterInputs).toHaveLength(0);
    });
  });

  describe('Global Search', () => {
    it('should search across all columns', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const searchInput = screen.getByPlaceholderText(/Search across all columns/i);
      await user.type(searchInput, 'Chicago');

      // Only Charlie from Chicago should be visible
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('should search case-insensitively', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={mockData} columns={mockColumns} />);

      const searchInput = screen.getByPlaceholderText(/Search across all columns/i);
      await user.type(searchInput, 'alice');

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should not show search input when searchable is false', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} searchable={false} />);

      const searchInput = screen.queryByPlaceholderText(/Search across all columns/i);
      expect(searchInput).not.toBeInTheDocument();
    });
  });

  describe('Sticky Headers', () => {
    it('should apply sticky header class when enabled', () => {
      const { container } = render(
        <InteractiveTable data={mockData} columns={mockColumns} stickyHeader={true} />
      );

      const wrapper = container.querySelector('.table-wrapper');
      expect(wrapper).toHaveClass('sticky-header');
    });

    it('should not apply sticky header class when disabled', () => {
      const { container } = render(
        <InteractiveTable data={mockData} columns={mockColumns} stickyHeader={false} />
      );

      const wrapper = container.querySelector('.table-wrapper');
      expect(wrapper).not.toHaveClass('sticky-header');
    });
  });

  describe('Pagination', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Person ${i + 1}`,
      age: 20 + i,
      city: `City ${i + 1}`,
    }));

    it('should paginate data with default page size', () => {
      render(<InteractiveTable data={largeData} columns={mockColumns} pageSize={10} />);

      // Should show first 10 items
      expect(screen.getByText('Person 1')).toBeInTheDocument();
      expect(screen.getByText('Person 10')).toBeInTheDocument();
      expect(screen.queryByText('Person 11')).not.toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={largeData} columns={mockColumns} pageSize={10} />);

      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);

      // Should show items 11-20
      expect(screen.getByText('Person 11')).toBeInTheDocument();
      expect(screen.getByText('Person 20')).toBeInTheDocument();
      expect(screen.queryByText('Person 1')).not.toBeInTheDocument();
    });

    it('should navigate to previous page', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={largeData} columns={mockColumns} pageSize={10} />);

      const nextButton = screen.getByRole('button', { name: /Next/i });
      const prevButton = screen.getByRole('button', { name: /Previous/i });

      // Go to page 2
      await user.click(nextButton);
      expect(screen.getByText('Person 11')).toBeInTheDocument();

      // Go back to page 1
      await user.click(prevButton);
      expect(screen.getByText('Person 1')).toBeInTheDocument();
      expect(screen.queryByText('Person 11')).not.toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(<InteractiveTable data={largeData} columns={mockColumns} pageSize={10} />);

      const prevButton = screen.getByRole('button', { name: /Previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', async () => {
      const user = userEvent.setup();
      render(<InteractiveTable data={largeData} columns={mockColumns} pageSize={10} />);

      const nextButton = screen.getByRole('button', { name: /Next/i });

      // Navigate to last page (page 3 for 25 items with pageSize 10)
      await user.click(nextButton); // Page 2
      await user.click(nextButton); // Page 3

      expect(nextButton).toBeDisabled();
    });

    it('should display pagination info', () => {
      render(<InteractiveTable data={largeData} columns={mockColumns} pageSize={10} />);

      expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByText(/25 total rows/i)).toBeInTheDocument();
    });

    it('should not show pagination when data fits on one page', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} pageSize={10} />);

      const nextButton = screen.queryByRole('button', { name: /Next/i });
      expect(nextButton).not.toBeInTheDocument();
    });
  });

  describe('Custom Rendering', () => {
    it('should use custom render function for column', () => {
      const columnsWithRender: Column[] = [
        { key: 'id', title: 'ID' },
        { 
          key: 'name', 
          title: 'Name',
          render: (value) => <strong>{value}</strong>
        },
      ];

      render(<InteractiveTable data={mockData} columns={columnsWithRender} />);

      const aliceElement = screen.getByText('Alice');
      expect(aliceElement.tagName).toBe('STRONG');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values in data', () => {
      const dataWithNull = [
        { id: 1, name: 'Alice', age: null, city: 'New York' },
        { id: 2, name: null, age: 25, city: 'Los Angeles' },
      ];

      render(<InteractiveTable data={dataWithNull} columns={mockColumns} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should handle undefined values in data', () => {
      const dataWithUndefined = [
        { id: 1, name: 'Alice', age: undefined, city: 'New York' },
      ];

      render(<InteractiveTable data={dataWithUndefined} columns={mockColumns} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should handle sorting with null values', async () => {
      const user = userEvent.setup();
      const dataWithNull = [
        { id: 1, name: 'Alice', age: 30, city: 'New York' },
        { id: 2, name: 'Bob', age: null, city: 'Los Angeles' },
        { id: 3, name: 'Charlie', age: 25, city: 'Chicago' },
      ];

      render(<InteractiveTable data={dataWithNull} columns={mockColumns} />);

      const ageHeader = screen.getByRole('button', { name: /Age/i });
      await user.click(ageHeader);

      // Null values should be sorted to the end
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      expect(within(dataRows[0]).getByText('25')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('30')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    let mockLink: Partial<HTMLAnchorElement>;
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      (globalThis as any).URL = {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      };
      
      // Store original createElement
      originalCreateElement = document.createElement.bind(document);
      
      // Mock link element
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.restoreAllMocks();
    });

    it('should show export buttons when exportable is true', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} exportable={true} />);

      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument();
    });

    it('should not show export buttons when exportable is false', () => {
      render(<InteractiveTable data={mockData} columns={mockColumns} exportable={false} />);

      expect(screen.queryByRole('button', { name: /Export CSV/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Export JSON/i })).not.toBeInTheDocument();
    });

    it('should export to CSV with correct format', async () => {
      const user = userEvent.setup();

      render(<InteractiveTable data={mockData} columns={mockColumns} exportable={true} />);

      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);

      // Verify blob was created
      expect(mockCreateObjectURL).toHaveBeenCalled();
      const calls = mockCreateObjectURL.mock.calls as unknown as Array<[Blob]>;
      expect(calls.length).toBeGreaterThan(0);
      const blobArg = calls[0]?.[0] as unknown as Blob;
      expect(blobArg).toBeDefined();
      expect(blobArg.type).toBe('text/csv;charset=utf-8;');

      // Verify link attributes
      expect(mockLink.download).toBe('table-export.csv');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.click).toHaveBeenCalled();

      // Verify URL was revoked
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      // Read blob content
      const text = await blobArg.text();
      const lines = text.split('\n');
      
      // Check header
      expect(lines[0]).toBe('ID,Name,Age,City');
      
      // Check data rows
      expect(lines[1]).toBe('1,Alice,30,New York');
      expect(lines[2]).toBe('2,Bob,25,Los Angeles');
      expect(lines[3]).toBe('3,Charlie,35,Chicago');
      expect(lines[4]).toBe('4,David,28,Houston');
    });

    it('should export to JSON with correct format', async () => {
      const user = userEvent.setup();

      render(<InteractiveTable data={mockData} columns={mockColumns} exportable={true} />);

      const exportButton = screen.getByRole('button', { name: /Export JSON/i });
      await user.click(exportButton);

      // Verify blob was created
      expect(mockCreateObjectURL).toHaveBeenCalled();
      const calls = mockCreateObjectURL.mock.calls as unknown as Array<[Blob]>;
      expect(calls.length).toBeGreaterThan(0);
      const blobArg = calls[0]?.[0] as unknown as Blob;
      expect(blobArg).toBeDefined();
      expect(blobArg.type).toBe('application/json');

      // Verify link attributes
      expect(mockLink.download).toBe('table-export.json');
      expect(mockLink.click).toHaveBeenCalled();

      // Read and parse JSON
      const text = await blobArg.text();
      const json = JSON.parse(text);
      
      expect(json).toEqual(mockData);
    });

    it('should export filtered data only', async () => {
      const user = userEvent.setup();

      render(<InteractiveTable data={mockData} columns={mockColumns} exportable={true} />);

      // Apply filter
      const searchInput = screen.getByPlaceholderText(/Search across all columns/i);
      await user.type(searchInput, 'Bob');

      // Export CSV
      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);

      // Verify only filtered data is exported
      const calls = mockCreateObjectURL.mock.calls as unknown as Array<[Blob]>;
      expect(calls.length).toBeGreaterThan(0);
      const blobArg = calls[0]?.[0] as unknown as Blob;
      expect(blobArg).toBeDefined();
      const text = await blobArg.text();
      const lines = text.split('\n');
      
      // Should have header + 1 data row (Bob only)
      expect(lines).toHaveLength(2);
      expect(lines[1]).toBe('2,Bob,25,Los Angeles');
    });

    it('should export sorted data in correct order', async () => {
      const user = userEvent.setup();

      render(<InteractiveTable data={mockData} columns={mockColumns} exportable={true} />);

      // Sort by age
      const ageHeader = screen.getByRole('button', { name: /Age/i });
      await user.click(ageHeader);

      // Export CSV
      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);

      // Verify data is exported in sorted order
      const calls = mockCreateObjectURL.mock.calls as unknown as Array<[Blob]>;
      expect(calls.length).toBeGreaterThan(0);
      const blobArg = calls[0]?.[0] as unknown as Blob;
      expect(blobArg).toBeDefined();
      const text = await blobArg.text();
      const lines = text.split('\n');
      
      // Check ages are in ascending order
      expect(lines[1]).toContain('25'); // Bob
      expect(lines[2]).toContain('28'); // David
      expect(lines[3]).toContain('30'); // Alice
      expect(lines[4]).toContain('35'); // Charlie
    });

    it('should handle CSV export with special characters', async () => {
      const user = userEvent.setup();
      
      const specialData = [
        { id: 1, name: 'Alice, Jr.', age: 30, city: 'New York' },
        { id: 2, name: 'Bob "The Builder"', age: 25, city: 'Los Angeles' },
        { id: 3, name: 'Charlie\nSmith', age: 35, city: 'Chicago' },
      ];

      render(<InteractiveTable data={specialData} columns={mockColumns} exportable={true} />);

      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);

      const calls = mockCreateObjectURL.mock.calls as unknown as Array<[Blob]>;
      expect(calls.length).toBeGreaterThan(0);
      const blobArg = calls[0]?.[0] as unknown as Blob;
      expect(blobArg).toBeDefined();
      const text = await blobArg.text();
      const lines = text.split('\n');
      
      // Check proper escaping
      expect(lines[1]).toBe('1,"Alice, Jr.",30,New York');
      expect(lines[2]).toBe('2,"Bob ""The Builder""",25,Los Angeles');
      expect(lines[3]).toContain('"Charlie'); // Newline should be quoted
    });

    it('should handle null values in export', async () => {
      const user = userEvent.setup();
      
      const dataWithNull = [
        { id: 1, name: 'Alice', age: null, city: 'New York' },
        { id: 2, name: null, age: 25, city: undefined },
      ];

      render(<InteractiveTable data={dataWithNull} columns={mockColumns} exportable={true} />);

      const exportButton = screen.getByRole('button', { name: /Export CSV/i });
      await user.click(exportButton);

      const calls = mockCreateObjectURL.mock.calls as unknown as Array<[Blob]>;
      expect(calls.length).toBeGreaterThan(0);
      const blobArg = calls[0]?.[0] as unknown as Blob;
      expect(blobArg).toBeDefined();
      const text = await blobArg.text();
      const lines = text.split('\n');
      
      // Null/undefined should be exported as empty strings
      expect(lines[1]).toBe('1,Alice,,New York');
      expect(lines[2]).toBe('2,,25,');
    });
  });
});




