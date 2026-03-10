/**
 * Language Manager Module
 * 
 * Exports language management functions for the documentation system.
 */

export {
  getCurrentLanguage,
  setLanguage,
  translate,
  initializeLanguage,
} from './language-manager';

export { translations } from './translations';

export type { Language, Translations } from '../../types';
