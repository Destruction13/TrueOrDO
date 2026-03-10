import React from 'react';
import { GuideSubsection } from './GuideSubsection';

export const DocsGuidePage: React.FC = () => {
  return (
    <GuideSubsection
      title="Documentation Guide"
      description="Learn how to work with and contribute to the documentation"
      markdownPath="/docs/guides/DOCS-GUIDE.md"
      fallbackContent="# Documentation Guide\n\nLearn how to work with the documentation system."
    />
  );
};
