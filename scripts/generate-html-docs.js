const fs = require('fs');
const path = require('path');

// Список документов для генерации
const docs = [
    { name: 'OVERVIEW', icon: '📖', title: 'Обзор' },
    { name: 'GAMES', icon: '🎮', title: 'Игры' },
    { name: 'AUTH', icon: '🔐', title: 'Аутентификация' },
    { name: 'SOCIAL', icon: '👥', title: 'Социальные функции' },
    { name: 'SUBSCRIPTION', icon: '💎', title: 'Подписка' },
    { name: 'STATS', icon: '📈', title: 'Статистика' },
    { name: 'SERVER', icon: '🖥️', title: 'Сервер' },
    { name: 'CLIENT', icon: '💻', title: 'Клиент' },
    { name: 'DATABASE', icon: '🗄️', title: 'База данных' },
    { name: 'API-REFERENCE', icon: '📡', title: 'API Reference' },
    { name: 'API-EXAMPLES', icon: '💻', title: 'Примеры API' },
    { name: 'DESIGN', icon: '🎨', title: 'Дизайн' },
    { name: 'DEPLOY', icon: '🚀', title: 'Деплой' },
    { name: 'DIAGRAMS', icon: '📊', title: 'Диаграммы' }
];

// Шаблон HTML
const template = (docName, icon, title) => `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — PartyChaos Docs</title>
    <script>
        // Редирект на новый viewer
        window.location.href = 'doc-viewer.html?doc=${docName}';
    </script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .message {
            text-align: center;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="message">
        <div class="icon">${icon}</div>
        <h1>Перенаправление...</h1>
        <p>Загрузка документации "${title}"</p>
    </div>
</body>
</html>`;

// Генерируем HTML файлы
const docsDir = path.join(__dirname, '..', 'docs');

docs.forEach(doc => {
    const htmlContent = template(doc.name, doc.icon, doc.title);
    const filePath = path.join(docsDir, `${doc.name}.html`);
    
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`✅ Создан ${doc.name}.html`);
});

console.log(`\n🎉 Успешно создано ${docs.length} HTML файлов!`);
console.log('\n📝 Откройте docs/home.html для просмотра документации');
