/**
 * ApiPage component
 * Main page for API documentation section with tree navigation
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pageTransition } from '../lib/animation/variants';
import type { TreeNodeData } from '../components/interactive/TreeView';
import { TreeView } from '../components/interactive/TreeView';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ErrorMessage } from '../components/ErrorMessage';
import { Breadcrumbs, TableOfContents } from '../components/layout';
import { useMarkdownLoader } from '../hooks/useMarkdownLoader';
import { useLanguage } from '../contexts/LanguageContext';
import './ApiPage.css';

export const ApiPage: React.FC = () => {
  const navigate = useNavigate();
  const { translate } = useLanguage();
  
  // Fallback content for when the file cannot be loaded
  const fallbackContent = `# API Documentation

## REST API Endpoints

The TrueOrDO API provides comprehensive REST endpoints and Socket.IO events for real-time communication.

### Authentication

Authentication endpoints handle user registration, login, and OAuth integration.

**POST /api/auth/register**
- Register a new user account
- Request: \`{ email, password, nickname }\`
- Response: \`{ user }\`

**POST /api/auth/login**
- Authenticate user and create session
- Request: \`{ email, password }\`
- Response: \`{ user }\`

**GET /api/auth/me**
- Get current authenticated user
- Auth: Required
- Response: \`{ user }\`

### Profile & Customization

Manage user profiles, avatars, and customization options.

**GET /api/me**
- Get user profile
- Auth: Required

**PATCH /api/me**
- Update user profile
- Auth: Required
- Request: \`{ nickname?, bio?, biography? }\`

**POST /api/me/avatar**
- Upload user avatar
- Auth: Required
- Content-Type: multipart/form-data

### Stats & Achievements

Track user statistics and achievements.

**GET /api/me/stats**
- Get user statistics
- Auth: Required

**GET /api/me/achievements**
- Get user achievements
- Auth: Required

### Subscription

Manage premium subscriptions and payments.

**GET /api/subscription/status**
- Get subscription status
- Auth: Required

**POST /api/subscription/create**
- Create new subscription
- Auth: Required
- Request: \`{ tier, duration }\`

## Socket.IO Events

Real-time communication using Socket.IO.

### Connection Events

- \`connect\` - Client connects to server
- \`disconnect\` - Client disconnects
- \`error\` - Error occurred

### Room Management

- \`room:create\` - Create a new game room
- \`room:join\` - Join existing room
- \`room:leave\` - Leave current room
- \`room:state\` - Get room state

---

*Note: This is fallback content. The full API documentation could not be loaded.*
`;

  const { content, loading, error, filePath, loadMarkdown, retry } = useMarkdownLoader({
    fallbackContent,
    onError: (err, path) => {
      console.error(`Failed to load markdown from ${path}:`, err);
    },
    onSuccess: (_content, path) => {
      console.log(`Successfully loaded markdown from ${path}`);
    },
  });

  // API tree structure based on the API documentation
  const apiTree: TreeNodeData[] = [
    {
      id: 'rest-api',
      label: 'REST API',
      children: [
        {
          id: 'auth',
          label: 'Authentication',
          children: [
            { id: 'auth-register', label: 'Register', method: 'POST', path: '/api/auth/register' },
            { id: 'auth-login', label: 'Login', method: 'POST', path: '/api/auth/login' },
            { id: 'auth-logout', label: 'Logout', method: 'POST', path: '/api/auth/logout' },
            { id: 'auth-me', label: 'Current User', method: 'GET', path: '/api/auth/me' },
            { id: 'auth-verify', label: 'Verify Email', method: 'GET', path: '/api/auth/verify-email' },
            { id: 'auth-resend', label: 'Resend Verification', method: 'POST', path: '/api/auth/resend-verification' },
            { id: 'auth-forgot', label: 'Forgot Password', method: 'POST', path: '/api/auth/forgot-password' },
            { id: 'auth-reset', label: 'Reset Password', method: 'POST', path: '/api/auth/reset-password' },
          ]
        },
        {
          id: 'oauth',
          label: 'OAuth',
          children: [
            { id: 'oauth-discord', label: 'Discord OAuth', method: 'GET', path: '/api/auth/discord' },
            { id: 'oauth-discord-callback', label: 'Discord Callback', method: 'GET', path: '/api/auth/discord/callback' },
            { id: 'oauth-google', label: 'Google OAuth', method: 'GET', path: '/api/auth/google' },
            { id: 'oauth-google-callback', label: 'Google Callback', method: 'GET', path: '/api/auth/google/callback' },
          ]
        },
        {
          id: 'profile',
          label: 'Profile & Customization',
          children: [
            { id: 'profile-get', label: 'Get Profile', method: 'GET', path: '/api/me' },
            { id: 'profile-update', label: 'Update Profile', method: 'PATCH', path: '/api/me' },
            { id: 'profile-avatar', label: 'Upload Avatar', method: 'POST', path: '/api/me/avatar' },
            { id: 'profile-customization-get', label: 'Get Customization', method: 'GET', path: '/api/me/customization' },
            { id: 'profile-customization-update', label: 'Update Customization', method: 'PATCH', path: '/api/me/customization' },
            { id: 'profile-frames', label: 'Avatar Frames', method: 'GET', path: '/api/frames' },
            { id: 'profile-gradients', label: 'Nickname Gradients', method: 'GET', path: '/api/nickname-gradients' },
            { id: 'profile-glows', label: 'Nickname Glows', method: 'GET', path: '/api/nickname-glows' },
            { id: 'profile-effects', label: 'Nickname Effects', method: 'GET', path: '/api/nickname-effects' },
          ]
        },
        {
          id: 'stats',
          label: 'Stats & Achievements',
          children: [
            { id: 'stats-get', label: 'Get Stats', method: 'GET', path: '/api/me/stats' },
            { id: 'stats-achievements', label: 'User Achievements', method: 'GET', path: '/api/me/achievements' },
            { id: 'stats-all-achievements', label: 'All Achievements', method: 'GET', path: '/api/achievements' },
            { id: 'stats-featured', label: 'Featured Achievements', method: 'PATCH', path: '/api/me/achievements/featured' },
          ]
        },
        {
          id: 'subscription',
          label: 'Subscription',
          children: [
            { id: 'sub-status', label: 'Subscription Status', method: 'GET', path: '/api/subscription/status' },
            { id: 'sub-plans', label: 'Subscription Plans', method: 'GET', path: '/api/subscription/plans' },
            { id: 'sub-create', label: 'Create Subscription', method: 'POST', path: '/api/subscription/create' },
            { id: 'sub-cancel', label: 'Cancel Subscription', method: 'POST', path: '/api/subscription/cancel' },
            { id: 'sub-history', label: 'Payment History', method: 'GET', path: '/api/subscription/payments/history' },
            { id: 'sub-webhook', label: 'Payment Webhook', method: 'POST', path: '/api/subscription/payments/webhook' },
          ]
        },
        {
          id: 'utility',
          label: 'Utility',
          children: [
            { id: 'util-health', label: 'Health Check', method: 'GET', path: '/api/health' },
            { id: 'util-wheels', label: 'ToD Wheels', method: 'GET', path: '/api/wheels' },
          ]
        }
      ]
    },
    {
      id: 'socketio',
      label: 'Socket.IO Events',
      children: [
        {
          id: 'socket-connection',
          label: 'Connection',
          children: [
            { id: 'socket-connect', label: 'connect', path: 'socket:connect' },
            { id: 'socket-disconnect', label: 'disconnect', path: 'socket:disconnect' },
            { id: 'socket-error', label: 'error', path: 'socket:error' },
          ]
        },
        {
          id: 'socket-room',
          label: 'Room Management',
          children: [
            { id: 'socket-room-create', label: 'room:create', path: 'socket:room:create' },
            { id: 'socket-room-join', label: 'room:join', path: 'socket:room:join' },
            { id: 'socket-room-rejoin', label: 'room:rejoin', path: 'socket:room:rejoin' },
            { id: 'socket-room-leave', label: 'room:leave', path: 'socket:room:leave' },
            { id: 'socket-room-state', label: 'room:state', path: 'socket:room:state' },
            { id: 'socket-room-end', label: 'room:end', path: 'socket:room:end' },
            { id: 'socket-player-update', label: 'player:update_profile', path: 'socket:player:update_profile' },
          ]
        }
      ]
    }
  ];

  // Load API documentation on mount
  useEffect(() => {
    loadMarkdown('/docs/api/API-REFERENCE.md');
  }, [loadMarkdown]);

  const handleNodeClick = (node: TreeNodeData) => {
    if (node.path) {
      // In a full implementation, this would load specific endpoint documentation
      // For now, we'll just highlight the selection
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <motion.div 
      className="api-page"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="api-sidebar">
        <div className="api-sidebar-header">
          <h2>{translate('section.api.navigation')}</h2>
        </div>
        <div className="api-sidebar-content">
          <TreeView data={apiTree} onNodeClick={handleNodeClick} />
        </div>
      </div>
      
      <div className="api-content">
        <div className="api-content-main">
          <Breadcrumbs />
          <div className="api-content-header">
            <h1>{translate('section.api.title')}</h1>
            <p className="api-description">
              {translate('section.api.description')}
            </p>
          </div>
          
          {loading && (
            <div className="api-loading">
              <p>{translate('section.api.loading')}</p>
            </div>
          )}
          
          {error && !loading && (
            <ErrorMessage
              title="Failed to Load API Documentation"
              message={error}
              filePath={filePath || undefined}
              onRetry={retry}
              onGoHome={handleGoHome}
              onGoBack={handleGoBack}
              showDetails={true}
              details={`Attempted to load: ${filePath}\n\nPlease check that the file exists and is accessible.`}
            />
          )}
          
          {!loading && !error && (
            <div className="api-markdown-content">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>

        {/* Table of Contents */}
        {!loading && !error && (
          <aside className="api-content-toc">
            <TableOfContents content={content} />
          </aside>
        )}
      </div>
    </motion.div>
  );
};
