/**
 * Integration with mem0 MCP server for context persistence
 */
export class Mem0Integration {
  constructor(_userId: string = 'docs-app-user') {
    // userId stored for future MCP integration
  }

  /**
   * Store navigation history
   */
  async storeNavigationHistory(path: string, title: string): Promise<void> {
    try {
      // Note: This would integrate with the mem0 MCP server
      // For now, we'll use localStorage as a fallback
      
      // In a real implementation:
      // await mcp_mem0_mcp_add_memory({
      //   content,
      //   userId: this.userId
      // });

      // Fallback to localStorage
      const history = this.getLocalNavigationHistory();
      history.push({
        path,
        title,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 entries
      const recentHistory = history.slice(-50);
      localStorage.setItem('navigation-history', JSON.stringify(recentHistory));

      console.log('[Mem0] Stored navigation:', path);
    } catch (error) {
      console.error('[Mem0] Failed to store navigation:', error);
    }
  }

  /**
   * Store user preferences
   */
  async storePreference(key: string, value: any): Promise<void> {
    try {
      // In a real implementation:
      // await mcp_mem0_mcp_add_memory({
      //   content,
      //   userId: this.userId
      // });

      // Fallback to localStorage
      const preferences = this.getLocalPreferences();
      preferences[key] = value;
      localStorage.setItem('user-preferences', JSON.stringify(preferences));

      console.log('[Mem0] Stored preference:', key, value);
    } catch (error) {
      console.error('[Mem0] Failed to store preference:', error);
    }
  }

  /**
   * Get user preference
   */
  async getPreference(key: string): Promise<any> {
    try {
      // In a real implementation:
      // const results = await mcp_mem0_mcp_search_memories({
      //   query: `User preference: ${key}`,
      //   userId: this.userId
      // });
      // return results[0]?.value;

      // Fallback to localStorage
      const preferences = this.getLocalPreferences();
      return preferences[key];
    } catch (error) {
      console.error('[Mem0] Failed to get preference:', error);
      return null;
    }
  }

  /**
   * Store reading progress
   */
  async storeReadingProgress(path: string, progress: number): Promise<void> {
    try {
      // In a real implementation:
      // await mcp_mem0_mcp_add_memory({
      //   content,
      //   userId: this.userId
      // });

      // Fallback to localStorage
      const progressData = this.getLocalReadingProgress();
      progressData[path] = {
        progress,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('reading-progress', JSON.stringify(progressData));

      console.log('[Mem0] Stored reading progress:', path, progress);
    } catch (error) {
      console.error('[Mem0] Failed to store reading progress:', error);
    }
  }

  /**
   * Get reading progress for a path
   */
  async getReadingProgress(path: string): Promise<number> {
    try {
      // In a real implementation:
      // const results = await mcp_mem0_mcp_search_memories({
      //   query: `Reading progress for ${path}`,
      //   userId: this.userId
      // });
      // return results[0]?.progress || 0;

      // Fallback to localStorage
      const progressData = this.getLocalReadingProgress();
      return progressData[path]?.progress || 0;
    } catch (error) {
      console.error('[Mem0] Failed to get reading progress:', error);
      return 0;
    }
  }

  /**
   * Get navigation history
   */
  async getNavigationHistory(limit: number = 10): Promise<Array<{ path: string; title: string; timestamp: string }>> {
    try {
      // In a real implementation:
      // const results = await mcp_mem0_mcp_search_memories({
      //   query: 'User navigated to',
      //   userId: this.userId
      // });
      // return results.slice(0, limit);

      // Fallback to localStorage
      const history = this.getLocalNavigationHistory();
      return history.slice(-limit).reverse();
    } catch (error) {
      console.error('[Mem0] Failed to get navigation history:', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem('navigation-history');
      localStorage.removeItem('user-preferences');
      localStorage.removeItem('reading-progress');
      console.log('[Mem0] Cleared all data');
    } catch (error) {
      console.error('[Mem0] Failed to clear data:', error);
    }
  }

  // Helper methods for localStorage fallback
  private getLocalNavigationHistory(): Array<{ path: string; title: string; timestamp: string }> {
    try {
      const data = localStorage.getItem('navigation-history');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private getLocalPreferences(): Record<string, any> {
    try {
      const data = localStorage.getItem('user-preferences');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private getLocalReadingProgress(): Record<string, { progress: number; timestamp: string }> {
    try {
      const data = localStorage.getItem('reading-progress');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
}

// Singleton instance
export const mem0Service = new Mem0Integration();
