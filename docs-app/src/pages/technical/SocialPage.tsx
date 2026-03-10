/**
 * SocialPage component
 * Social features technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Social

## Overview

The social system handles user profiles, customization, and social interactions.

## Features

- User profiles
- Avatar customization
- Nickname effects and gradients
- Profile frames

## Customization System

Users can customize their profiles with various visual effects and cosmetic items.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const SocialPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Social"
      description="User profiles, customization, and social features"
      markdownPath="/docs/technical/SOCIAL.md"
      fallbackContent={fallbackContent}
    />
  );
};
