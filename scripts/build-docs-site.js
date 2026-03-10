const fs = require('fs');
const path = require('path');

// Список документов
const docs = [
    { name: 'OVERVIEW', icon: '📖', title: 'Обзор проекта' },
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

const docsDir = path.join(__dirname, '..', 'docs');

// Шаблон HTML со встроенным markdown
const createDocPage = (docName, icon, title, markdownContent) => {
    // Экранируем markdown для вставки в JavaScript
    const escapedMarkdown = markdownContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — PartyChaos Docs</title>
    
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7fafc; min-height: 100vh; }
        .top-bar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
        .top-bar-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: white; font-size: 1.5rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        .home-btn { background: rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; transition: all 0.3s ease; backdrop-filter: blur(10px); }
        .home-btn:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
        .container { max-width: 1400px; margin: 0 auto; padding: 40px 30px; display: grid; grid-template-columns: 280px 1fr; gap: 40px; }
        .sidebar { position: sticky; top: 100px; height: fit-content; }
        .sidebar-section { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .sidebar-title { color: #2d3748; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; opacity: 0.7; }
        .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; color: #4a5568; text-decoration: none; border-radius: 8px; transition: all 0.2s ease; font-size: 0.95rem; margin-bottom: 5px; }
        .sidebar-link:hover { background: #f7fafc; color: #667eea; transform: translateX(5px); }
        .sidebar-link.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .content { background: white; border-radius: 20px; padding: 50px; box-shadow: 0 2px 20px rgba(0,0,0,0.05); min-height: 600px; }
        #markdown-content h1 { color: #1a202c; font-size: 2.8rem; font-weight: 700; margin-bottom: 15px; padding-bottom: 20px; border-bottom: 3px solid #667eea; }
        #markdown-content h2 { color: #2d3748; font-size: 2rem; font-weight: 600; margin-top: 50px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        #markdown-content h3 { color: #4a5568; font-size: 1.5rem; font-weight: 600; margin-top: 35px; margin-bottom: 15px; }
        #markdown-content h4 { color: #718096; font-size: 1.2rem; font-weight: 600; margin-top: 25px; margin-bottom: 10px; }
        #markdown-content p { color: #4a5568; line-height: 1.8; margin-bottom: 20px; font-size: 1.05rem; }
        #markdown-content ul, #markdown-content ol { margin-left: 25px; margin-bottom: 20px; line-height: 1.8; }
        #markdown-content li { color: #4a5568; margin-bottom: 10px; font-size: 1.05rem; }
        #markdown-content code { background: #f7fafc; padding: 3px 8px; border-radius: 5px; font-family: 'Monaco', 'Courier New', monospace; color: #e83e8c; font-size: 0.9em; border: 1px solid #e2e8f0; }
        #markdown-content pre { background: #282c34; padding: 25px; border-radius: 12px; overflow-x: auto; margin: 25px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        #markdown-content pre code { background: none; color: #abb2bf; padding: 0; border: none; font-size: 0.95rem; }
        #markdown-content table { width: 100%; border-collapse: collapse; margin: 30px 0; box-shadow: 0 2px 15px rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
        #markdown-content th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; text-align: left; font-weight: 600; font-size: 0.95rem; }
        #markdown-content td { padding: 15px; border-bottom: 1px solid #e2e8f0; color: #4a5568; }
        #markdown-content tr:last-child td { border-bottom: none; }
        #markdown-content tr:hover { background: #f7fafc; }
        #markdown-content blockquote { border-left: 4px solid #667eea; padding: 15px 20px; margin: 25px 0; background: #f7fafc; border-radius: 0 8px 8px 0; color: #4a5568; }
        #markdown-content a { color: #667eea; text-decoration: none; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
        #markdown-content a:hover { border-bottom-color: #667eea; }
        #markdown-content img { max-width: 100%; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        #markdown-content hr { border: none; border-top: 2px solid #e2e8f0; margin: 40px 0; }
        .mermaid { background: #f7fafc; padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #e2e8f0; }
        @media (max-width: 1024px) { .container { grid-template-columns: 1fr; padding: 20px; } .sidebar { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; } .content { padding: 30px 20px; } #markdown-content h1 { font-size: 2rem; } #markdown-content h2 { font-size: 1.6rem; } }
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; }
    </style>
</head>
<body>
    <div class="top-bar">
        <div class="top-bar-content">
            <a href="home.html" class="logo"><span>🎉</span><span>PartyChaos</span></a>
            <a href="home.html" class="home-btn">← На главную</a>
        </div>
    </div>
    <div class="container">
        <aside class="sidebar">
            <div class="sidebar-section">
                <div class="sidebar-title">Основное</div>
                <a href="OVERVIEW.html" class="sidebar-link ${docName === 'OVERVIEW' ? 'active' : ''}"><span>📖</span><span>Обзор</span></a>
                <a href="GAMES.html" class="sidebar-link ${docName === 'GAMES' ? 'active' : ''}"><span>🎮</span><span>Игры</span></a>
                <a href="AUTH.html" class="sidebar-link ${docName === 'AUTH' ? 'active' : ''}"><span>🔐</span><span>Аутентификация</span></a>
                <a href="SOCIAL.html" class="sidebar-link ${docName === 'SOCIAL' ? 'active' : ''}"><span>👥</span><span>Социальные функции</span></a>
                <a href="SUBSCRIPTION.html" class="sidebar-link ${docName === 'SUBSCRIPTION' ? 'active' : ''}"><span>💎</span><span>Подписка</span></a>
                <a href="STATS.html" class="sidebar-link ${docName === 'STATS' ? 'active' : ''}"><span>📈</span><span>Статистика</span></a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-title">Техническое</div>
                <a href="SERVER.html" class="sidebar-link ${docName === 'SERVER' ? 'active' : ''}"><span>🖥️</span><span>Сервер</span></a>
                <a href="CLIENT.html" class="sidebar-link ${docName === 'CLIENT' ? 'active' : ''}"><span>💻</span><span>Клиент</span></a>
                <a href="DATABASE.html" class="sidebar-link ${docName === 'DATABASE' ? 'active' : ''}"><span>🗄️</span><span>База данных</span></a>
                <a href="API-REFERENCE.html" class="sidebar-link ${docName === 'API-REFERENCE' ? 'active' : ''}"><span>📡</span><span>API Reference</span></a>
                <a href="API-EXAMPLES.html" class="sidebar-link ${docName === 'API-EXAMPLES' ? 'active' : ''}"><span>💻</span><span>Примеры API</span></a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-title">Дополнительно</div>
                <a href="DESIGN.html" class="sidebar-link ${docName === 'DESIGN' ? 'active' : ''}"><span>🎨</span><span>Дизайн</span></a>
                <a href="DEPLOY.html" class="sidebar-link ${docName === 'DEPLOY' ? 'active' : ''}"><span>🚀</span><span>Деплой</span></a>
                <a href="DIAGRAMS.html" class="sidebar-link ${docName === 'DIAGRAMS' ? 'active' : ''}"><span>📊</span><span>Диаграммы</span></a>
                <a href="swagger-ui.html" class="sidebar-link"><span>📡</span><span>Swagger UI</span></a>
            </div>
        </aside>
        <main class="content">
            <div id="markdown-content"></div>
        </main>
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        
        const markdown = \`${escapedMarkdown}\`;
        const html = marked.parse(markdown);
        document.getElementById('markdown-content').innerHTML = html;
        
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
        const mermaidBlocks = document.querySelectorAll('code.language-mermaid');
        mermaidBlocks.forEach((block) => {
            const code = block.textContent;
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = code;
            block.parentElement.replaceWith(div);
        });
        
        mermaid.run();
    </script>
</body>
</html>`;
};

// Генерируем HTML файлы
console.log('🚀 Генерация HTML файлов документации...\n');

let successCount = 0;
let errorCount = 0;

docs.forEach(doc => {
    try {
        const mdPath = path.join(docsDir, `${doc.name}.md`);
        
        if (!fs.existsSync(mdPath)) {
            console.log(`⚠️  Пропущен ${doc.name}.html (файл ${doc.name}.md не найден)`);
            errorCount++;
            return;
        }
        
        const markdownContent = fs.readFileSync(mdPath, 'utf8');
        const htmlContent = createDocPage(doc.name, doc.icon, doc.title, markdownContent);
        const htmlPath = path.join(docsDir, `${doc.name}.html`);
        
        fs.writeFileSync(htmlPath, htmlContent, 'utf8');
        console.log(`✅ Создан ${doc.name}.html`);
        successCount++;
        
    } catch (error) {
        console.log(`❌ Ошибка при создании ${doc.name}.html: ${error.message}`);
        errorCount++;
    }
});

console.log(`\n📊 Результаты:`);
console.log(`   ✅ Успешно: ${successCount}`);
console.log(`   ❌ Ошибок: ${errorCount}`);
console.log(`\n🎉 Готово! Откройте docs/home.html для просмотра`);
