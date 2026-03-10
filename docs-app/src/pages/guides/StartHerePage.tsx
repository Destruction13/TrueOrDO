import React from 'react';
import { GuideSubsection } from './GuideSubsection';

export const StartHerePage: React.FC = () => {
  return (
    <GuideSubsection
      title="Start Here"
      description="Begin your journey with TrueOrDO"
      markdownPath="/docs/guides/START-HERE.md"
      fallbackContent="# Start Here\n\nWelcome to TrueOrDO documentation!"
    />
  );
};
