import React from 'react';
import { GuideSubsection } from './GuideSubsection';

export const FinalTasksPage: React.FC = () => {
  return (
    <GuideSubsection
      title="Final Tasks Plan"
      description="Plan for final project tasks and completion"
      markdownPath="/docs/guides/FINAL-TASKS-PLAN.md"
      fallbackContent="# Final Tasks Plan\n\nPlan for final project tasks."
    />
  );
};
