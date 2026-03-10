# Swagger UI - Инструкция по использованию

## 🚀 Быстрый старт

### Вариант 1: Локальный HTML файл

Откройте файл `docs/swagger-ui.html` в браузере:

```bash
# Windows
start docs/swagger-ui.html

# macOS
open docs/swagger-ui.html

# Linux
xdg-open docs/swagger-ui.html
```

### Вариант 2: NPX (рекомендуется для разработки)

```bash
npx swagger-ui-watcher docs/openapi.yaml
```

Откроется на `http://localhost:8080` с автоматической перезагрузкой при изменении файла.

### Вариант 3: Онлайн редактор

1. Откройте https://editor.swagger.io/
2. File → Import File → выберите `docs/openapi.yaml`

---

## 📖 Возможности Swagger UI

- **Интерактивная документация** - просмотр всех endpoints с описаниями
- **Try it out** - тестирование API прямо из браузера
- **Схемы данных** - просмотр моделей Request/Response
- **Примеры запросов** - готовые примеры для каждого endpoint
- **Коды ошибок** - описание всех возможных ошибок

---

## 🔐 Аутентификация в Swagger UI

API использует cookie-based аутентификацию. Для тестирования:

1. Откройте https://partychaos.ru в браузере
2. Войдите в систему
3. Откройте Swagger UI в той же вкладке браузера
4. Cookie будут автоматически отправляться с запросами

---

## 📝 Обновление документации

После изменения `docs/openapi.yaml`:

1. Swagger UI автоматически обновится (если используете npx)
2. Или обновите страницу в браузере (если используете HTML файл)

---

## 🔗 Ссылки

- [OpenAPI спецификация](./openapi.yaml)
- [Примеры использования API](./API-EXAMPLES.md)
- [Полная документация API](./API-REFERENCE.md)
