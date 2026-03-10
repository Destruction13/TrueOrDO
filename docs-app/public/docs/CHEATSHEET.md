# 📋 Шпаргалка по документации TrueOrDO

## 🎯 Быстрый доступ

| Что нужно | Куда идти |
|-----------|-----------|
| **Начать работу** | [index.html](index.html) или [START-HERE.html](START-HERE.html) |
| **Найти что-то** | Используйте поиск на [index.html](index.html) |
| **API документация** | [api/api-viewer.html](api/api-viewer.html) или [api/swagger-ui.html](api/swagger-ui.html) |
| **Просмотр Markdown** | [viewer.html?file=путь.md](viewer.html) |
| **Инструкция** | [QUICK-START.md](QUICK-START.md) |
| **Полное руководство** | [HTML-VIEWERS-GUIDE.md](HTML-VIEWERS-GUIDE.md) |

## 📁 Структура папок

```
docs/
├── 🏠 index.html              - Главная страница
├── 📖 viewer.html             - Просмотр Markdown
├── 🚀 START-HERE.html         - Приветственная страница
├── 📋 QUICK-START.md          - Быстрый старт
├── 📚 HTML-VIEWERS-GUIDE.md   - Руководство по вьюерам
│
├── 📡 api/                    - API документация
│   ├── api-viewer.html        - Интерактивный вьюер
│   ├── swagger-ui.html        - Swagger UI
│   ├── API-REFERENCE.md       - Полный справочник
│   └── API-EXAMPLES.md        - Примеры
│
├── ⚙️ technical/              - Техническая документация
│   ├── AUTH.md                - Аутентификация
│   ├── DATABASE.md            - База данных
│   ├── GAMES.md               - Игровые модули
│   ├── SERVER.md              - Серверная часть
│   ├── CLIENT.md              - Клиентская часть
│   ├── SOCIAL.md              - Социальные функции
│   ├── STATS.md               - Статистика
│   ├── SUBSCRIPTION.md        - Подписки
│   ├── DESIGN.md              - Дизайн система
│   └── DEPLOY.md              - Развертывание
│
├── 📘 guides/                 - Руководства
│   ├── START-HERE.md          - Начните отсюда
│   ├── ИНСТРУКЦИЯ.md          - Основная инструкция
│   ├── DOCS-GUIDE.md          - Руководство по документации
│   └── MCP-SETUP.md           - Настройка MCP
│
├── 🗺️ overview/              - Обзор
│   ├── OVERVIEW.md            - Общий обзор
│   ├── DIAGRAMS.md            - Диаграммы
│   └── INDEX.md               - Индекс
│
└── 📋 reports/                - Отчеты
    ├── SYSTEM-STATUS.md       - Текущий статус
    └── FINAL-COMPLETION-REPORT.md
```

## 🔍 Как найти информацию

### По ролям

**Менеджер / Аналитик**
```
1. index.html → Обзор проекта
2. overview/OVERVIEW.md
3. reports/SYSTEM-STATUS.md
```

**Разработчик**
```
1. api/api-viewer.html или api/swagger-ui.html
2. technical/SERVER.md или technical/CLIENT.md
3. api/API-EXAMPLES.md
```

**Дизайнер**
```
1. technical/DESIGN.md
2. technical/CLIENT.md
3. index.html → Дизайн система
```

**Тестировщик**
```
1. api/API-EXAMPLES.md
2. technical/GAMES.md
3. api/API-REFERENCE.md
```

**DevOps**
```
1. technical/DEPLOY.md
2. technical/SERVER.md
3. technical/DATABASE.md
```

### По темам

| Тема | Документ |
|------|----------|
| Аутентификация | `technical/AUTH.md` |
| База данных | `technical/DATABASE.md` |
| Игры | `technical/GAMES.md` |
| API | `api/API-REFERENCE.md` |
| Социальные функции | `technical/SOCIAL.md` |
| Подписки | `technical/SUBSCRIPTION.md` |
| Дизайн | `technical/DESIGN.md` |
| Развертывание | `technical/DEPLOY.md` |

## 🎨 Цветовая кодировка

### HTTP методы в API вьюере
- 🔵 **GET** - получение данных
- 🟢 **POST** - создание данных
- 🟡 **PUT** - полное обновление
- 🟣 **PATCH** - частичное обновление
- 🔴 **DELETE** - удаление

### Статусы авторизации
- 🔴 **Требуется авторизация** - нужен токен
- 🟢 **Публичный** - доступен всем

### Socket.IO направления
- 🔵 **→ Server** - от клиента к серверу
- 🟣 **← Server** - от сервера к клиенту

## ⌨️ Горячие клавиши

| Действие | Клавиши |
|----------|---------|
| Поиск на странице | `Ctrl + F` (Windows) / `Cmd + F` (Mac) |
| Печать | `Ctrl + P` (Windows) / `Cmd + P` (Mac) |
| Добавить в закладки | `Ctrl + D` (Windows) / `Cmd + D` (Mac) |
| Обновить страницу | `F5` или `Ctrl + R` |
| Открыть консоль | `F12` |

## 🔗 Полезные ссылки

### Внутренние
- [Главная](index.html)
- [API Reference](api/api-viewer.html)
- [Swagger UI](api/swagger-ui.html)
- [Быстрый старт](QUICK-START.md)
- [Руководство](HTML-VIEWERS-GUIDE.md)

### Просмотр через viewer.html
```
viewer.html?file=technical/AUTH.md
viewer.html?file=guides/START-HERE.md
viewer.html?file=api/API-REFERENCE.md
```

## 💡 Советы

### Для быстрой работы
1. Добавьте `index.html` в закладки браузера
2. Используйте поиск вместо ручной навигации
3. Открывайте документы в новых вкладках (Ctrl + клик)

### Для печати
1. Откройте документ через `viewer.html`
2. Нажмите кнопку "🖨️ Печать"
3. Выберите "Сохранить как PDF" для цифровой копии

### Для офлайн работы
1. Скачайте всю папку `docs/`
2. Откройте `index.html` локально
3. Все будет работать без интернета (кроме Marked.js CDN)

## 🐛 Решение проблем

### Страница не загружается
- Проверьте, что файл находится в папке `docs/`
- Убедитесь, что используете современный браузер
- Откройте консоль (F12) и проверьте ошибки

### Markdown не отображается
- Проверьте путь к файлу в параметре `?file=`
- Убедитесь, что есть интернет (для Marked.js)
- Проверьте, что файл существует

### Поиск не работает
- Обновите страницу (F5)
- Очистите кэш браузера
- Попробуйте другой браузер

## 📞 Контакты

Если не нашли ответ:
1. Проверьте [HTML-VIEWERS-GUIDE.md](HTML-VIEWERS-GUIDE.md)
2. Используйте поиск на [index.html](index.html)
3. Обратитесь к команде разработки

---

**Последнее обновление**: 8 марта 2026
