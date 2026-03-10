/**
 * BugDetail Page
 * Displays full bug information with edit and delete options
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBugById, updateBug, deleteBug } from '../lib/bugs/BugTracker';
import { BugForm } from '../components/bugs/BugForm';
import { useLanguage } from '../contexts/LanguageContext';
import type { BugDetail, BugFormData } from '../types/bug';
import './BugDetailPage.css';

export function BugDetailPage() {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const { translate } = useLanguage();

  const [bug, setBug] = useState<BugDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadBug();
  }, [bugId]);

  const loadBug = async () => {
    if (!bugId) {
      setError('Bug ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const bugData = await getBugById(bugId);
      if (!bugData) {
        setError(`Bug #${bugId} not found`);
      } else {
        setBug(bugData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bug');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (data: BugFormData) => {
    if (!bugId) return;

    try {
      await updateBug(bugId, data);
      await loadBug();
      setIsEditing(false);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update bug');
    }
  };

  const handleDelete = async () => {
    if (!bugId) return;

    const confirmed = window.confirm(
      translate('bugs.deleteConfirm', { id: bugId })
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await deleteBug(bugId);
      navigate('/plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bug');
      setIsDeleting(false);
    }
  };

  const getPriorityClass = (priority: string): string => {
    return `priority-${priority}`;
  };

  const getStatusClass = (status: string): string => {
    return `status-${status}`;
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bug-detail-page">
        <div className="loading">{translate('bugs.loadingDetails')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bug-detail-page">
        <div className="error-container">
          <h2>{translate('error.generic')}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/plan')} className="button-primary">
            {translate('bugs.backToList')}
          </button>
        </div>
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="bug-detail-page">
        <div className="error-container">
          <h2>{translate('bugs.notFound')}</h2>
          <p>{translate('bugs.notFoundMessage')}</p>
          <button onClick={() => navigate('/plan')} className="button-primary">
            {translate('bugs.backToList')}
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="bug-detail-page">
        <BugForm
          initialData={bug}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="bug-detail-page">
      <div className="bug-detail-header">
        <button onClick={() => navigate('/plan')} className="back-button">
          {translate('bugs.backToList')}
        </button>

        <div className="bug-actions">
          <button
            onClick={() => setIsEditing(true)}
            className="button-secondary"
            disabled={isDeleting}
          >
            {translate('button.edit')}
          </button>
          <button
            onClick={handleDelete}
            className="button-danger"
            disabled={isDeleting}
          >
            {isDeleting ? translate('bugs.deleting') : translate('button.delete')}
          </button>
        </div>
      </div>

      <div className="bug-detail-content">
        <div className="bug-header">
          <h1>
            <span className="bug-id">#{bug.id}</span> {bug.title}
          </h1>

          <div className="bug-meta">
            <span className={`priority-badge ${getPriorityClass(bug.priority)}`}>
              {translate(`bugs.priority.${bug.priority}`)}
            </span>
            <span className={`status-badge ${getStatusClass(bug.status)}`}>
              {translate(`bugs.status.${bug.status === 'in-progress' ? 'inProgress' : bug.status}`)}
            </span>
          </div>
        </div>

        <div className="bug-info-grid">
          <div className="info-item">
            <span className="info-label">{translate('date.created')}</span>
            <span className="info-value">{formatDate(bug.createdAt)}</span>
          </div>

          <div className="info-item">
            <span className="info-label">{translate('date.updated')}</span>
            <span className="info-value">{formatDate(bug.updatedAt)}</span>
          </div>

          {bug.assignee && (
            <div className="info-item">
              <span className="info-label">{translate('form.assignee')}</span>
              <span className="info-value">{bug.assignee}</span>
            </div>
          )}

          {bug.tags.length > 0 && (
            <div className="info-item">
              <span className="info-label">{translate('form.tags')}</span>
              <div className="tags">
                {bug.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bug-section">
          <h2>{translate('form.description')}</h2>
          <div className="bug-description">
            {bug.description.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>

        {bug.stepsToReproduce && (
          <div className="bug-section">
            <h2>{translate('form.stepsToReproduce')}</h2>
            <div className="bug-content">
              {bug.stepsToReproduce.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {bug.expectedBehavior && (
          <div className="bug-section">
            <h2>{translate('form.expectedBehavior')}</h2>
            <div className="bug-content">
              {bug.expectedBehavior.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {bug.actualBehavior && (
          <div className="bug-section">
            <h2>{translate('form.actualBehavior')}</h2>
            <div className="bug-content">
              {bug.actualBehavior.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
