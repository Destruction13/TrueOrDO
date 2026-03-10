import { useEffect, useState, useCallback, useRef } from 'react';
import type { SearchResult, SearchFilters } from '../../types';
import { searchEngine } from '../../lib/search/SearchEngine';
import { useLanguage } from '../../contexts/LanguageContext';
import './SearchModal.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string, anchor?: string) => void;
}

export function SearchModal({ isOpen, onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { translate } = useLanguage();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const searchResults = searchEngine.search(searchQuery, searchFilters);
      setResults(searchResults);
      setSelectedIndex(0);
    }, 200); // 200ms debounce
  }, []);

  // Handle query change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    performSearch(newQuery, filters);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    performSearch(query, newFilters);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    // Extract anchor from first match if available
    const anchor = result.matches[0]?.start ? `#match-${result.matches[0].start}` : undefined;
    onNavigate(result.document.path, anchor);
    onClose();
    setQuery('');
    setResults([]);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={handleBackdropClick}>
      <div className="search-modal" onKeyDown={handleKeyDown}>
        <div className="search-modal-header">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={translate('search.placeholder')}
            value={query}
            onChange={handleQueryChange}
            aria-label={translate('search.placeholder')}
          />
          <button
            className="search-close-button"
            onClick={onClose}
            aria-label={translate('search.close')}
          >
            ✕
          </button>
        </div>

        <SearchFilters filters={filters} onChange={handleFilterChange} />

        <div className="search-results">
          {query.length < 2 && (
            <div className="search-hint">
              {translate('search.hint')}
            </div>
          )}

          {query.length >= 2 && results.length === 0 && (
            <div className="search-no-results">
              {translate('search.noResults', { query })}
            </div>
          )}

          {results.map((result, index) => (
            <SearchResultItem
              key={result.document.id}
              result={result}
              query={query}
              isSelected={index === selectedIndex}
              onClick={() => handleResultClick(result)}
            />
          ))}
        </div>

        <div className="search-modal-footer">
          <div className="search-shortcuts">
            <kbd>↑↓</kbd> {translate('search.shortcuts.navigate')}
            <kbd>Enter</kbd> {translate('search.shortcuts.open')}
            <kbd>Esc</kbd> {translate('search.shortcuts.close')}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const sections = ['api', 'technical', 'guides', 'plan'];
  const { translate } = useLanguage();

  const toggleSection = (section: string) => {
    const currentSections = filters.sections || [];
    const newSections = currentSections.includes(section)
      ? currentSections.filter((s) => s !== section)
      : [...currentSections, section];

    onChange({
      ...filters,
      sections: newSections.length > 0 ? newSections : undefined,
    });
  };

  return (
    <div className="search-filters">
      <div className="search-filters-label">{translate('search.filterBySection')}</div>
      <div className="search-filters-buttons">
        {sections.map((section) => (
          <button
            key={section}
            className={`search-filter-button ${
              filters.sections?.includes(section) ? 'active' : ''
            }`}
            onClick={() => toggleSection(section)}
          >
            {section}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}

function SearchResultItem({ result, query, isSelected, onClick }: SearchResultItemProps) {
  const highlightedTitle = searchEngine.highlightMatches(result.document.title, query);
  const { translate } = useLanguage();

  return (
    <div
      className={`search-result-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <div className="search-result-header">
        <h3
          className="search-result-title"
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />
        <span className="search-result-section">{result.document.section}</span>
      </div>

      {result.matches.length > 0 && (
        <div className="search-result-matches">
          {result.matches.slice(0, 2).map((match, index) => (
            <div
              key={index}
              className="search-result-match"
              dangerouslySetInnerHTML={{
                __html: searchEngine.highlightMatches(match.context, query),
              }}
            />
          ))}
        </div>
      )}

      <div className="search-result-footer">
        <span className="search-result-path">{result.document.path}</span>
        <span className="search-result-score">
          {translate('search.score')}: {result.score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
