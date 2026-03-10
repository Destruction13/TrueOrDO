/**
 * GamesPage component
 * Games system technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Games

## Overview

The games system handles Truth or Dare game logic, room management, and real-time gameplay.

## Features

- Room creation and management
- Player management
- Turn-based gameplay
- Custom wheels and challenges

## Real-time Communication

Games use Socket.IO for real-time communication between players.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const GamesPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Games"
      description="Game logic, room management, and real-time gameplay mechanics"
      markdownPath="/docs/technical/GAMES.md"
      fallbackContent={fallbackContent}
    />
  );
};
