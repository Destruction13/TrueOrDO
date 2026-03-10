/**
 * DeployPage component
 * Deployment technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Deploy

## Overview

Deployment documentation covers infrastructure, CI/CD pipelines, and production deployment procedures.

## Infrastructure

The application is deployed on cloud infrastructure with automated scaling.

## CI/CD Pipeline

Continuous integration and deployment are automated through GitHub Actions.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const DeployPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Deploy"
      description="Deployment procedures, infrastructure, and CI/CD pipelines"
      markdownPath="/docs/technical/DEPLOY.md"
      fallbackContent={fallbackContent}
    />
  );
};
