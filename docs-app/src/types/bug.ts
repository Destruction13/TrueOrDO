/**
 * Bug Tracker Type Definitions
 * Defines data models for the bug tracking system
 */

export type BugPriority = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

/**
 * Bug entry metadata stored in bugs.json
 */
export interface BugEntry {
  id: string;
  title: string;
  priority: BugPriority;
  status: BugStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  tags: string[];
  assignee?: string;
  reporter?: string;
  resolution?: string; // Краткий отчёт о решении
  markdownFile?: string; // Path to bug-XXX.md (optional for backward compatibility)
}

/**
 * Detailed bug information including description
 */
export interface BugDetail extends BugEntry {
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  attachments?: string[];
}

/**
 * Form data for creating/updating bugs
 */
export interface BugFormData {
  title: string;
  description: string;
  priority: BugPriority;
  status: BugStatus;
  tags?: string[];
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  assignee?: string;
  reporter?: string;
  resolution?: string;
}

/**
 * Database structure for bugs.json
 */
export interface BugsDatabase {
  bugs: BugEntry[];
  nextId: number;
  metadata: {
    lastUpdated: string;
    totalBugs: number;
    openBugs: number;
    resolvedBugs: number;
  };
}
