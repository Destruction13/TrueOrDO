import React from 'react';
import { GuideSubsection } from './GuideSubsection';

export const McpSetupPage: React.FC = () => {
  return (
    <GuideSubsection
      title="MCP Setup"
      description="Setting up Model Context Protocol servers"
      markdownPath="/docs/guides/MCP-SETUP.md"
      fallbackContent="# MCP Setup\n\nGuide for setting up MCP servers."
    />
  );
};
