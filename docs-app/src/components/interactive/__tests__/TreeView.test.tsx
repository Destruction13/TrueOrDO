import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeView } from '../TreeView';
import type { TreeNodeData } from '../TreeView';

describe('TreeView', () => {
  const mockTreeData: TreeNodeData[] = [
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
      ],
    },
  ];

  it('should render tree structure', () => {
    render(<TreeView data={mockTreeData} />);
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
  });

  it('should expand node on click', async () => {
    const user = userEvent.setup();
    render(<TreeView data={mockTreeData} />);
    
    const usersNode = screen.getByText('Users');
    
    // Children should not be visible initially
    expect(screen.queryByText('/api/users')).not.toBeInTheDocument();
    
    // Click to expand
    await user.click(usersNode);
    
    // Children should now be visible
    expect(screen.getAllByText('/api/users')).toHaveLength(2);
  });

  it('should collapse expanded node on second click', async () => {
    const user = userEvent.setup();
    render(<TreeView data={mockTreeData} />);
    
    const usersNode = screen.getByText('Users');
    
    // Expand
    await user.click(usersNode);
    expect(screen.getAllByText('/api/users')).toHaveLength(2);
    
    // Collapse
    await user.click(usersNode);
    
    // After collapse, children are not rendered (AnimatePresence removes them)
    // Wait for animation to complete
    await waitFor(() => {
      expect(screen.queryAllByText('/api/users')).toHaveLength(0);
    });
  });

  it('should call onNodeClick when node is clicked', async () => {
    const user = userEvent.setup();
    const onNodeClick = vi.fn();
    render(<TreeView data={mockTreeData} onNodeClick={onNodeClick} />);
    
    const usersNode = screen.getByText('Users');
    await user.click(usersNode);
    
    expect(onNodeClick).toHaveBeenCalledWith(mockTreeData[0]);
  });

  it('should display HTTP method badges for endpoints', async () => {
    const user = userEvent.setup();
    render(<TreeView data={mockTreeData} />);
    
    // Expand to show endpoints
    await user.click(screen.getByText('Users'));
    
    // Check for GET and POST badges
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('should navigate with arrow down key', () => {
    render(<TreeView data={mockTreeData} />);
    
    const treeView = screen.getByRole('tree');
    treeView.focus();
    
    // Press arrow down
    fireEvent.keyDown(treeView, { key: 'ArrowDown' });
    
    // Focus should move to next node
    const authNode = screen.getByText('Authentication').closest('.tree-node');
    expect(authNode).toHaveClass('focused');
  });

  it('should navigate with arrow up key', () => {
    render(<TreeView data={mockTreeData} />);
    
    const treeView = screen.getByRole('tree');
    treeView.focus();
    
    // Move down first
    fireEvent.keyDown(treeView, { key: 'ArrowDown' });
    
    // Then move up
    fireEvent.keyDown(treeView, { key: 'ArrowUp' });
    
    // Focus should be back on first node
    const usersNode = screen.getByText('Users').closest('.tree-node');
    expect(usersNode).toHaveClass('focused');
  });

  it('should expand node with arrow right key', () => {
    render(<TreeView data={mockTreeData} />);
    
    const treeView = screen.getByRole('tree');
    treeView.focus();
    
    // Press arrow right to expand
    fireEvent.keyDown(treeView, { key: 'ArrowRight' });
    
    // Children should be visible
    expect(screen.getAllByText('/api/users')).toHaveLength(2);
  });

  it('should collapse node with arrow left key', async () => {
    render(<TreeView data={mockTreeData} />);
    
    const treeView = screen.getByRole('tree');
    treeView.focus();
    
    // Expand first
    fireEvent.keyDown(treeView, { key: 'ArrowRight' });
    expect(screen.getAllByText('/api/users')).toHaveLength(2);
    
    // Collapse
    fireEvent.keyDown(treeView, { key: 'ArrowLeft' });
    // After collapse, children are not rendered (AnimatePresence removes them)
    // Wait for animation to complete
    await waitFor(() => {
      expect(screen.queryAllByText('/api/users')).toHaveLength(0);
    });
  });

  it('should activate node with Enter key', () => {
    const onNodeClick = vi.fn();
    render(<TreeView data={mockTreeData} onNodeClick={onNodeClick} />);
    
    const treeView = screen.getByRole('tree');
    treeView.focus();
    
    // Press Enter
    fireEvent.keyDown(treeView, { key: 'Enter' });
    
    expect(onNodeClick).toHaveBeenCalledWith(mockTreeData[0]);
  });

  it('should activate node with Space key', () => {
    const onNodeClick = vi.fn();
    render(<TreeView data={mockTreeData} onNodeClick={onNodeClick} />);
    
    const treeView = screen.getByRole('tree');
    treeView.focus();
    
    // Press Space
    fireEvent.keyDown(treeView, { key: ' ' });
    
    expect(onNodeClick).toHaveBeenCalledWith(mockTreeData[0]);
  });

  it('should have proper ARIA attributes', () => {
    render(<TreeView data={mockTreeData} />);
    
    const treeView = screen.getByRole('tree');
    expect(treeView).toHaveAttribute('aria-label', 'API navigation tree');
    
    const treeItems = screen.getAllByRole('treeitem');
    expect(treeItems.length).toBeGreaterThan(0);
    
    // Check that parent nodes have aria-expanded
    const usersNode = screen.getByText('Users').closest('[role="treeitem"]');
    expect(usersNode).toHaveAttribute('aria-expanded');
  });

  it('should render nested tree structure correctly', async () => {
    const user = userEvent.setup();
    const nestedData: TreeNodeData[] = [
      {
        id: 'api',
        label: 'API',
        children: [
          {
            id: 'v1',
            label: 'v1',
            children: [
              {
                id: 'users',
                label: '/api/v1/users',
                method: 'GET',
              },
            ],
          },
        ],
      },
    ];
    
    render(<TreeView data={nestedData} />);
    
    // Expand first level
    await user.click(screen.getByText('API'));
    expect(screen.getByText('v1')).toBeInTheDocument();
    
    // Expand second level
    await user.click(screen.getByText('v1'));
    expect(screen.getByText('/api/v1/users')).toBeInTheDocument();
  });

  it('should handle empty tree data', () => {
    render(<TreeView data={[]} />);
    
    const treeView = screen.getByRole('tree');
    expect(treeView).toBeInTheDocument();
    expect(screen.queryByRole('treeitem')).not.toBeInTheDocument();
  });

  it('should handle nodes without children', () => {
    const leafData: TreeNodeData[] = [
      {
        id: 'endpoint',
        label: '/api/endpoint',
        method: 'GET',
      },
    ];
    
    render(<TreeView data={leafData} />);
    
    expect(screen.getByText('/api/endpoint')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });
});
