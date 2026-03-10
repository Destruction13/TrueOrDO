/**
 * Bug Tracker Module
 * Manages bug creation, retrieval, updates, and deletion via backend API
 */

import type { BugEntry, BugDetail, BugFormData } from '../../types/bug';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get all bugs
 */
export async function getAllBugs(): Promise<BugEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bugs`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load bugs: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading bugs:', error);
    throw error;
  }
}

/**
 * Get bug by ID
 */
export async function getBugById(id: string): Promise<BugDetail | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bugs/${id}`, {
      credentials: 'include'
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load bug: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error loading bug ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new bug
 */
export async function createBug(data: BugFormData): Promise<BugEntry> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bugs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create bug');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating bug:', error);
    throw error;
  }
}

/**
 * Update an existing bug
 */
export async function updateBug(id: string, data: Partial<BugFormData>): Promise<BugEntry> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bugs/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (response.status === 404) {
      throw new Error(`Bug ${id} not found`);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update bug');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating bug ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a bug
 */
export async function deleteBug(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bugs/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.status === 404) {
      throw new Error(`Bug ${id} not found`);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete bug');
    }
  } catch (error) {
    console.error(`Error deleting bug ${id}:`, error);
    throw error;
  }
}
