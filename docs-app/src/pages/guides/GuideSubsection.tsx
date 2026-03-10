/**
 * GuideSubsection component
 * Reusable component for rendering individual guide pages
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { ErrorMessage } from '../../components/ErrorMessage';
import { TableOfContents } from '../../components/layout';
import { useMarkdownLoader } from '../../hooks/useMarkdownLoader';
import { useLanguage } from '../../contexts/LanguageContext';

interface GuideSubsectionProps {
  title: string;
  description: string;
  markdownPath: string;
  fallbackContent: string;
}

export const GuideSubsection: React.FC<GuideSubsectionProps> = ({
  title,
  description,
  markdownPath,
  fallbackContent,
}) => {
  const navigate = useNavigate();
  const { translate } = useLanguage();

  const { content, loading, error, filePath, loadMarkdown, retry } = useMarkdownLoader({
    fallbackContent,
    onError: (err, path) => {
      console.error(`Failed to load markdown from ${path}:`, err);
    },
    onSuccess: (_content, path) => {
      console.log(`Successfully loaded markdown from ${path}`);
    },
  });

  useEffect(() => {
    loadMarkdown(markdownPath);
  }, [loadMarkdown, markdownPath]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate('/guides');
  };

  return (
    <div className="guide-subsection">
      <div className="guide-subsection-main">
        <div className="guide-subsection-header">
          <h1>{title}</h1>
          <p className="guide-subsection-description">{description}</p>
        </div>

        {loading && (
          <div className="guide-loading">
            <p>{translate('loading.guide', { title })}</p>
          </div>
        )}

        {error && !loading && (
          <ErrorMessage
            title={translate('error.failedToLoad', { title })}
            message={error}
            filePath={filePath || undefined}
            onRetry={retry}
            onGoHome={handleGoHome}
            onGoBack={handleGoBack}
            showDetails={true}
            details={`Attempted to load: ${filePath}\n\nPlease check that the file exists and is accessible.`}
          />
        )}

        {!loading && !error && (
          <div className="guide-markdown-content">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>

      {/* Table of Contents sidebar */}
      {!loading && !error && (
        <aside className="guide-subsection-toc">
          <TableOfContents content={content} />
        </aside>
      )}
    </div>
  );
};
