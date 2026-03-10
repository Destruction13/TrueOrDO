#!/usr/bin/env python3
"""
Генератор HTML документации из Markdown файлов
Создаёт красивые HTML страницы для каждого .md файла
"""

import os
import re
from pathlib import Path

# HTML шаблон
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - PartyChaos Docs</title>
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 250px 1fr; gap: 20px; animation: fadeIn 0.5s ease; }}
        .sidebar {{ background: white; border-radius: 20px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); height: fit-content; position: sticky; top: 20px; }}
        .sidebar h3 {{ color: #667eea; margin-bottom: 15px; font-size: 1.2rem; }}
        .sidebar ul {{ list-style: none; }}
        .sidebar li {{ margin-bottom: 8px; }}
        .sidebar a {{ color: #333; text-decoration: none; padding: 8px 12px; display: block; border-radius: 8px; transition: all 0.3s ease; font-size: 0.9rem; }}
        .sidebar a:hover, .sidebar a.active {{ background: #667eea; color: white; transform: translateX(5px); }}
        .content {{ background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-height: 500px; }}
        .back-btn {{ display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; margin-bottom: 20px; transition: all 0.3s ease; }}
        .back-btn:hover {{ transform: scale(1.05); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }}
        #markdown-content h1 {{ color: #667eea; font-size: 2.5rem; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #667eea; }}
        #markdown-content h2 {{ color: #764ba2; font-size: 2rem; margin-top: 40px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #eee; }}
        #markdown-content h3 {{ color: #667eea; font-size: 1.5rem; margin-top: 30px; margin-bottom: 10px; }}
        #markdown-content p {{ line-height: 1.8; margin-bottom: 15px; color: #333; }}
        #markdown-content ul, #markdown-content ol {{ margin-left: 30px; margin-bottom: 15px; line-height: 1.8; }}
        #markdown-content li {{ margin-bottom: 8px; }}
        #markdown-content code {{ background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; color: #e83e8c; }}
        #markdown-content pre {{ background: #282c34; padding: 20px; border-radius: 10px; overflow-x: auto; margin: 20px 0; }}
        #markdown-content pre code {{ background: none; color: #abb2bf; padding: 0; }}
        #markdown-content table {{ width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }}
        #markdown-content th {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; text-align: left; font-weight: 600; }}
        #markdown-content td {{ padding: 12px; border-bottom: 1px solid #eee; }}
        #markdown-content tr:hover {{ background: #f8f9fa; }}
        #markdown-content blockquote {{ border-left: 4px solid #667eea; padding-left: 20px; margin: 20px 0; color: #666; font-style: italic; }}
        #markdown-content a {{ color: #667eea; text-decoration: none; border-bottom: 1px solid transparent; transition: all 0.3s ease; }}
        #markdown-content a:hover {{ border-bottom: 1px solid #667eea; }}
        .mermaid {{ background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }}
        @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(20px); }} to {{ opacity: 1; transform: translateY(0); }} }}
        @media (max-width: 768px) {{ .container {{ grid-template-columns: 1fr; }} .sidebar {{ position: static; }} .content {{ padding: 20px; }} }}
        ::-webkit-scrollbar {{ width: 10px; }}
        ::-webkit-scrollbar-track {{ background: #f1f1f1; border-radius: 10px; }}
        ::-webkit-scrollbar-thumb {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <aside class="sidebar">
            <h3>📚 Документация</h3>
            <ul>
                <li><a href="INDEX.html" {active_INDEX}>🏠 Главная</a></li>
                <li><a href="OVERVIEW.html" {active_OVERVIEW}>📖 Обзор</a></li>
                <li><a href="API-REFERENCE.html" {active_API_REFERENCE}>📡 API Reference</a></li>
                <li><a href="API-EXAMPLES.html" {active_API_EXAMPLES}>💻 Примеры API</a></li>
                <li><a href="GAMES.html" {active_GAMES}>🎮 Игры</a></li>
                <li><a href="SERVER.html" {active_SERVER}>🖥️ Сервер</a></li>
                <li><a href="CLIENT.html" {active_CLIENT}>💻 Клиент</a></li>
                <li><a href="DATABASE.html" {active_DATABASE}>🗄️ База данных</a></li>
                <li><a href="AUTH.html" {active_AUTH}>🔐 Аутентификация</a></li>
                <li><a href="SOCIAL.html" {active_SOCIAL}>👥 Социальные функции</a></li>
                <li><a href="SUBSCRIPTION.html" {active_SUBSCRIPTION}>💎 Подписка</a></li>
                <li><a href="STATS.html" {active_STATS}>📈 Статистика</a></li>
                <li><a href="DESIGN.html" {active_DESIGN}>🎨 Дизайн</a></li>
                <li><a href="DEPLOY.html" {active_DEPLOY}>🚀 Деплой</a></li>
                <li><a href="DIAGRAMS.html" {active_DIAGRAMS}>📊 Диаграммы</a></li>
            </ul>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <ul>
                <li><a href="index.html">← Вернуться на главную</a></li>
                <li><a href="swagger-ui.html">📡 Swagger UI</a></li>
            </ul>
        </aside>
        <main class="content">
            <a href="index.html" class="back-btn">← Назад на главную</a>
            <div id="markdown-content"></div>
        </main>
    </div>
    <script>
        mermaid.initialize({{ startOnLoad: true, theme: 'default', securityLevel: 'loose' }});
        marked.setOptions({{
            highlight: function(code, lang) {{
                if (lang && hljs.getLanguage(lang)) {{
                    return hljs.highlight(code, {{ language: lang }}).value;
                }}
                return hljs.highlightAuto(code).value;
            }},
            breaks: true,
            gfm: true
        }});
        
        const markdown = `{markdown_content}`;
        const html = marked.parse(markdown);
        document.getElementById('markdown-content').innerHTML = html;
        
        document.querySelectorAll('pre code').forEach((block) => {{
            hljs.highlightElement(block);
        }});
        
        const mermaidBlocks = document.querySelectorAll('code.language-mermaid');
        mermaidBlocks.forEach((block) => {{
            const code = block.textContent;
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = code;
            block.parentElement.replaceWith(div);
        }});
        
        mermaid.run();
    </script>
</body>
</html>"""

def escape_for_js(text):
    """Экранирует текст для вставки в JavaScript"""
    text = text.replace('\\', '\\\\')
    text = text.replace('`', '\\`')
    text = text.replace('${', '\\${')
    return text

def generate_html(md_file, output_dir):
    """Генерирует HTML из markdown файла"""
    doc_name = md_file.stem
    
    # Читаем markdown
    with open(md_file, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    # Экранируем для JavaScript
    markdown_escaped = escape_for_js(markdown_content)
    
    # Заголовок из имени файла
    title = doc_name.replace('-', ' ').replace('_', ' ')
    
    # Активная ссылка в меню
    active_flags = {}
    for doc in ['INDEX', 'OVERVIEW', 'API-REFERENCE', 'API-EXAMPLES', 'GAMES', 
                'SERVER', 'CLIENT', 'DATABASE', 'AUTH', 'SOCIAL', 'SUBSCRIPTION', 
                'STATS', 'DESIGN', 'DEPLOY', 'DIAGRAMS']:
        key = f'active_{doc.replace("-", "_")}'
        active_flags[key] = 'class="active"' if doc == doc_name else ''
    
    # Генерируем HTML
    html = HTML_TEMPLATE.format(
        title=title,
        markdown_content=markdown_escaped,
        **active_flags
    )
    
    # Сохраняем
    output_file = output_dir / f"{doc_name}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ Создан: {output_file.name}")

def main():
    docs_dir = Path('docs')
    
    # Список файлов для конвертации
    files_to_convert = [
        'INDEX.md', 'OVERVIEW.md', 'API-REFERENCE.md', 'API-EXAMPLES.md',
        'GAMES.md', 'SERVER.md', 'CLIENT.md', 'DATABASE.md', 'AUTH.md',
        'SOCIAL.md', 'SUBSCRIPTION.md', 'STATS.md', 'DESIGN.md', 'DEPLOY.md',
        'DIAGRAMS.md'
    ]
    
    print("🚀 Генерация HTML документации...")
    print()
    
    for filename in files_to_convert:
        md_file = docs_dir / filename
        if md_file.exists():
            generate_html(md_file, docs_dir)
        else:
            print(f"⚠️  Пропущен: {filename} (файл не найден)")
    
    print()
    print("🎉 Готово! Откройте docs/index.html в браузере")

if __name__ == '__main__':
    main()
