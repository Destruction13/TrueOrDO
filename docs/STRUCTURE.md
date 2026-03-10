# 🗺️ Карта Документации

Визуальная структура организации документации проекта TrueOrDO.

```
docs/
│
├── 📄 index.html              # Главная страница (веб-интерфейс)
├── 📄 README.md               # Этот файл - обзор структуры
│
├── 📁 api/                    # API Документация
│   ├── 📄 README.md
│   ├── 📄 openapi.yaml        # OpenAPI спецификация
│   ├── 🌐 swagger-ui.html     # Интерактивный Swagger UI
│   ├── 📄 API-REFERENCE.md    # Полный справочник
│   ├── 🌐 API-REFERENCE.html
│   ├── 📄 API-EXAMPLES.md     # Примеры использования
│   ├── 🌐 API-EXAMPLES.html
│   ├── 📄 API-COMPLETE.md
│   ├── 📄 API-DOCS-LINKS.md
│   └── 📄 SWAGGER-USAGE.md
│
├── 📁 technical/              # Техническая документация
│   ├── 📄 README.md
│   ├── 📄 AUTH.md             # Аутентификация
│   ├── 🌐 AUTH.html
│   ├── 📄 CLIENT.md           # Клиент
│   ├── 🌐 CLIENT.html
│   ├── 📄 SERVER.md           # Сервер
│   ├── 🌐 SERVER.html
│   ├── 📄 DATABASE.md         # База данных
│   ├── 🌐 DATABASE.html
│   ├── 📄 GAMES.md            # Игры
│   ├── 🌐 GAMES.html
│   ├── 📄 SOCIAL.md           # Социальные функции
│   ├── 🌐 SOCIAL.html
│   ├── 📄 STATS.md            # Статистика
│   ├── 🌐 STATS.html
│   ├── 📄 SUBSCRIPTION.md     # Подписки
│   ├── 🌐 SUBSCRIPTION.html
│   ├── 📄 DESIGN.md           # Дизайн
│   ├── 🌐 DESIGN.html
│   ├── 📄 DEPLOY.md           # Деплой
│   └── 🌐 DEPLOY.html
│
├── 📁 guides/                 # Руководства
│   ├── 📄 README.md
│   ├── 📄 START-HERE.md       # ⭐ Начните отсюда
│   ├── 📄 ИНСТРУКЦИЯ.md       # Основная инструкция (RU)
│   ├── 📄 DOCS-GUIDE.md       # Руководство по документации
│   ├── 📄 MCP-SETUP.md        # Настройка MCP
│   ├── 📄 DOCUMENTATION-UPDATE-PLAN.md
│   └── 📄 FINAL-TASKS-PLAN.md
│
├── 📁 overview/               # Обзорная документация
│   ├── 📄 README.md
│   ├── 📄 OVERVIEW.md         # Общий обзор
│   ├── 🌐 OVERVIEW.html
│   ├── 📄 DIAGRAMS.md         # Диаграммы
│   ├── 🌐 DIAGRAMS.html
│   └── 📄 INDEX.md            # Индекс
│
├── 📁 reports/                # Отчеты и статусы
│   ├── 📄 README.md
│   ├── 📄 SYSTEM-STATUS.md    # Текущий статус
│   ├── 📄 UPDATE-PROGRESS.md  # Прогресс обновлений
│   ├── 📄 COMPLETION-REPORT.md
│   ├── 📄 FINAL-COMPLETION-REPORT.md
│   ├── 📄 VERIFICATION-REPORT.md
│   ├── 📄 VERIFICATION-REPORT-V2.md
│   ├── 📄 VERIFICATION-REPORT-FINAL.md
│   ├── 📄 VISUAL-DOCS-REPORT.md
│   ├── 📄 ГОТОВО.md           # (RU)
│   └── 📄 ФИНАЛЬНЫЙ-ОТЧЕТ.md  # (RU)
│
└── 📁 viewers/                # HTML просмотрщики
    ├── 📄 README.md
    ├── 🌐 INDEX.html          # Главная страница
    ├── 🌐 INDEX-DOC.html      # Индекс документов
    ├── 🌐 home.html           # Домашняя страница
    ├── 🌐 viewer.html         # Универсальный просмотрщик
    └── 🌐 doc-viewer.html     # Просмотрщик документов
```

## 🎯 Навигация по типам задач

### Я хочу начать работу с проектом
→ `guides/START-HERE.md`

### Мне нужна документация API
→ `api/swagger-ui.html` (интерактивно)
→ `api/API-REFERENCE.md` (справочник)

### Я ищу информацию о конкретном модуле
→ `technical/[MODULE].md`

### Мне нужен общий обзор проекта
→ `overview/OVERVIEW.md`

### Я хочу посмотреть диаграммы
→ `overview/DIAGRAMS.md`

### Мне нужен статус проекта
→ `reports/SYSTEM-STATUS.md`

### Я хочу удобный веб-интерфейс
→ `index.html` (откройте в браузере)

## 📊 Статистика

- **Всего категорий**: 6
- **API документов**: 10
- **Технических модулей**: 10 (по 2 формата)
- **Руководств**: 6
- **Отчетов**: 10
- **Viewers**: 5
- **Обзорных документов**: 4

## 🔄 Обновление структуры

При добавлении новых документов следуйте логике:

1. **API документация** → `api/`
2. **Технические модули** → `technical/`
3. **Руководства** → `guides/`
4. **Обзоры и диаграммы** → `overview/`
5. **Отчеты** → `reports/`
6. **HTML viewers** → `viewers/`

---

**Дата создания структуры**: 8 марта 2026
