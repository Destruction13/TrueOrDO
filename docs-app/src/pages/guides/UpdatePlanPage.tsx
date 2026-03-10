import React from 'react';
import { GuideSubsection } from './GuideSubsection';

export const UpdatePlanPage: React.FC = () => {
  return (
    <GuideSubsection
      title="Documentation Update Plan"
      description="Plan for updating and maintaining documentation"
      markdownPath="/docs/guides/DOCUMENTATION-UPDATE-PLAN.md"
      fallbackContent="# Documentation Update Plan\n\nPlan for documentation updates."
    />
  );
};
