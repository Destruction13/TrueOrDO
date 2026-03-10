/**
 * ClientPage component
 * Client-side technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Client

## Overview

The client application is built with React and provides the user interface for the TrueOrDO platform.

## Technology Stack

- React 18+
- TypeScript
- Vite
- Socket.IO Client
- React Router

## Architecture

The client follows a component-based architecture with clear separation of concerns.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const ClientPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Client"
      description="Frontend architecture, React components, and client-side logic"
      markdownPath="/docs/technical/CLIENT.md"
      fallbackContent={fallbackContent}
    />
  );
};
