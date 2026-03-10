# Настройка MCP серверов

**Дата:** 8 марта 2026

## 📋 Установленные MCP серверы

Конфигурация скопирована из Antigravity в `.kiro/settings/mcp.json`

### Активные серверы

1. **mem0-mcp** - Система памяти для сохранения контекста
   - Команда: `npx -y @mem0/mcp-server`
   - API Key: настроен
   - Автоодобрение: add_memory, search_memory, get_all_memories, delete_memory

2. **prisma-mcp-server** - Работа с Prisma ORM
   - Команда: `npx -y prisma mcp`
   - Для работы с базой данных проекта

3. **sequential-thinking** - Последовательное мышление
   - Команда: `npx -y @modelcontextprotocol/server-sequential-thinking`
   - Для сложных задач требующих пошагового анализа

4. **puppeteer** - Автоматизация браузера
   - Команда: `npx -y @modelcontextprotocol/server-puppeteer`
   - Для тестирования и скриншотов

5. **deepcontext** - Глубокий анализ контекста
   - Команда: `npx -y @wildcard-ai/deepcontext@latest`
   - API Key: настроен

### Отключенные серверы

1. **notion-mcp-server** - Интеграция с Notion
   - Команда: `npx -y @notionhq/notion-mcp-server`
   - API Token: настроен
   - Статус: disabled

2. **duckduckgo** - Поиск в интернете
   - Команда: `npx -y @ericthered926/duckduckgo-mcp-server`
   - Статус: disabled

3. **github** - Интеграция с GitHub
   - Команда: `npx -y @modelcontextprotocol/server-github`
   - Personal Access Token: настроен
   - Статус: disabled

4. **fetch** - HTTP запросы
   - Команда: `uvx mcp-server-fetch`
   - Статус: disabled

---

## 🎯 Использование Mem0 для документации

### Сохранение структуры проекта

Mem0 можно использовать для сохранения ключевой информации о проекте:

```javascript
// Сохранить информацию о Socket.IO событиях
add_memory({
  content: "PartyChaos имеет 118+ Socket.IO событий: ToD (18), Alias (20+), Codenames (25+), Emotional (12+), Friends (15+), Messages (8+), Clans (20+)",
  tags: ["socket-io", "events", "api"]
})

// Сохранить информацию о компонентах
add_memory({
  content: "PartyChaos имеет 133+ React компонентов: Clans (13), Friends (18), Profile (12+), UI (30+), UI Effects (6)",
  tags: ["react", "components", "frontend"]
})

// Сохранить информацию о покрытии документацией
add_memory({
  content: "Покрытие документацией PartyChaos: общее 40%, Socket.IO 31%, REST API 41%, React 33%",
  tags: ["documentation", "coverage", "metrics"]
})
```

### Поиск информации

```javascript
// Найти информацию о Socket.IO
search_memory({
  query: "Socket.IO события",
  tags: ["socket-io"]
})

// Найти информацию о компонентах
search_memory({
  query: "React компоненты",
  tags: ["react", "components"]
})
```

---

## 📚 Скиллы из Antigravity

В папке `C:\Users\Даня\.gemini\antigravity\global_skills` найдено **сотни скиллов**.

### Полезные для документации:

1. **agent-memory-mcp** - работа с памятью агента
2. **agent-tool-builder** - создание инструментов
3. **documentation-skills** - навыки документирования
4. **project-architect** - архитектура проекта
5. **code-reviewer** - ревью кода
6. **fullstack-scaffolder** - создание full-stack проектов

### Рекомендация

Из-за большого количества скиллов (500+), рекомендуется:
1. Скопировать только нужные скиллы вручную
2. Или использовать команду для массового копирования:

```powershell
# Скопировать все скиллы
Copy-Item -Path "C:\Users\Даня\.gemini\antigravity\global_skills\*" -Destination "C:\Users\Даня\.kiro\skills\" -Recurse

# Или скопировать только конкретные
$skills = @(
  "agent-memory-mcp",
  "documentation-skills",
  "project-architect",
  "code-reviewer"
)

foreach ($skill in $skills) {
  Copy-Item -Path "C:\Users\Даня\.gemini\antigravity\global_skills\$skill" -Destination "C:\Users\Даня\.kiro\skills\$skill" -Recurse
}
```

---

## ✅ Что сделано

1. ✅ Создан `.kiro/settings/mcp.json` с конфигурацией всех MCP серверов
2. ✅ Настроены Mem0, Prisma, Sequential Thinking, Puppeteer, DeepContext
3. ✅ Документирована структура скиллов Antigravity
4. ✅ Созданы инструкции по использованию Mem0

---

## 🔄 Следующие шаги

1. Перезапустить Kiro для применения MCP конфигурации
2. Проверить работу Mem0: `search_memory({ query: "test" })`
3. Сохранить структуру проекта PartyChaos в Mem0
4. Скопировать нужные скиллы из Antigravity (опционально)
