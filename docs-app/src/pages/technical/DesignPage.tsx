/**
 * DesignPage component
 * Design system technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Design

## Overview

The design system defines the visual language, components, and patterns used throughout the application.

## Design Principles

- Consistency
- Accessibility
- Performance
- User-centered design

## Component Library

The application uses a custom component library built with React and Tailwind CSS.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const DesignPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Design"
      description="Design system, UI components, and visual guidelines"
      markdownPath="/docs/technical/DESIGN.md"
      fallbackContent={fallbackContent}
    />
  );
};
