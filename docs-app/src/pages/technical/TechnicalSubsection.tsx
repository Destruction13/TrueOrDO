/**
 * TechnicalSubsection component
 * Reusable component for rendering technical subsection pages
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { ErrorMessage } from '../../components/ErrorMessage';
import { TableOfContents } from '../../components/layout';
import { useMarkdownLoader } from '../../hooks/useMarkdownLoader';
import { useLanguage } from '../../contexts/LanguageContext';

interface TechnicalSubsectionProps {
  title: string;
  description: string;
  markdownPath: string;
  fallbackContent: string;
}

export const TechnicalSubsection: React.FC<TechnicalSubsectionProps> = ({
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
    navigate('/technical');
  };

  return (
    <div className="technical-subsection">
      <div className="technical-subsection-main">
        <div className="technical-subsection-header">
          <h1>{title}</h1>
          <p className="technical-subsection-description">{description}</p>
        </div>

        {loading && (
          <div className="technical-loading">
            <p>{translate('loading.documentation', { title })}</p>
          </div>
        )}

        {error && !loading && (
          <ErrorMessage
            title={translate('error.failedToLoadDocumentation', { title })}
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
          <div className="technical-markdown-content">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>

      {/* Table of Contents sidebar */}
      {!loading && !error && (
        <aside className="technical-subsection-toc">
          <TableOfContents content={content} />
        </aside>
      )}
    </div>
  );
};
