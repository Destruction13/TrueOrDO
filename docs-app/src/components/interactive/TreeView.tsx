import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TreeNode } from './TreeNode';
import './TreeView.css';

export interface TreeNodeData {
  id: string;
  label: string;
  path?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  children?: TreeNodeData[];
}

export interface TreeViewProps {
  data: TreeNodeData[];
  onNodeClick?: (node: TreeNodeData) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({ data, onNodeClick }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  // Flatten tree for keyboard navigation
  const flattenTree = useCallback((nodes: TreeNodeData[], level = 0): Array<{ node: TreeNodeData; level: number }> => {
    const result: Array<{ node: TreeNodeData; level: number }> = [];
    
    for (const node of nodes) {
      result.push({ node, level });
      if (node.children && expandedNodes.has(node.id)) {
        result.push(...flattenTree(node.children, level + 1));
      }
    }
    
    return result;
  }, [expandedNodes]);

  const flatNodes = flattenTree(data);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeClick = useCallback((node: TreeNodeData) => {
    if (node.children && node.children.length > 0) {
      toggleNode(node.id);
    }
    if (onNodeClick) {
      onNodeClick(node);
    }
    setFocusedNodeId(node.id);
  }, [toggleNode, onNodeClick]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedNodeId || flatNodes.length === 0) return;

      const currentIndex = flatNodes.findIndex(({ node }) => node.id === focusedNodeId);
      if (currentIndex === -1) return;

      const currentNode = flatNodes[currentIndex].node;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < flatNodes.length - 1) {
            setFocusedNodeId(flatNodes[currentIndex + 1].node.id);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedNodeId(flatNodes[currentIndex - 1].node.id);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (currentNode.children && currentNode.children.length > 0) {
            if (!expandedNodes.has(currentNode.id)) {
              toggleNode(currentNode.id);
            } else if (currentIndex < flatNodes.length - 1) {
              // Move to first child
              setFocusedNodeId(flatNodes[currentIndex + 1].node.id);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (expandedNodes.has(currentNode.id) && currentNode.children && currentNode.children.length > 0) {
            // Collapse if expanded
            toggleNode(currentNode.id);
          } else {
            // Move to parent
            const parentIndex = flatNodes.slice(0, currentIndex).reverse().findIndex(
              ({ level }) => level < flatNodes[currentIndex].level
            );
            if (parentIndex !== -1) {
              const actualParentIndex = currentIndex - parentIndex - 1;
              setFocusedNodeId(flatNodes[actualParentIndex].node.id);
            }
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          handleNodeClick(currentNode);
          break;
      }
    };

    if (treeRef.current) {
      treeRef.current.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (treeRef.current) {
        treeRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [focusedNodeId, flatNodes, expandedNodes, toggleNode, handleNodeClick]);

  // Set initial focus
  useEffect(() => {
    if (!focusedNodeId && flatNodes.length > 0) {
      setFocusedNodeId(flatNodes[0].node.id);
    }
  }, [focusedNodeId, flatNodes]);

  const renderTree = (nodes: TreeNodeData[], level = 0): React.ReactNode => {
    return nodes.map(node => (
      <TreeNode
        key={node.id}
        node={node}
        level={level}
        isExpanded={expandedNodes.has(node.id)}
        isFocused={focusedNodeId === node.id}
        onToggle={() => toggleNode(node.id)}
        onClick={() => handleNodeClick(node)}
      >
        {node.children && renderTree(node.children, level + 1)}
      </TreeNode>
    ));
  };

  return (
    <div 
      ref={treeRef}
      className="tree-view" 
      role="tree"
      tabIndex={0}
      aria-label="API navigation tree"
    >
      {renderTree(data)}
    </div>
  );
};
