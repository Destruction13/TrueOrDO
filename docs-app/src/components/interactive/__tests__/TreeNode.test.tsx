import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeNode } from '../TreeNode';
import type { TreeNodeData } from '../TreeView';

describe('TreeNode', () => {
  const mockNode: TreeNodeData = {
    id: 'test-node',
    label: 'Test Node',
    path: '/test',
  };

  const mockNodeWithChildren: TreeNodeData = {
    id: 'parent-node',
    label: 'Parent Node',
    children: [
      {
        id: 'child-node',
        label: 'Child Node',
      },
    ],
  };

  const mockEndpointNode: TreeNodeData = {
    id: 'endpoint',
    label: '/api/users',
    path: '/api/users',
    method: 'GET',
  };

  it('should render node label', () => {
    render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('should render toggle button for nodes with children', () => {
    render(
      <TreeNode
        node={mockNodeWithChildren}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const toggleButton = screen.getByRole('button', { name: /expand/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should not render toggle button for leaf nodes', () => {
    render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onToggle when toggle button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    
    render(
      <TreeNode
        node={mockNodeWithChildren}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={onToggle}
        onClick={vi.fn()}
      />
    );
    
    const toggleButton = screen.getByRole('button', { name: /expand/i });
    await user.click(toggleButton);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when node is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={onClick}
      />
    );
    
    await user.click(screen.getByText('Test Node'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should display HTTP method badge for endpoint nodes', () => {
    render(
      <TreeNode
        node={mockEndpointNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByLabelText('HTTP GET method')).toBeInTheDocument();
  });

  it('should apply correct color to GET method badge', () => {
    render(
      <TreeNode
        node={mockEndpointNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const badge = screen.getByText('GET').closest('.tree-node-method-badge');
    expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' }); // blue
  });

  it('should apply correct color to POST method badge', () => {
    const postNode: TreeNodeData = {
      ...mockEndpointNode,
      method: 'POST',
    };
    
    render(
      <TreeNode
        node={postNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const badge = screen.getByText('POST').closest('.tree-node-method-badge');
    expect(badge).toHaveStyle({ backgroundColor: '#10b981' }); // green
  });

  it('should apply correct color to PUT method badge', () => {
    const putNode: TreeNodeData = {
      ...mockEndpointNode,
      method: 'PUT',
    };
    
    render(
      <TreeNode
        node={putNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const badge = screen.getByText('PUT').closest('.tree-node-method-badge');
    expect(badge).toHaveStyle({ backgroundColor: '#f59e0b' }); // yellow
  });

  it('should apply correct color to DELETE method badge', () => {
    const deleteNode: TreeNodeData = {
      ...mockEndpointNode,
      method: 'DELETE',
    };
    
    render(
      <TreeNode
        node={deleteNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const badge = screen.getByText('DELETE').closest('.tree-node-method-badge');
    expect(badge).toHaveStyle({ backgroundColor: '#ef4444' }); // red
  });

  it('should apply focused class when isFocused is true', () => {
    render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={true}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const treeNode = screen.getByText('Test Node').closest('.tree-node');
    expect(treeNode).toHaveClass('focused');
  });

  it('should apply expanded class to toggle button when isExpanded is true', () => {
    render(
      <TreeNode
        node={mockNodeWithChildren}
        level={0}
        isExpanded={true}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    expect(toggleButton).toHaveClass('expanded');
  });

  it('should apply correct indentation based on level', () => {
    const { rerender } = render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    let treeNode = screen.getByText('Test Node').closest('.tree-node');
    expect(treeNode).toHaveStyle({ paddingLeft: '0px' });
    
    rerender(
      <TreeNode
        node={mockNode}
        level={2}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    treeNode = screen.getByText('Test Node').closest('.tree-node');
    expect(treeNode).toHaveStyle({ paddingLeft: '40px' });
  });

  it('should render children when provided', () => {
    render(
      <TreeNode
        node={mockNodeWithChildren}
        level={0}
        isExpanded={true}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      >
        <div data-testid="child-content">Child Content</div>
      </TreeNode>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <TreeNode
        node={mockNodeWithChildren}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const treeItem = screen.getByRole('treeitem');
    expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    expect(treeItem).toHaveAttribute('aria-level', '1');
  });

  it('should handle keyboard Enter key', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={true}
        onToggle={vi.fn()}
        onClick={onClick}
      />
    );
    
    const treeItem = screen.getByRole('treeitem');
    await user.type(treeItem, '{Enter}');
    
    expect(onClick).toHaveBeenCalled();
  });

  it('should handle keyboard Space key', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(
      <TreeNode
        node={mockNode}
        level={0}
        isExpanded={false}
        isFocused={true}
        onToggle={vi.fn()}
        onClick={onClick}
      />
    );
    
    const treeItem = screen.getByRole('treeitem');
    await user.type(treeItem, ' ');
    
    expect(onClick).toHaveBeenCalled();
  });

  it('should apply endpoint class for nodes with method', () => {
    render(
      <TreeNode
        node={mockEndpointNode}
        level={0}
        isExpanded={false}
        isFocused={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    const treeNode = screen.getByText('/api/users').closest('.tree-node');
    expect(treeNode).toHaveClass('endpoint');
  });
});
