import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { expandCollapse } from '../../lib/animation/variants';
import type { TreeNodeData } from './TreeView';
import './TreeNode.css';

export interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  isExpanded: boolean;
  isFocused: boolean;
  onToggle: () => void;
  onClick: () => void;
  children?: React.ReactNode;
}

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: '#3b82f6',    // blue
  POST: '#10b981',   // green
  PUT: '#f59e0b',    // yellow/amber
  DELETE: '#ef4444', // red
};

const HTTP_METHOD_ICONS: Record<string, string> = {
  GET: '↓',
  POST: '+',
  PUT: '↻',
  DELETE: '×',
};

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isExpanded,
  isFocused,
  onToggle,
  onClick,
  children,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const indentStyle = { paddingLeft: `${level * 20}px` };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className="tree-node-container">
      <div
        className={`tree-node ${isFocused ? 'focused' : ''} ${node.method ? 'endpoint' : ''}`}
        style={indentStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={level + 1}
        tabIndex={isFocused ? 0 : -1}
      >
        {hasChildren && (
          <motion.button
            className={`tree-node-toggle ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggleClick}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            tabIndex={-1}
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
        
        {!hasChildren && <span className="tree-node-spacer" />}

        {node.method && (
          <span
            className="tree-node-method-badge"
            style={{
              backgroundColor: HTTP_METHOD_COLORS[node.method],
            }}
            aria-label={`HTTP ${node.method} method`}
          >
            <span className="tree-node-method-icon">{HTTP_METHOD_ICONS[node.method]}</span>
            <span className="tree-node-method-text">{node.method}</span>
          </span>
        )}

        <span className="tree-node-label">{node.label}</span>
      </div>

      <AnimatePresence initial={false}>
        {children && isExpanded && (
          <motion.div
            className="tree-node-children"
            role="group"
            variants={expandCollapse}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
