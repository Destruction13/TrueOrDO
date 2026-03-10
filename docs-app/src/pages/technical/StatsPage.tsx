/**
 * StatsPage component
 * Statistics and achievements technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Stats

## Overview

The statistics system tracks user activity, achievements, and game performance.

## Features

- User statistics tracking
- Achievement system
- Featured achievements
- Progress tracking

## Achievement System

Achievements are unlocked based on user actions and milestones.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const StatsPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Stats"
      description="Statistics tracking, achievements, and progress monitoring"
      markdownPath="/docs/technical/STATS.md"
      fallbackContent={fallbackContent}
    />
  );
};
