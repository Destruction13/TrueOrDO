/**
 * Tests for translations dictionary
 * 
 * Validates: Requirements 13.1, 13.2
 */

import { describe, it, expect } from 'vitest';
import { translations } from '../translations';
import type { Language } from '../../../types';

describe('Translations Dictionary', () => {
  it('should have translations for both ru and en', () => {
    // Check a sample of keys
    const sampleKeys = [
      'nav.home',
      'search.placeholder',
      'bugs.createNew',
      'form.title',
      'button.submit',
      'error.generic',
    ];

    sampleKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeDefined();
      expect(translations[key].en).toBeDefined();
      expect(typeof translations[key].ru).toBe('string');
      expect(typeof translations[key].en).toBe('string');
    });
  });

  it('should have all navigation translations', () => {
    const navKeys = [
      'nav.home',
      'nav.api',
      'nav.technical',
      'nav.guides',
      'nav.plan',
      'nav.back',
      'nav.scrollToTop',
      'nav.tableOfContents',
    ];

    navKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all search translations', () => {
    const searchKeys = [
      'search.placeholder',
      'search.close',
      'search.filterBySection',
      'search.hint',
      'search.noResults',
      'search.score',
    ];

    searchKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all bug tracker translations', () => {
    const bugKeys = [
      'bugs.title',
      'bugs.createNew',
      'bugs.editBug',
      'bugs.deleteBug',
      'bugs.priority.low',
      'bugs.priority.medium',
      'bugs.priority.high',
      'bugs.priority.critical',
      'bugs.status.open',
      'bugs.status.inProgress',
      'bugs.status.resolved',
      'bugs.status.closed',
    ];

    bugKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all form translations', () => {
    const formKeys = [
      'form.title',
      'form.description',
      'form.priority',
      'form.status',
      'form.tags',
      'form.assignee',
      'form.required',
    ];

    formKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all button translations', () => {
    const buttonKeys = [
      'button.submit',
      'button.cancel',
      'button.save',
      'button.delete',
      'button.edit',
      'button.create',
      'button.copy',
      'button.copied',
      'button.export',
    ];

    buttonKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all error translations', () => {
    const errorKeys = [
      'error.generic',
      'error.notFound',
      'error.fileNotFound',
      'error.loadFailed',
      'error.saveFailed',
      'error.copyFailed',
      'error.validation.required',
      'error.validation.titleRequired',
    ];

    errorKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all interactive component translations', () => {
    const componentKeys = [
      'code.copy',
      'code.copied',
      'table.search',
      'table.filter',
      'table.exportCSV',
      'table.exportJSON',
      'diagram.zoom',
      'diagram.exportPNG',
      'chart.title',
    ];

    componentKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all section translations', () => {
    const sectionKeys = [
      'section.api.title',
      'section.api.description',
      'section.technical.title',
      'section.technical.description',
      'section.guides.title',
      'section.plan.title',
    ];

    sectionKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have all technical subsection translations', () => {
    const subsectionKeys = [
      'section.technical.auth',
      'section.technical.client',
      'section.technical.server',
      'section.technical.database',
      'section.technical.games',
      'section.technical.social',
      'section.technical.stats',
      'section.technical.subscription',
      'section.technical.deploy',
      'section.technical.design',
    ];

    subsectionKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have theme and language translations', () => {
    const themeKeys = ['theme.light', 'theme.dark', 'theme.toggle'];
    const langKeys = ['language.russian', 'language.english', 'language.toggle'];

    [...themeKeys, ...langKeys].forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have API documentation translations', () => {
    const apiKeys = [
      'api.endpoint',
      'api.method',
      'api.parameters',
      'api.request',
      'api.response',
      'api.example',
      'api.required',
      'api.optional',
    ];

    apiKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should support parameter interpolation in translations', () => {
    // Test translations with parameters
    const paramKeys = [
      'search.noResults',
      'error.fileNotFound',
      'form.removeTag',
      'date.daysAgo',
      'misc.readingTime',
    ];

    paramKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toContain('{');
      expect(translations[key].en).toContain('{');
    });
  });

  it('should have consistent structure across all translations', () => {
    const languages: Language[] = ['ru', 'en'];

    Object.keys(translations).forEach((key) => {
      const translation = translations[key];

      // Each translation should have both languages
      languages.forEach((lang) => {
        expect(translation[lang]).toBeDefined();
        expect(typeof translation[lang]).toBe('string');
        expect(translation[lang].length).toBeGreaterThan(0);
      });
    });
  });

  it('should have organized translations by feature area', () => {
    // Check that translations are organized with prefixes
    const prefixes = [
      'nav.',
      'search.',
      'bugs.',
      'form.',
      'button.',
      'error.',
      'code.',
      'table.',
      'diagram.',
      'chart.',
      'theme.',
      'language.',
      'api.',
      'section.',
      'a11y.',
      'date.',
      'misc.',
    ];

    const allKeys = Object.keys(translations);

    prefixes.forEach((prefix) => {
      const keysWithPrefix = allKeys.filter((key) => key.startsWith(prefix));
      expect(keysWithPrefix.length).toBeGreaterThan(0);
    });
  });

  it('should have accessibility translations', () => {
    const a11yKeys = [
      'a11y.skipToContent',
      'a11y.openMenu',
      'a11y.closeMenu',
      'a11y.expandSection',
      'a11y.collapseSection',
    ];

    a11yKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have loading state translations', () => {
    const loadingKeys = [
      'loading.page',
      'loading.content',
      'loading.search',
      'loading.saving',
    ];

    loadingKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have date and time translations', () => {
    const dateKeys = [
      'date.created',
      'date.updated',
      'date.today',
      'date.yesterday',
      'date.daysAgo',
    ];

    dateKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });

  it('should have miscellaneous translations', () => {
    const miscKeys = [
      'misc.readingTime',
      'misc.lastUpdated',
      'misc.version',
      'misc.author',
      'misc.viewportTooSmall',
    ];

    miscKeys.forEach((key) => {
      expect(translations[key]).toBeDefined();
      expect(translations[key].ru).toBeTruthy();
      expect(translations[key].en).toBeTruthy();
    });
  });
});
