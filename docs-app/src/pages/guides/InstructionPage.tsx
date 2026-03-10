import React from 'react';
import { GuideSubsection } from './GuideSubsection';

export const InstructionPage: React.FC = () => {
  return (
    <GuideSubsection
      title="Инструкция"
      description="Основная инструкция по работе с проектом (RU)"
      markdownPath="/docs/guides/ИНСТРУКЦИЯ.md"
      fallbackContent="# Инструкция\n\nОсновная инструкция по работе с проектом."
    />
  );
};
