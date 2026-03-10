/**
 * BugList Component
 * Displays bugs in an interactive table with filtering
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { BugEntry, BugPriority, BugStatus } from '../../types/bug';
import './BugList.css';

interface BugListProps {
  bugs: BugEntry[];
  onBugClick: (bugId: string) => void;
}

interface Filters {
  priority: BugPriority | 'all';
  status: BugStatus | 'all';
  search: string;
}

export function BugList({ bugs, onBugClick }: BugListProps) {
  const { translate } = useLanguage();
  const [filters, setFilters] = useState<Filters>({
    priority: 'all',
    status: 'all',
    search: ''
  });

  const [sortColumn, setSortColumn] = useState<keyof BugEntry>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      // Priority filter
      if (filters.priority !== 'all' && bug.priority !== filters.priority) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && bug.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = bug.title.toLowerCase().includes(searchLower);
        const matchesTags = bug.tags.some(tag => tag.toLowerCase().includes(searchLower));
        const matchesId = bug.id.includes(searchLower);
        
        if (!matchesTitle && !matchesTags && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [bugs, filters]);

  // Sort bugs
  const sortedBugs = useMemo(() => {
    return [...filteredBugs].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      let comparison = 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (Array.isArray(aVal) && Array.isArray(bVal)) {
        comparison = aVal.length - bVal.length;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredBugs, sortColumn, sortDirection]);

  const handleSort = (column: keyof BugEntry) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getPriorityClass = (priority: BugPriority): string => {
    return `priority-${priority}`;
  };

  const getStatusClass = (status: BugStatus): string => {
    return `status-${status}`;
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bug-list">
      <div className="bug-list-filters">
        <div className="filter-group">
          <label htmlFor="search">{translate('search.placeholder')}</label>
          <input
            id="search"
            type="text"
            placeholder={translate('bugs.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="priority-filter">{translate('form.priority')}</label>
          <select
            id="priority-filter"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as BugPriority | 'all' })}
          >
            <option value="all">{translate('bugs.filterAll')}</option>
            <option value="low">{translate('bugs.priority.low')}</option>
            <option value="medium">{translate('bugs.priority.medium')}</option>
            <option value="high">{translate('bugs.priority.high')}</option>
            <option value="critical">{translate('bugs.priority.critical')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">{translate('form.status')}</label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as BugStatus | 'all' })}
          >
            <option value="all">{translate('bugs.filterAll')}</option>
            <option value="open">{translate('bugs.status.open')}</option>
            <option value="in-progress">{translate('bugs.status.inProgress')}</option>
            <option value="resolved">{translate('bugs.status.resolved')}</option>
            <option value="closed">{translate('bugs.status.closed')}</option>
          </select>
        </div>
      </div>

      <div className="bug-list-info">
        {translate('bugs.showingBugs', { count: sortedBugs.length, total: bugs.length })}
      </div>

      <div className="bug-table-container">
        <table className="bug-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="sortable">
                ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('title')} className="sortable">
                {translate('form.title')} {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('priority')} className="sortable">
                {translate('form.priority')} {sortColumn === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                {translate('form.status')} {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>{translate('form.tags')}</th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                {translate('date.created')} {sortColumn === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBugs.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-results">
                  {translate('bugs.noResults')}
                </td>
              </tr>
            ) : (
              sortedBugs.map((bug) => (
                <tr
                  key={bug.id}
                  onClick={() => onBugClick(bug.id)}
                  className="bug-row"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onBugClick(bug.id);
                    }
                  }}
                >
                  <td className="bug-id">#{bug.id}</td>
                  <td className="bug-title">{bug.title}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(bug.priority)}`}>
                      {translate(`bugs.priority.${bug.priority}`)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(bug.status)}`}>
                      {translate(`bugs.status.${bug.status === 'in-progress' ? 'inProgress' : bug.status}`)}
                    </span>
                  </td>
                  <td className="bug-tags">
                    {bug.tags.length > 0 ? (
                      <div className="tags">
                        {bug.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                        {bug.tags.length > 3 && (
                          <span className="tag-more">+{bug.tags.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="no-tags">—</span>
                    )}
                  </td>
                  <td className="bug-date">{formatDate(bug.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
