/**
 * ErrorMessage component
 * Displays user-friendly error messages with recovery options
 */

import { useLanguage } from '../contexts/LanguageContext';
import './ErrorMessage.css';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  filePath?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  showDetails?: boolean;
  details?: string;
}

export function ErrorMessage({
  title,
  message,
  filePath,
  onRetry,
  onGoHome,
  onGoBack,
  showDetails = false,
  details,
}: ErrorMessageProps) {
  const { translate } = useLanguage();
  
  const displayTitle = title || translate('error.loadingContent');
  
  return (
    <div className="error-message-container">
      <div className="error-message-content">
        <div className="error-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="error-title">{displayTitle}</h2>
        
        <p className="error-description">{message}</p>

        {filePath && (
          <div className="error-file-path">
            <strong>{translate('error.file')}</strong> <code>{filePath}</code>
          </div>
        )}

        {showDetails && details && (
          <details className="error-details-section">
            <summary>{translate('error.technicalDetails')}</summary>
            <pre className="error-details-content">{details}</pre>
          </details>
        )}

        <div className="error-actions">
          {onRetry && (
            <button onClick={onRetry} className="error-btn error-btn-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {translate('error.retry')}
            </button>
          )}

          {onGoBack && (
            <button onClick={onGoBack} className="error-btn error-btn-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7M19 12H5" />
              </svg>
              {translate('error.goBack')}
            </button>
          )}

          {onGoHome && (
            <button onClick={onGoHome} className="error-btn error-btn-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {translate('error.goToHome')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
