/**
 * DatabasePage component
 * Database technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Database

## Overview

The database layer uses PostgreSQL with Prisma ORM for type-safe database access.

## Schema

The database schema includes tables for users, sessions, games, achievements, and subscriptions.

## Migrations

Database migrations are managed with Prisma Migrate.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const DatabasePage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Database"
      description="Database schema, migrations, and data access patterns"
      markdownPath="/docs/technical/DATABASE.md"
      fallbackContent={fallbackContent}
    />
  );
};
