import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../SearchEngine';
import type { Document } from '../../../types';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let testDocuments: Document[];

  beforeEach(() => {
    searchEngine = new SearchEngine();
    testDocuments = [
      {
        id: '1',
        title: 'Authentication Guide',
        content: 'This guide explains how to implement authentication in your application using JWT tokens.',
        section: 'technical',
        path: '/technical/auth',
        metadata: {
          headings: ['Introduction', 'JWT Tokens', 'Implementation'],
          tags: ['auth', 'security'],
        },
      },
      {
        id: '2',
        title: 'Database Setup',
        content: 'Learn how to set up and configure your database for optimal performance.',
        section: 'technical',
        path: '/technical/database',
        metadata: {
          headings: ['Installation', 'Configuration'],
          tags: ['database', 'setup'],
        },
      },
      {
        id: '3',
        title: 'API Reference',
        content: 'Complete API reference for all available endpoints and methods.',
        section: 'api',
        path: '/api/reference',
        metadata: {
          headings: ['Endpoints', 'Methods'],
          tags: ['api', 'reference'],
        },
      },
    ];
  });

  describe('indexContent', () => {
    it('should index documents successfully', async () => {
      await searchEngine.indexContent(testDocuments);
      const metadata = searchEngine.getMetadata();

      expect(metadata.totalDocuments).toBe(3);
      expect(metadata.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty document array', async () => {
      await searchEngine.indexContent([]);
      const metadata = searchEngine.getMetadata();

      expect(metadata.totalDocuments).toBe(0);
      expect(metadata.totalTokens).toBe(0);
    });

    it('should continue indexing when one document fails', async () => {
      const invalidDoc = {
        ...testDocuments[0],
        content: null as any, // Invalid content
      };

      await searchEngine.indexContent([invalidDoc, testDocuments[1]]);
      const metadata = searchEngine.getMetadata();

      // Should index at least the valid document
      expect(metadata.totalDocuments).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await searchEngine.indexContent(testDocuments);
    });

    it('should return empty results for queries less than 2 characters', () => {
      const results = searchEngine.search('a');
      expect(results).toEqual([]);
    });

    it('should find documents matching single word query', () => {
      const results = searchEngine.search('authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.title).toBe('Authentication Guide');
    });

    it('should find documents matching multi-word query', () => {
      const results = searchEngine.search('database setup');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.title).toBe('Database Setup');
    });

    it('should return results sorted by relevance score', () => {
      const results = searchEngine.search('api');
      expect(results.length).toBeGreaterThan(0);
      
      // Scores should be in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should filter results by section', () => {
      const results = searchEngine.search('guide', { sections: ['technical'] });
      
      for (const result of results) {
        expect(result.document.section).toBe('technical');
      }
    });

    it('should return empty results for non-matching query', () => {
      const results = searchEngine.search('nonexistent');
      expect(results).toEqual([]);
    });

    it('should handle case-insensitive search', () => {
      const lowerResults = searchEngine.search('authentication');
      const upperResults = searchEngine.search('AUTHENTICATION');
      const mixedResults = searchEngine.search('Authentication');

      expect(lowerResults.length).toBe(upperResults.length);
      expect(lowerResults.length).toBe(mixedResults.length);
    });

    it('should include text matches in results', () => {
      const results = searchEngine.search('authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].matches[0].text).toBe('authentication');
    });

    it('should cache search results', () => {
      const results1 = searchEngine.search('authentication');
      const results2 = searchEngine.search('authentication');

      // Results should be identical (from cache)
      expect(results1).toEqual(results2);
    });
  });

  describe('highlightMatches', () => {
    it('should highlight matching text', () => {
      const text = 'This is a test document';
      const highlighted = searchEngine.highlightMatches(text, 'test');

      expect(highlighted).toContain('<mark>');
      expect(highlighted).toContain('</mark>');
    });

    it('should handle case-insensitive highlighting', () => {
      const text = 'This is a TEST document';
      const highlighted = searchEngine.highlightMatches(text, 'test');

      expect(highlighted).toContain('<mark>TEST</mark>');
    });

    it('should return original text when query is empty', () => {
      const text = 'This is a test document';
      const highlighted = searchEngine.highlightMatches(text, '');

      expect(highlighted).toBe(text);
    });

    it('should highlight multiple occurrences', () => {
      const text = 'test test test';
      const highlighted = searchEngine.highlightMatches(text, 'test');

      const markCount = (highlighted.match(/<mark>/g) || []).length;
      expect(markCount).toBe(3);
    });
  });

  describe('getMetadata', () => {
    it('should return index metadata', async () => {
      await searchEngine.indexContent(testDocuments);
      const metadata = searchEngine.getMetadata();

      expect(metadata).toHaveProperty('totalDocuments');
      expect(metadata).toHaveProperty('totalTokens');
      expect(metadata).toHaveProperty('lastIndexed');
      expect(metadata.totalDocuments).toBe(3);
    });
  });

  describe('Unicode support', () => {
    it('should handle Cyrillic text', async () => {
      const cyrillicDoc: Document = {
        id: '4',
        title: 'Документация',
        content: 'Это руководство по аутентификации',
        section: 'technical',
        path: '/technical/auth-ru',
        metadata: {},
      };

      await searchEngine.indexContent([cyrillicDoc]);
      const results = searchEngine.search('аутентификации');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.title).toBe('Документация');
    });

    it('should handle mixed language content', async () => {
      const mixedDoc: Document = {
        id: '5',
        title: 'Mixed Language Guide',
        content: 'This guide covers authentication и безопасность',
        section: 'technical',
        path: '/technical/mixed',
        metadata: {},
      };

      await searchEngine.indexContent([mixedDoc]);
      
      const englishResults = searchEngine.search('authentication');
      const russianResults = searchEngine.search('безопасность');

      expect(englishResults.length).toBeGreaterThan(0);
      expect(russianResults.length).toBeGreaterThan(0);
    });
  });
});
