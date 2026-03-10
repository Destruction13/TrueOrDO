/**
 * Translations Dictionary
 * 
 * Comprehensive translations for all UI text in the application.
 * Organized by feature area for maintainability.
 * 
 * Validates: Requirements 13.1, 13.2
 */

import type { Translations } from '../../types';

/**
 * Complete translations dictionary
 * Organized by feature: navigation, search, bugs, forms, errors, etc.
 */
export const translations: Translations = {
  // ============================================================================
  // NAVIGATION
  // ============================================================================
  
  'nav.home': {
    ru: 'Главная',
    en: 'Home',
  },
  
  'nav.api': {
    ru: 'API',
    en: 'API',
  },
  
  'nav.technical': {
    ru: 'Технические разделы',
    en: 'Technical Sections',
  },
  
  'nav.guides': {
    ru: 'Руководства',
    en: 'Guides',
  },
  
  'nav.plan': {
    ru: 'План',
    en: 'Plan',
  },
  
  'nav.back': {
    ru: 'Назад',
    en: 'Back',
  },
  
  'nav.scrollToTop': {
    ru: 'Наверх',
    en: 'Scroll to Top',
  },
  
  'nav.tableOfContents': {
    ru: 'Содержание',
    en: 'Table of Contents',
  },
  
  // ============================================================================
  // SEARCH
  // ============================================================================
  
  'search.placeholder': {
    ru: 'Поиск в документации... (Cmd+K / Ctrl+K)',
    en: 'Search documentation... (Cmd+K / Ctrl+K)',
  },
  
  'search.close': {
    ru: 'Закрыть',
    en: 'Close',
  },
  
  'search.filterBySection': {
    ru: 'Фильтр по разделам:',
    en: 'Filter by sections:',
  },
  
  'search.hint': {
    ru: 'Введите минимум 2 символа для поиска',
    en: 'Enter at least 2 characters to search',
  },
  
  'search.noResults': {
    ru: 'Ничего не найдено по запросу "{query}"',
    en: 'No results found for "{query}"',
  },
  
  'search.score': {
    ru: 'Релевантность',
    en: 'Score',
  },
  
  'search.shortcuts.navigate': {
    ru: 'Навигация',
    en: 'Navigate',
  },
  
  'search.shortcuts.open': {
    ru: 'Открыть',
    en: 'Open',
  },
  
  'search.shortcuts.close': {
    ru: 'Закрыть',
    en: 'Close',
  },
  
  // ============================================================================
  // BUGS / BUG TRACKER
  // ============================================================================
  
  'bugs.title': {
    ru: 'Баг-трекер',
    en: 'Bug Tracker',
  },
  
  'bugs.createNew': {
    ru: 'Создать баг',
    en: 'Create Bug',
  },
  
  'bugs.editBug': {
    ru: 'Редактировать баг',
    en: 'Edit Bug',
  },
  
  'bugs.deleteBug': {
    ru: 'Удалить баг',
    en: 'Delete Bug',
  },
  
  'bugs.noBugs': {
    ru: 'Нет багов',
    en: 'No bugs',
  },
  
  'bugs.totalBugs': {
    ru: 'Всего багов',
    en: 'Total bugs',
  },
  
  'bugs.openBugs': {
    ru: 'Открытых',
    en: 'Open',
  },
  
  'bugs.resolvedBugs': {
    ru: 'Решённых',
    en: 'Resolved',
  },
  
  'bugs.inProgress': {
    ru: 'В работе',
    en: 'In Progress',
  },
  
  'bugs.subtitle': {
    ru: 'Отслеживайте и управляйте багами системы документации',
    en: 'Track and manage bugs for the documentation system',
  },
  
  'bugs.loading': {
    ru: 'Загрузка багов...',
    en: 'Loading bugs...',
  },
  
  'bugs.loadingDetails': {
    ru: 'Загрузка деталей бага...',
    en: 'Loading bug details...',
  },
  
  'bugs.notFound': {
    ru: 'Баг не найден',
    en: 'Bug Not Found',
  },
  
  'bugs.notFoundMessage': {
    ru: 'Запрошенный баг не найден.',
    en: 'The requested bug could not be found.',
  },
  
  'bugs.backToList': {
    ru: '← Назад к списку багов',
    en: '← Back to Bug List',
  },
  
  'bugs.createNewBug': {
    ru: 'Создать новый баг',
    en: 'Create New Bug',
  },
  
  'bugs.updateBug': {
    ru: 'Обновить баг',
    en: 'Update Bug',
  },
  
  'bugs.deleteConfirm': {
    ru: 'Вы уверены, что хотите удалить баг #{id}? Это действие нельзя отменить.',
    en: 'Are you sure you want to delete bug #{id}? This action cannot be undone.',
  },
  
  'bugs.deleting': {
    ru: 'Удаление...',
    en: 'Deleting...',
  },
  
  'bugs.showingBugs': {
    ru: 'Показано {count} из {total} багов',
    en: 'Showing {count} of {total} bugs',
  },
  
  'bugs.noResults': {
    ru: 'Не найдено багов, соответствующих текущим фильтрам',
    en: 'No bugs found matching the current filters',
  },
  
  'bugs.searchPlaceholder': {
    ru: 'Поиск по заголовку, ID или тегам...',
    en: 'Search by title, ID, or tags...',
  },
  
  'bugs.filterAll': {
    ru: 'Все',
    en: 'All',
  },
  
  // Bug priorities
  'bugs.priority.low': {
    ru: 'Низкий',
    en: 'Low',
  },
  
  'bugs.priority.medium': {
    ru: 'Средний',
    en: 'Medium',
  },
  
  'bugs.priority.high': {
    ru: 'Высокий',
    en: 'High',
  },
  
  'bugs.priority.critical': {
    ru: 'Критический',
    en: 'Critical',
  },
  
  // Bug statuses
  'bugs.status.open': {
    ru: 'Открыт',
    en: 'Open',
  },
  
  'bugs.status.inProgress': {
    ru: 'В работе',
    en: 'In Progress',
  },
  
  'bugs.status.resolved': {
    ru: 'Решён',
    en: 'Resolved',
  },
  
  'bugs.status.closed': {
    ru: 'Закрыт',
    en: 'Closed',
  },
  
  // ============================================================================
  // FORMS
  // ============================================================================
  
  'form.title': {
    ru: 'Заголовок',
    en: 'Title',
  },
  
  'form.description': {
    ru: 'Описание',
    en: 'Description',
  },
  
  'form.priority': {
    ru: 'Приоритет',
    en: 'Priority',
  },
  
  'form.status': {
    ru: 'Статус',
    en: 'Status',
  },
  
  'form.tags': {
    ru: 'Теги',
    en: 'Tags',
  },
  
  'form.assignee': {
    ru: 'Исполнитель',
    en: 'Assignee',
  },
  
  'form.stepsToReproduce': {
    ru: 'Шаги воспроизведения',
    en: 'Steps to Reproduce',
  },
  
  'form.expectedBehavior': {
    ru: 'Ожидаемое поведение',
    en: 'Expected Behavior',
  },
  
  'form.actualBehavior': {
    ru: 'Фактическое поведение',
    en: 'Actual Behavior',
  },
  
  'form.required': {
    ru: 'обязательно',
    en: 'required',
  },
  
  'form.addTag': {
    ru: 'Добавить',
    en: 'Add',
  },
  
  'form.removeTag': {
    ru: 'Удалить тег {tag}',
    en: 'Remove tag {tag}',
  },
  
  'form.tagPlaceholder': {
    ru: 'Добавьте тег и нажмите Enter',
    en: 'Add tag and press Enter',
  },
  
  'form.assigneePlaceholder': {
    ru: 'email@example.com',
    en: 'email@example.com',
  },
  
  'form.stepsPlaceholder': {
    ru: '1. Шаг первый\n2. Шаг второй\n3. ...',
    en: '1. Step one\n2. Step two\n3. ...',
  },
  
  // ============================================================================
  // BUTTONS
  // ============================================================================
  
  'button.submit': {
    ru: 'Отправить',
    en: 'Submit',
  },
  
  'button.cancel': {
    ru: 'Отмена',
    en: 'Cancel',
  },
  
  'button.save': {
    ru: 'Сохранить',
    en: 'Save',
  },
  
  'button.delete': {
    ru: 'Удалить',
    en: 'Delete',
  },
  
  'button.edit': {
    ru: 'Редактировать',
    en: 'Edit',
  },
  
  'button.create': {
    ru: 'Создать',
    en: 'Create',
  },
  
  'button.update': {
    ru: 'Обновить',
    en: 'Update',
  },
  
  'button.close': {
    ru: 'Закрыть',
    en: 'Close',
  },
  
  'button.copy': {
    ru: 'Копировать',
    en: 'Copy',
  },
  
  'button.copied': {
    ru: 'Скопировано!',
    en: 'Copied!',
  },
  
  'button.export': {
    ru: 'Экспорт',
    en: 'Export',
  },
  
  'button.download': {
    ru: 'Скачать',
    en: 'Download',
  },
  
  'button.submitting': {
    ru: 'Отправка...',
    en: 'Submitting...',
  },
  
  'button.loading': {
    ru: 'Загрузка...',
    en: 'Loading...',
  },
  
  // ============================================================================
  // INTERACTIVE COMPONENTS
  // ============================================================================
  
  // Code Block
  'code.copy': {
    ru: 'Копировать код',
    en: 'Copy code',
  },
  
  'code.copied': {
    ru: 'Скопировано!',
    en: 'Copied!',
  },
  
  'code.language': {
    ru: 'Язык',
    en: 'Language',
  },
  
  // Table
  'table.search': {
    ru: 'Поиск...',
    en: 'Search...',
  },
  
  'table.filter': {
    ru: 'Фильтр',
    en: 'Filter',
  },
  
  'table.sort': {
    ru: 'Сортировка',
    en: 'Sort',
  },
  
  'table.sortAsc': {
    ru: 'По возрастанию',
    en: 'Ascending',
  },
  
  'table.sortDesc': {
    ru: 'По убыванию',
    en: 'Descending',
  },
  
  'table.exportCSV': {
    ru: 'Экспорт в CSV',
    en: 'Export to CSV',
  },
  
  'table.exportJSON': {
    ru: 'Экспорт в JSON',
    en: 'Export to JSON',
  },
  
  'table.noData': {
    ru: 'Нет данных',
    en: 'No data',
  },
  
  'table.rowsPerPage': {
    ru: 'Строк на странице',
    en: 'Rows per page',
  },
  
  'table.page': {
    ru: 'Страница',
    en: 'Page',
  },
  
  'table.of': {
    ru: 'из',
    en: 'of',
  },
  
  // Diagram
  'diagram.zoom': {
    ru: 'Масштаб',
    en: 'Zoom',
  },
  
  'diagram.zoomIn': {
    ru: 'Увеличить',
    en: 'Zoom In',
  },
  
  'diagram.zoomOut': {
    ru: 'Уменьшить',
    en: 'Zoom Out',
  },
  
  'diagram.resetZoom': {
    ru: 'Сбросить масштаб',
    en: 'Reset Zoom',
  },
  
  'diagram.exportPNG': {
    ru: 'Экспорт в PNG',
    en: 'Export to PNG',
  },
  
  'diagram.exportSVG': {
    ru: 'Экспорт в SVG',
    en: 'Export to SVG',
  },
  
  // Chart
  'chart.title': {
    ru: 'График',
    en: 'Chart',
  },
  
  'chart.exportPNG': {
    ru: 'Экспорт в PNG',
    en: 'Export to PNG',
  },
  
  'chart.noData': {
    ru: 'Нет данных для отображения',
    en: 'No data to display',
  },
  
  // ============================================================================
  // ERRORS
  // ============================================================================
  
  'error.generic': {
    ru: 'Произошла ошибка',
    en: 'An error occurred',
  },
  
  'error.notFound': {
    ru: 'Страница не найдена',
    en: 'Page not found',
  },
  
  'error.fileNotFound': {
    ru: 'Файл не найден: {path}',
    en: 'File not found: {path}',
  },
  
  'error.loadFailed': {
    ru: 'Не удалось загрузить',
    en: 'Failed to load',
  },
  
  'error.loadingContent': {
    ru: 'Ошибка загрузки контента',
    en: 'Error Loading Content',
  },
  
  'error.failedToLoad': {
    ru: 'Не удалось загрузить {title}',
    en: 'Failed to Load {title}',
  },
  
  'error.failedToLoadDocumentation': {
    ru: 'Не удалось загрузить документацию {title}',
    en: 'Failed to Load {title} Documentation',
  },
  
  'error.file': {
    ru: 'Файл:',
    en: 'File:',
  },
  
  'error.technicalDetails': {
    ru: 'Технические детали',
    en: 'Technical details',
  },
  
  'error.retry': {
    ru: 'Повторить',
    en: 'Retry',
  },
  
  'error.goBack': {
    ru: 'Назад',
    en: 'Go Back',
  },
  
  'error.goToHome': {
    ru: 'На главную',
    en: 'Go to Home',
  },
  
  'error.saveFailed': {
    ru: 'Не удалось сохранить',
    en: 'Failed to save',
  },
  
  'error.deleteFailed': {
    ru: 'Не удалось удалить',
    en: 'Failed to delete',
  },
  
  'error.copyFailed': {
    ru: 'Не удалось скопировать. Пожалуйста, скопируйте вручную.',
    en: 'Failed to copy. Please copy manually.',
  },
  
  'error.exportFailed': {
    ru: 'Не удалось экспортировать',
    en: 'Failed to export',
  },
  
  'error.searchFailed': {
    ru: 'Ошибка поиска',
    en: 'Search failed',
  },
  
  'error.validation.required': {
    ru: 'Это поле обязательно',
    en: 'This field is required',
  },
  
  'error.validation.titleRequired': {
    ru: 'Заголовок обязателен',
    en: 'Title is required',
  },
  
  'error.validation.descriptionRequired': {
    ru: 'Описание обязательно',
    en: 'Description is required',
  },
  
  'error.validation.invalidEmail': {
    ru: 'Неверный формат email',
    en: 'Invalid email format',
  },
  
  'error.webglNotSupported': {
    ru: 'WebGL не поддерживается вашим браузером',
    en: 'WebGL is not supported by your browser',
  },
  
  'error.tryAgain': {
    ru: 'Попробовать снова',
    en: 'Try again',
  },
  
  'error.goHome': {
    ru: 'На главную',
    en: 'Go home',
  },
  
  // ============================================================================
  // THEME
  // ============================================================================
  
  'theme.light': {
    ru: 'Светлая тема',
    en: 'Light theme',
  },
  
  'theme.dark': {
    ru: 'Тёмная тема',
    en: 'Dark theme',
  },
  
  'theme.toggle': {
    ru: 'Переключить тему',
    en: 'Toggle theme',
  },
  
  // ============================================================================
  // LANGUAGE
  // ============================================================================
  
  'language.russian': {
    ru: 'Русский',
    en: 'Russian',
  },
  
  'language.english': {
    ru: 'Английский',
    en: 'English',
  },
  
  'language.toggle': {
    ru: 'Переключить язык',
    en: 'Toggle language',
  },
  
  // ============================================================================
  // LOADING STATES
  // ============================================================================
  
  'loading.page': {
    ru: 'Загрузка страницы...',
    en: 'Loading page...',
  },
  
  'loading.content': {
    ru: 'Загрузка контента...',
    en: 'Loading content...',
  },
  
  'loading.search': {
    ru: 'Поиск...',
    en: 'Searching...',
  },
  
  'loading.saving': {
    ru: 'Сохранение...',
    en: 'Saving...',
  },
  
  'loading.documentation': {
    ru: 'Загрузка документации {title}...',
    en: 'Loading {title} documentation...',
  },
  
  'loading.guide': {
    ru: 'Загрузка {title}...',
    en: 'Loading {title}...',
  },
  
  // ============================================================================
  // API DOCUMENTATION
  // ============================================================================
  
  'api.endpoint': {
    ru: 'Конечная точка',
    en: 'Endpoint',
  },
  
  'api.method': {
    ru: 'Метод',
    en: 'Method',
  },
  
  'api.parameters': {
    ru: 'Параметры',
    en: 'Parameters',
  },
  
  'api.request': {
    ru: 'Запрос',
    en: 'Request',
  },
  
  'api.response': {
    ru: 'Ответ',
    en: 'Response',
  },
  
  'api.example': {
    ru: 'Пример',
    en: 'Example',
  },
  
  'api.required': {
    ru: 'Обязательный',
    en: 'Required',
  },
  
  'api.optional': {
    ru: 'Опциональный',
    en: 'Optional',
  },
  
  'api.type': {
    ru: 'Тип',
    en: 'Type',
  },
  
  'api.description': {
    ru: 'Описание',
    en: 'Description',
  },
  
  // ============================================================================
  // SECTIONS
  // ============================================================================
  
  'section.api.title': {
    ru: 'API Документация',
    en: 'API Documentation',
  },
  
  'section.api.description': {
    ru: 'Полное описание REST API и событий Socket.IO',
    en: 'Complete REST API reference and Socket.IO events documentation',
  },
  
  'section.api.navigation': {
    ru: 'Навигация по API',
    en: 'API Navigation',
  },
  
  'section.api.loading': {
    ru: 'Загрузка документации API...',
    en: 'Loading API documentation...',
  },
  
  'section.technical.title': {
    ru: 'Технические разделы',
    en: 'Technical Sections',
  },
  
  'section.technical.description': {
    ru: 'Архитектура и технические детали',
    en: 'Architecture and technical details',
  },
  
  'section.guides.title': {
    ru: 'Руководства',
    en: 'Guides',
  },
  
  'section.guides.description': {
    ru: 'Пошаговые руководства и туториалы',
    en: 'Step-by-step guides and tutorials',
  },
  
  'section.guides.hub.title': {
    ru: 'Руководства и туториалы',
    en: 'Guides & Tutorials',
  },
  
  'section.guides.hub.description': {
    ru: 'Пошаговые руководства и туториалы, которые помогут вам начать работу и освоить TrueOrDO.',
    en: 'Step-by-step guides and tutorials to help you get started and master TrueOrDO.',
  },
  
  'section.technical.hub.title': {
    ru: 'Техническая документация',
    en: 'Technical Documentation',
  },
  
  'section.technical.hub.description': {
    ru: 'Полная техническая документация, охватывающая архитектуру, детали реализации и проектирование системы.',
    en: 'Comprehensive technical documentation covering architecture, implementation details, and system design.',
  },
  
  'section.plan.title': {
    ru: 'План',
    en: 'Plan',
  },
  
  'section.plan.description': {
    ru: 'Баг-трекер и планирование',
    en: 'Bug tracker and planning',
  },
  
  // Hub page
  'hub.title': {
    ru: 'Документация TrueOrDO',
    en: 'TrueOrDO Documentation',
  },
  
  'hub.description': {
    ru: 'Интерактивная система документации для проекта TrueOrDO. Изучайте полные справочники API, техническую архитектуру, пошаговые руководства и планы разработки.',
    en: 'Interactive documentation system for TrueOrDO project. Explore comprehensive API references, technical architecture, step-by-step guides, and development plans.',
  },
  
  'hub.api.title': {
    ru: 'API Документация',
    en: 'API Documentation',
  },
  
  'hub.api.description': {
    ru: 'Полное описание REST API и событий Socket.IO',
    en: 'Complete REST API reference and Socket.IO events',
  },
  
  'hub.technical.title': {
    ru: 'Технические разделы',
    en: 'Technical Sections',
  },
  
  'hub.technical.description': {
    ru: 'Архитектура и технические детали',
    en: 'Architecture and technical details',
  },
  
  'hub.guides.title': {
    ru: 'Руководства',
    en: 'Guides',
  },
  
  'hub.guides.description': {
    ru: 'Пошаговые руководства и туториалы',
    en: 'Step-by-step guides and tutorials',
  },
  
  'hub.plan.title': {
    ru: 'План разработки',
    en: 'Development Plan',
  },
  
  'hub.plan.description': {
    ru: 'Баг-трекер и дорожная карта разработки',
    en: 'Bug tracker and development roadmap',
  },
  
  // Technical subsections
  'section.technical.auth': {
    ru: 'Аутентификация',
    en: 'Authentication',
  },
  
  'section.technical.client': {
    ru: 'Клиент',
    en: 'Client',
  },
  
  'section.technical.server': {
    ru: 'Сервер',
    en: 'Server',
  },
  
  'section.technical.database': {
    ru: 'База данных',
    en: 'Database',
  },
  
  'section.technical.games': {
    ru: 'Игры',
    en: 'Games',
  },
  
  'section.technical.social': {
    ru: 'Социальные функции',
    en: 'Social Features',
  },
  
  'section.technical.stats': {
    ru: 'Статистика',
    en: 'Statistics',
  },
  
  'section.technical.subscription': {
    ru: 'Подписки',
    en: 'Subscriptions',
  },
  
  'section.technical.deploy': {
    ru: 'Развёртывание',
    en: 'Deployment',
  },
  
  'section.technical.design': {
    ru: 'Дизайн',
    en: 'Design',
  },
  
  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================
  
  'a11y.skipToContent': {
    ru: 'Перейти к содержимому',
    en: 'Skip to content',
  },
  
  'a11y.openMenu': {
    ru: 'Открыть меню',
    en: 'Open menu',
  },
  
  'a11y.closeMenu': {
    ru: 'Закрыть меню',
    en: 'Close menu',
  },
  
  'a11y.expandSection': {
    ru: 'Развернуть раздел',
    en: 'Expand section',
  },
  
  'a11y.collapseSection': {
    ru: 'Свернуть раздел',
    en: 'Collapse section',
  },
  
  // ============================================================================
  // DATES AND TIME
  // ============================================================================
  
  'date.created': {
    ru: 'Создано',
    en: 'Created',
  },
  
  'date.updated': {
    ru: 'Обновлено',
    en: 'Updated',
  },
  
  'date.today': {
    ru: 'Сегодня',
    en: 'Today',
  },
  
  'date.yesterday': {
    ru: 'Вчера',
    en: 'Yesterday',
  },
  
  'date.daysAgo': {
    ru: '{count} дней назад',
    en: '{count} days ago',
  },
  
  // ============================================================================
  // MISC
  // ============================================================================
  
  'misc.readingTime': {
    ru: 'Время чтения: {minutes} мин',
    en: 'Reading time: {minutes} min',
  },
  
  'misc.lastUpdated': {
    ru: 'Последнее обновление',
    en: 'Last updated',
  },
  
  'misc.version': {
    ru: 'Версия',
    en: 'Version',
  },
  
  'misc.author': {
    ru: 'Автор',
    en: 'Author',
  },
  
  'misc.contributors': {
    ru: 'Участники',
    en: 'Contributors',
  },
  
  'misc.license': {
    ru: 'Лицензия',
    en: 'License',
  },
  
  'misc.viewportTooSmall': {
    ru: 'Для оптимального просмотра используйте экран шириной не менее 1280px',
    en: 'For optimal viewing, please use a screen width of at least 1280px',
  },
  
  'misc.onThisPage': {
    ru: 'На этой странице',
    en: 'On this page',
  },
  
  // Breadcrumbs
  'breadcrumb.home': {
    ru: 'Главная',
    en: 'Home',
  },
  
  'breadcrumb.api': {
    ru: 'API',
    en: 'API',
  },
  
  'breadcrumb.technical': {
    ru: 'Технические разделы',
    en: 'Technical',
  },
  
  'breadcrumb.guides': {
    ru: 'Руководства',
    en: 'Guides',
  },
  
  'breadcrumb.plan': {
    ru: 'План',
    en: 'Plan',
  },
  
  'breadcrumb.auth': {
    ru: 'Аутентификация',
    en: 'Authentication',
  },
  
  'breadcrumb.client': {
    ru: 'Клиент',
    en: 'Client',
  },
  
  'breadcrumb.server': {
    ru: 'Сервер',
    en: 'Server',
  },
  
  'breadcrumb.database': {
    ru: 'База данных',
    en: 'Database',
  },
  
  'breadcrumb.games': {
    ru: 'Игры',
    en: 'Games',
  },
  
  'breadcrumb.social': {
    ru: 'Социальные функции',
    en: 'Social',
  },
  
  'breadcrumb.stats': {
    ru: 'Статистика',
    en: 'Statistics',
  },
  
  'breadcrumb.subscription': {
    ru: 'Подписки',
    en: 'Subscription',
  },
  
  'breadcrumb.deploy': {
    ru: 'Развёртывание',
    en: 'Deployment',
  },
  
  'breadcrumb.design': {
    ru: 'Дизайн',
    en: 'Design',
  },
  
  'breadcrumb.startHere': {
    ru: 'Начните здесь',
    en: 'Start Here',
  },
  
  'breadcrumb.instruction': {
    ru: 'Инструкция',
    en: 'Instruction',
  },
  
  'breadcrumb.docsGuide': {
    ru: 'Руководство по документации',
    en: 'Documentation Guide',
  },
  
  'breadcrumb.mcpSetup': {
    ru: 'Настройка MCP',
    en: 'MCP Setup',
  },
  
  'breadcrumb.updatePlan': {
    ru: 'План обновления',
    en: 'Update Plan',
  },
  
  'breadcrumb.finalTasks': {
    ru: 'Финальные задачи',
    en: 'Final Tasks',
  },
  
  // Guide sections
  'guide.startHere.title': {
    ru: 'Начните здесь',
    en: 'Start Here',
  },
  
  'guide.startHere.description': {
    ru: 'Начните свой путь с TrueOrDO',
    en: 'Begin your journey with TrueOrDO',
  },
  
  'guide.instruction.title': {
    ru: 'Инструкция',
    en: 'Instruction',
  },
  
  'guide.instruction.description': {
    ru: 'Основная инструкция (RU)',
    en: 'Main instruction (RU)',
  },
  
  'guide.docsGuide.title': {
    ru: 'Руководство по документации',
    en: 'Documentation Guide',
  },
  
  'guide.docsGuide.description': {
    ru: 'Как работать с документацией',
    en: 'How to work with documentation',
  },
  
  'guide.mcpSetup.title': {
    ru: 'Настройка MCP',
    en: 'MCP Setup',
  },
  
  'guide.mcpSetup.description': {
    ru: 'Настройка MCP серверов',
    en: 'Setting up MCP servers',
  },
  
  'guide.updatePlan.title': {
    ru: 'План обновления',
    en: 'Update Plan',
  },
  
  'guide.updatePlan.description': {
    ru: 'План обновления документации',
    en: 'Documentation update plan',
  },
  
  'guide.finalTasks.title': {
    ru: 'Финальные задачи',
    en: 'Final Tasks',
  },
  
  'guide.finalTasks.description': {
    ru: 'План финальных задач',
    en: 'Final tasks plan',
  },
  
  // Technical sections
  'technical.auth.title': {
    ru: 'Аутентификация',
    en: 'Authentication',
  },
  
  'technical.client.title': {
    ru: 'Клиент',
    en: 'Client',
  },
  
  'technical.server.title': {
    ru: 'Сервер',
    en: 'Server',
  },
  
  'technical.database.title': {
    ru: 'База данных',
    en: 'Database',
  },
  
  'technical.games.title': {
    ru: 'Игры',
    en: 'Games',
  },
  
  'technical.social.title': {
    ru: 'Социальные функции',
    en: 'Social',
  },
  
  'technical.stats.title': {
    ru: 'Статистика',
    en: 'Stats',
  },
  
  'technical.subscription.title': {
    ru: 'Подписки',
    en: 'Subscription',
  },
  
  'technical.deploy.title': {
    ru: 'Развёртывание',
    en: 'Deploy',
  },
  
  'technical.design.title': {
    ru: 'Дизайн',
    en: 'Design',
  },
};
