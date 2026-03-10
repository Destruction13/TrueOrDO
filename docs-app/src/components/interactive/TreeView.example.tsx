/**
 * TreeView Component Example
 * 
 * This file demonstrates how to use the TreeView component for API navigation.
 * It shows the tree structure with HTTP method badges and keyboard navigation support.
 */

import React from 'react';
import { TreeView } from './TreeView';
import type { TreeNodeData } from './TreeView';

// Example API tree data structure
const apiTreeData: TreeNodeData[] = [
  {
    id: 'users',
    label: 'Users',
    children: [
      {
        id: 'get-users',
        label: '/api/users',
        path: '/api/users',
        method: 'GET',
      },
      {
        id: 'create-user',
        label: '/api/users',
        path: '/api/users',
        method: 'POST',
      },
      {
        id: 'get-user',
        label: '/api/users/:id',
        path: '/api/users/:id',
        method: 'GET',
      },
      {
        id: 'update-user',
        label: '/api/users/:id',
        path: '/api/users/:id',
        method: 'PUT',
      },
      {
        id: 'delete-user',
        label: '/api/users/:id',
        path: '/api/users/:id',
        method: 'DELETE',
      },
    ],
  },
  {
    id: 'auth',
    label: 'Authentication',
    children: [
      {
        id: 'login',
        label: '/api/auth/login',
        path: '/api/auth/login',
        method: 'POST',
      },
      {
        id: 'logout',
        label: '/api/auth/logout',
        path: '/api/auth/logout',
        method: 'POST',
      },
      {
        id: 'refresh',
        label: '/api/auth/refresh',
        path: '/api/auth/refresh',
        method: 'POST',
      },
    ],
  },
  {
    id: 'games',
    label: 'Games',
    children: [
      {
        id: 'get-games',
        label: '/api/games',
        path: '/api/games',
        method: 'GET',
      },
      {
        id: 'create-game',
        label: '/api/games',
        path: '/api/games',
        method: 'POST',
      },
      {
        id: 'game-details',
        label: 'Game Details',
        children: [
          {
            id: 'get-game',
            label: '/api/games/:id',
            path: '/api/games/:id',
            method: 'GET',
          },
          {
            id: 'update-game',
            label: '/api/games/:id',
            path: '/api/games/:id',
            method: 'PUT',
          },
          {
            id: 'delete-game',
            label: '/api/games/:id',
            path: '/api/games/:id',
            method: 'DELETE',
          },
        ],
      },
    ],
  },
];

export const TreeViewExample: React.FC = () => {
  const handleNodeClick = (node: TreeNodeData) => {
    console.log('Node clicked:', node);
    
    // In a real application, you would navigate to the endpoint details page
    if (node.path) {
      // Example: navigate to endpoint documentation
      // router.push(`/api-docs${node.path}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>API Navigation Tree</h2>
      <p>
        Click on nodes to expand/collapse. Use keyboard navigation:
      </p>
      <ul>
        <li><kbd>↑</kbd> / <kbd>↓</kbd> - Navigate between nodes</li>
        <li><kbd>→</kbd> - Expand node or move to first child</li>
        <li><kbd>←</kbd> - Collapse node or move to parent</li>
        <li><kbd>Enter</kbd> / <kbd>Space</kbd> - Activate node</li>
      </ul>
      
      <TreeView data={apiTreeData} onNodeClick={handleNodeClick} />
    </div>
  );
};

export default TreeViewExample;
