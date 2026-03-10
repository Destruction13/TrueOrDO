/**
 * SubscriptionPage component
 * Subscription system technical documentation
 */

import React from 'react';
import { TechnicalSubsection } from './TechnicalSubsection';

const fallbackContent = `# Subscription

## Overview

The subscription system handles premium memberships, payment processing, and subscription management.

## Features

- Subscription plans
- Payment processing
- Subscription status tracking
- Payment history

## Payment Integration

Payments are processed through a secure payment gateway with webhook support.

---

*Note: This is fallback content. The full documentation could not be loaded.*
`;

export const SubscriptionPage: React.FC = () => {
  return (
    <TechnicalSubsection
      title="Subscription"
      description="Premium subscriptions, payment processing, and billing"
      markdownPath="/docs/technical/SUBSCRIPTION.md"
      fallbackContent={fallbackContent}
    />
  );
};
