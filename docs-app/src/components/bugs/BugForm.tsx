/**
 * BugForm Component
 * Form for creating and editing bugs
 */

import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { BugFormData, BugPriority, BugStatus } from '../../types/bug';
import './BugForm.css';

interface BugFormProps {
  initialData?: Partial<BugFormData>;
  onSubmit: (data: BugFormData) => Promise<void>;
  onCancel: () => void;
}

export function BugForm({ initialData, onSubmit, onCancel }: BugFormProps) {
  const { translate } = useLanguage();
  const [formData, setFormData] = useState<BugFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    status: initialData?.status || 'open',
    tags: initialData?.tags || [],
    stepsToReproduce: initialData?.stepsToReproduce || '',
    expectedBehavior: initialData?.expectedBehavior || '',
    actualBehavior: initialData?.actualBehavior || '',
    assignee: initialData?.assignee || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = translate('error.validation.titleRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = translate('error.validation.descriptionRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to submit bug'
      });
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && formData.tags && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tag]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || []
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form className="bug-form" onSubmit={handleSubmit}>
      <h2>{initialData ? translate('bugs.editBug') : translate('bugs.createNewBug')}</h2>

      {errors.submit && (
        <div className="error-message" role="alert">
          {errors.submit}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title">
          {translate('form.title')} <span className="required">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={errors.title ? 'error' : ''}
          disabled={isSubmitting}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <span id="title-error" className="field-error" role="alert">
            {errors.title}
          </span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="priority">{translate('form.priority')}</label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as BugPriority })}
            disabled={isSubmitting}
          >
            <option value="low">{translate('bugs.priority.low')}</option>
            <option value="medium">{translate('bugs.priority.medium')}</option>
            <option value="high">{translate('bugs.priority.high')}</option>
            <option value="critical">{translate('bugs.priority.critical')}</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">{translate('form.status')}</label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as BugStatus })}
            disabled={isSubmitting}
          >
            <option value="open">{translate('bugs.status.open')}</option>
            <option value="in-progress">{translate('bugs.status.inProgress')}</option>
            <option value="resolved">{translate('bugs.status.resolved')}</option>
            <option value="closed">{translate('bugs.status.closed')}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">
          {translate('form.description')} <span className="required">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={5}
          className={errors.description ? 'error' : ''}
          disabled={isSubmitting}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <span id="description-error" className="field-error" role="alert">
            {errors.description}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="stepsToReproduce">{translate('form.stepsToReproduce')}</label>
        <textarea
          id="stepsToReproduce"
          value={formData.stepsToReproduce}
          onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
          rows={4}
          disabled={isSubmitting}
          placeholder={translate('form.stepsPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="expectedBehavior">{translate('form.expectedBehavior')}</label>
        <textarea
          id="expectedBehavior"
          value={formData.expectedBehavior}
          onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="actualBehavior">{translate('form.actualBehavior')}</label>
        <textarea
          id="actualBehavior"
          value={formData.actualBehavior}
          onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="assignee">{translate('form.assignee')}</label>
        <input
          id="assignee"
          type="text"
          value={formData.assignee}
          onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
          disabled={isSubmitting}
          placeholder={translate('form.assigneePlaceholder')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="tags">{translate('form.tags')}</label>
        <div className="tag-input-container">
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            disabled={isSubmitting}
            placeholder={translate('form.tagPlaceholder')}
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={isSubmitting || !tagInput.trim()}
            className="add-tag-button"
          >
            {translate('form.addTag')}
          </button>
        </div>
        {formData.tags && formData.tags.length > 0 && (
          <div className="tags-list">
            {formData.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isSubmitting}
                  className="remove-tag"
                  aria-label={translate('form.removeTag', { tag })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="button-secondary"
        >
          {translate('button.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary"
        >
          {isSubmitting ? translate('button.submitting') : initialData ? translate('bugs.updateBug') : translate('bugs.createNew')}
        </button>
      </div>
    </form>
  );
}
