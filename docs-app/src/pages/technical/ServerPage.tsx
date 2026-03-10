/**
 * ServerPage component
 * Server-side technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Server

## Overview

The server application is built with Node.js and Express, providing REST API and Socket.IO real-time communication.

## Technology Stack

- Node.js
- Express
- Socket.IO
- PostgreSQL
- Prisma ORM

## Architecture

The server follows a layered architecture with controllers, services, and repositories.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const ServerPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Server"
      description="Backend architecture, API implementation, and server-side logic"
      markdownPath="/docs/technical/SERVER.md"
      fallbackContent={fallbackContent}
    />
  );
};
