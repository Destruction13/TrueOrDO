/**
 * AuthPage component
 * Authentication technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Authentication

## Overview

The authentication system handles user registration, login, session management, and OAuth integration.

## Features

- Email/password authentication
- OAuth integration (Discord, Google)
- Session management with JWT
- Email verification
- Password reset functionality

## Architecture

The authentication system uses JWT tokens for stateless authentication with refresh token rotation.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const AuthPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Authentication"
      description="User authentication, session management, and OAuth integration"
      markdownPath="/docs/technical/AUTH.md"
      fallbackContent={fallbackContent}
    />
  );
};
