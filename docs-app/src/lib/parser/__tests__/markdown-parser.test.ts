/**
 * Unit tests for Markdown parser module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseMarkdown, parseWithCache, clearCache, getCacheStats } from '../markdown-parser';

describe('Markdown Parser', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('parseMarkdown', () => {
    it('should parse Markdown content without frontmatter', () => {
      const content = '# Hello World\n\nThis is a test.';
      const result = parseMarkdown(content);

      expect(result.content).toBe('# Hello World\n\nThis is a test.');
      expect(result.metadata).toBeDefined();
    });

    it('should extract frontmatter metadata', () => {
      const content = `---
title: "Test Page"
description: "A test page"
section: "test"
tags: ["test", "example"]
toc: true
webgl: false
---

# Content

This is the content.`;

      const result = parseMarkdown(content);

      expect(result.metadata.title).toBe('Test Page');
      expect(result.metadata.description).toBe('A test page');
      expect(result.metadata.section).toBe('test');
      expect(result.metadata.tags).toEqual(['test', 'example']);
      expect(result.metadata.toc).toBe(true);
      expect(result.metadata.webgl).toBe(false);
      expect(result.content).toContain('# Content');
      expect(result.content).not.toContain('---');
    });

    it('should use default values for missing metadata', () => {
      const content = `---
title: "Test"
---

Content here.`;

      const result = parseMarkdown(content);

      expect(result.metadata.title).toBe('Test');
      expect(result.metadata.toc).toBe(true); // default
      expect(result.metadata.webgl).toBe(false); // default
      expect(result.metadata.description).toBeUndefined();
    });
  });

  describe('parseWithCache', () => {
    it('should cache parsed content', () => {
      const filePath = '/test/file.md';
      const content = '# Test\n\nContent';

      const result1 = parseWithCache(filePath, content);
      const result2 = parseWithCache(filePath, content);

      // Should return the same cached object
      expect(result1).toBe(result2);
    });

    it('should parse different files separately', () => {
      const file1 = '/test/file1.md';
      const file2 = '/test/file2.md';
      const content1 = '# File 1';
      const content2 = '# File 2';

      const result1 = parseWithCache(file1, content1);
      const result2 = parseWithCache(file2, content2);

      expect(result1).not.toBe(result2);
      expect(result1.content).toBe('# File 1');
      expect(result2.content).toBe('# File 2');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached content', () => {
      parseWithCache('/test/file1.md', '# Test 1');
      parseWithCache('/test/file2.md', '# Test 2');

      expect(getCacheStats().size).toBe(2);

      clearCache();

      expect(getCacheStats().size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats1 = getCacheStats();
      expect(stats1.size).toBe(0);
      expect(stats1.keys).toEqual([]);

      parseWithCache('/test/file1.md', '# Test 1');
      parseWithCache('/test/file2.md', '# Test 2');

      const stats2 = getCacheStats();
      expect(stats2.size).toBe(2);
      expect(stats2.keys).toContain('/test/file1.md');
      expect(stats2.keys).toContain('/test/file2.md');
    });
  });
});
