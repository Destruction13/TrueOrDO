/**
 * Plan Page
 * Bug tracker section with bug list and create functionality
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllBugs, createBug } from '../lib/bugs/BugTracker';
import { BugList } from '../components/bugs/BugList';
import { BugForm } from '../components/bugs/BugForm';
import { useLanguage } from '../contexts/LanguageContext';
import type { BugEntry, BugFormData } from '../types/bug';
import './PlanPage.css';

export function PlanPage() {
  const navigate = useNavigate();
  const { translate } = useLanguage();

  const [bugs, setBugs] = useState<BugEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const bugsData = await getAllBugs();
      setBugs(bugsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bugs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBug = async (data: BugFormData) => {
    try {
      const newBug = await createBug(data);
      await loadBugs();
      setShowCreateForm(false);
      
      // Navigate to the new bug detail page
      navigate(`/plan/bug/${newBug.id}`);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create bug');
    }
  };

  const handleBugClick = (bugId: string) => {
    navigate(`/plan/bug/${bugId}`);
  };

  if (isLoading) {
    return (
      <div className="plan-page">
        <div className="loading">{translate('bugs.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="plan-page">
        <div className="error-container">
          <h2>{translate('error.generic')}</h2>
          <p>{error}</p>
          <button onClick={loadBugs} className="button-primary">
            {translate('error.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-page">
      <div className="plan-header">
        <div className="plan-title">
          <h1>{translate('bugs.title')}</h1>
          <p className="plan-subtitle">
            {translate('bugs.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="button-primary create-bug-button"
        >
          + {translate('bugs.createNew')}
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <BugForm
              onSubmit={handleCreateBug}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      <div className="plan-stats">
        <div className="stat-card">
          <div className="stat-value">{bugs.length}</div>
          <div className="stat-label">{translate('bugs.totalBugs')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {bugs.filter((b) => b.status === 'open').length}
          </div>
          <div className="stat-label">{translate('bugs.openBugs')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {bugs.filter((b) => b.status === 'in-progress').length}
          </div>
          <div className="stat-label">{translate('bugs.inProgress')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {bugs.filter((b) => b.status === 'resolved').length}
          </div>
          <div className="stat-label">{translate('bugs.resolvedBugs')}</div>
        </div>
      </div>

      <BugList bugs={bugs} onBugClick={handleBugClick} />
    </div>
  );
}
