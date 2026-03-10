/**
 * MCP Server Integration Module
 * 
 * Provides integration with MCP servers for enhanced functionality
 * Includes graceful degradation when servers are unavailable
 * 
 * Validates: Requirements 17.1, 17.2, 17.4
 */

interface MCPConfig {
  enabled: boolean;
  endpoint: string;
  timeout?: number;
}

interface MCPServerConfig {
  deepcontext?: MCPConfig;
  mem0?: MCPConfig;
  puppeteer?: MCPConfig;
}

/**
 * Default MCP configuration
 */
const defaultConfig: MCPServerConfig = {
  deepcontext: {
    enabled: false, // Disabled by default, enable when server is available
    endpoint: 'http://localhost:3001',
    timeout: 5000,
  },
  mem0: {
    enabled: false,
    endpoint: 'http://localhost:3002',
    timeout: 5000,
  },
  puppeteer: {
    enabled: false,
    endpoint: 'http://localhost:3003',
    timeout: 5000,
  },
};

/**
 * MCP Integration class
 * Manages connections to MCP servers
 */
export class MCPIntegration {
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Check if a specific MCP server is available
   */
  async isAvailable(server: keyof MCPServerConfig): Promise<boolean> {
    const serverConfig = this.config[server];
    if (!serverConfig || !serverConfig.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${serverConfig.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(serverConfig.timeout || 5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Index content with deepcontext MCP server
   */
  async indexWithDeepContext(documents: any[]): Promise<boolean> {
    if (!this.config.deepcontext?.enabled) {
      console.warn('deepcontext MCP server is not enabled');
      return false;
    }

    try {
      const response = await fetch(`${this.config.deepcontext.endpoint}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
        signal: AbortSignal.timeout(this.config.deepcontext.timeout || 5000),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to index with deepcontext:', error);
      return false;
    }
  }

  /**
   * Search with deepcontext MCP server
   */
  async searchWithDeepContext(query: string): Promise<any[]> {
    if (!this.config.deepcontext?.enabled) {
      console.warn('deepcontext MCP server is not enabled, using local search');
      return [];
    }

    try {
      const response = await fetch(
        `${this.config.deepcontext.endpoint}/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(this.config.deepcontext.timeout || 5000),
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to search with deepcontext:', error);
      return [];
    }
  }

  /**
   * Save context with mem0 MCP server
   */
  async saveContext(key: string, value: any): Promise<boolean> {
    if (!this.config.mem0?.enabled) {
      // Fallback to localStorage
      try {
        localStorage.setItem(`mcp_context_${key}`, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    try {
      const response = await fetch(`${this.config.mem0.endpoint}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
        signal: AbortSignal.timeout(this.config.mem0.timeout || 5000),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to save context with mem0:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem(`mcp_context_${key}`, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Load context from mem0 MCP server
   */
  async loadContext(key: string): Promise<any | null> {
    if (!this.config.mem0?.enabled) {
      // Fallback to localStorage
      try {
        const value = localStorage.getItem(`mcp_context_${key}`);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    }

    try {
      const response = await fetch(
        `${this.config.mem0.endpoint}/context/${encodeURIComponent(key)}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(this.config.mem0.timeout || 5000),
        }
      );

      if (!response.ok) {
        throw new Error(`Load context failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to load context with mem0:', error);
      // Fallback to localStorage
      try {
        const value = localStorage.getItem(`mcp_context_${key}`);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    }
  }
}

// Global MCP integration instance
export const mcpIntegration = new MCPIntegration();
