/**
 * BugTracker Module Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBug, getAllBugs, getBugById, updateBug, deleteBug } from '../BugTracker';
import type { BugFormData } from '../../../types/bug';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
(globalThis as any).fetch = vi.fn();

describe('BugTracker', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('createBug', () => {
    it('should create a new bug with valid data', async () => {
      const bugData: BugFormData = {
        title: 'Test Bug',
        description: 'This is a test bug',
        priority: 'high',
        status: 'open',
        tags: ['test', 'bug']
      };

      // Mock fetch to return empty database
      ((globalThis as any).fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const bug = await createBug(bugData);

      expect(bug).toBeDefined();
      expect(bug.id).toBe('001');
      expect(bug.title).toBe('Test Bug');
      expect(bug.priority).toBe('high');
      expect(bug.status).toBe('open');
      expect(bug.tags).toEqual(['test', 'bug']);
      expect(bug.markdownFile).toBe('bug-001.md');
    });

    it('should throw error if title is empty', async () => {
      const bugData: BugFormData = {
        title: '',
        description: 'This is a test bug',
        priority: 'medium',
        status: 'open'
      };

      await expect(createBug(bugData)).rejects.toThrow('Title is required');
    });

    it('should increment bug ID for multiple bugs', async () => {
      // Mock fetch to return empty database
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      const bug1 = await createBug({
        title: 'Bug 1',
        description: 'First bug',
        priority: 'low',
        status: 'open'
      });

      const bug2 = await createBug({
        title: 'Bug 2',
        description: 'Second bug',
        priority: 'medium',
        status: 'open'
      });

      expect(bug1.id).toBe('001');
      expect(bug2.id).toBe('002');
    });
  });

  describe('getAllBugs', () => {
    it('should return empty array when no bugs exist', async () => {
      // Mock fetch to return empty database
      ((globalThis as any).fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const bugs = await getAllBugs();

      expect(bugs).toEqual([]);
    });

    it('should return all bugs from database', async () => {
      // Create some bugs first
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      await createBug({
        title: 'Bug 1',
        description: 'First bug',
        priority: 'low',
        status: 'open'
      });

      await createBug({
        title: 'Bug 2',
        description: 'Second bug',
        priority: 'high',
        status: 'in-progress'
      });

      const bugs = await getAllBugs();

      expect(bugs).toHaveLength(2);
      expect(bugs[0].title).toBe('Bug 1');
      expect(bugs[1].title).toBe('Bug 2');
    });
  });

  describe('getBugById', () => {
    it('should return null for non-existent bug', async () => {
      ((globalThis as any).fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const bug = await getBugById('999');

      expect(bug).toBeNull();
    });

    it('should return bug detail for existing bug', async () => {
      // Create a bug first
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      const createdBug = await createBug({
        title: 'Test Bug',
        description: 'Test description',
        priority: 'medium',
        status: 'open'
      });

      const bug = await getBugById(createdBug.id);

      expect(bug).toBeDefined();
      expect(bug?.id).toBe(createdBug.id);
      expect(bug?.title).toBe('Test Bug');
    });
  });

  describe('updateBug', () => {
    it('should update bug fields', async () => {
      // Create a bug first
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      const createdBug = await createBug({
        title: 'Original Title',
        description: 'Original description',
        priority: 'low',
        status: 'open'
      });

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedBug = await updateBug(createdBug.id, {
        title: 'Updated Title',
        priority: 'high',
        status: 'in-progress'
      });

      expect(updatedBug.title).toBe('Updated Title');
      expect(updatedBug.priority).toBe('high');
      expect(updatedBug.status).toBe('in-progress');
      expect(updatedBug.updatedAt).not.toBe(createdBug.updatedAt);
    });

    it('should throw error for non-existent bug', async () => {
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(updateBug('999', { title: 'New Title' })).rejects.toThrow('Bug 999 not found');
    });
  });

  describe('deleteBug', () => {
    it('should delete existing bug', async () => {
      // Create a bug first
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      const createdBug = await createBug({
        title: 'Bug to Delete',
        description: 'This will be deleted',
        priority: 'low',
        status: 'open'
      });

      await deleteBug(createdBug.id);

      const bugs = await getAllBugs();
      expect(bugs).toHaveLength(0);
    });

    it('should throw error for non-existent bug', async () => {
      ((globalThis as any).fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(deleteBug('999')).rejects.toThrow('Bug 999 not found');
    });
  });
});
