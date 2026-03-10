import React, { useState, useMemo } from 'react';
import './InteractiveTable.css';
import type { TableProps } from '../../types';

/**
 * InteractiveTable Component
 * 
 * A feature-rich table component with:
 * - Column sorting (ascending/descending)
 * - Column filtering
 * - Global search across all columns
 * - Sticky headers on scroll
 * - Pagination
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7
 */
export const InteractiveTable: React.FC<TableProps> = ({
  data,
  columns,
  sortable = true,
  filterable = true,
  searchable = true,
  exportable = false,
  stickyHeader = true,
  pageSize = 10,
}) => {
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // State for filtering
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // State for global search
  const [globalSearch, setGlobalSearch] = useState('');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Handle column sort
  const handleSort = (columnKey: string) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle column filter change
  const handleFilterChange = (columnKey: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value,
    }));
    setCurrentPage(1); // Reset to first page
  };

  // Handle global search change
  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearch(value);
    setCurrentPage(1); // Reset to first page
  };

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply column filters
    if (filterable) {
      Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
        if (filterValue) {
          result = result.filter(row => {
            const cellValue = row[columnKey];
            if (cellValue === null || cellValue === undefined) return false;
            return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      });
    }

    // Apply global search
    if (searchable && globalSearch) {
      result = result.filter(row => {
        return columns.some(column => {
          const cellValue = row[column.key];
          if (cellValue === null || cellValue === undefined) return false;
          return String(cellValue).toLowerCase().includes(globalSearch.toLowerCase());
        });
      });
    }

    return result;
  }, [data, columns, columnFilters, globalSearch, filterable, searchable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortable || !sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle different types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Fallback to string comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    // Generate CSV header
    const header = columns.map(col => col.title).join(',');
    
    // Generate CSV rows
    const rows = sortedData.map(row => 
      columns.map(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        
        // Escape commas and quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    // Combine and download
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table-export.csv';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportToJSON = () => {
    const json = JSON.stringify(sortedData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table-export.json';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="interactive-table-container">
      {/* Global search and export buttons */}
      <div className="table-controls">
        {searchable && (
          <div className="table-search">
            <input
              type="text"
              placeholder="Search across all columns..."
              value={globalSearch}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {exportable && (
          <div className="export-buttons">
            <button
              onClick={exportToCSV}
              className="export-button"
              title="Export to CSV"
            >
              Export CSV
            </button>
            <button
              onClick={exportToJSON}
              className="export-button"
              title="Export to JSON"
            >
              Export JSON
            </button>
          </div>
        )}
      </div>

      {/* Table wrapper for sticky header */}
      <div className={`table-wrapper ${stickyHeader ? 'sticky-header' : ''}`}>
        <table className="interactive-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="table-header">
                  <div className="header-content">
                    <button
                      className={`sort-button ${sortable && column.sortable !== false ? 'sortable' : ''}`}
                      onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                      disabled={!sortable || column.sortable === false}
                    >
                      {column.title}
                      {sortable && column.sortable !== false && sortColumn === column.key && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </button>
                  </div>
                  {filterable && column.filterable !== false && (
                    <div className="filter-input-wrapper">
                      <input
                        type="text"
                        placeholder={`Filter ${column.title}...`}
                        value={columnFilters[column.key] || ''}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        className="filter-input"
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="no-data">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({sortedData.length} total rows)
          </span>
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
