#!/usr/bin/env node

/**
 * Скрипт проверки документации PartyChaos
 * Проверяет наличие всех необходимых файлов и их корректность
 */

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');

// Список всех документов, которые должны существовать
const requiredDocs = [
    { html: 'OVERVIEW.html', md: 'OVERVIEW.md', title: 'Обзор проекта' },
    { html: 'GAMES.html', md: 'GAMES.md', title: 'Игры' },
    { html: 'AUTH.html', md: 'AUTH.md', title: 'Аутентификация' },
    { html: 'SOCIAL.html', md: 'SOCIAL.md', title: 'Социальные функции' },
    { html: 'SUBSCRIPTION.html', md: 'SUBSCRIPTION.md', title: 'Подписка' },
    { html: 'STATS.html', md: 'STATS.md', title: 'Статистика' },
    { html: 'SERVER.html', md: 'SERVER.md', title: 'Сервер' },
    { html: 'CLIENT.html', md: 'CLIENT.md', title: 'Клиент' },
    { html: 'DATABASE.html', md: 'DATABASE.md', title: 'База данных' },
    { html: 'API-REFERENCE.html', md: 'API-REFERENCE.md', title: 'API Reference' },
    { html: 'API-EXAMPLES.html', md: 'API-EXAMPLES.md', title: 'Примеры API' },
    { html: 'DESIGN.html', md: 'DESIGN.md', title: 'Дизайн' },
    { html: 'DEPLOY.html', md: 'DEPLOY.md', title: 'Деплой' },
    { html: 'DIAGRAMS.html', md: 'DIAGRAMS.md', title: 'Диаграммы' }
];

console.log('🔍 Проверка документации PartyChaos\n');
console.log('=' .repeat(60));

let allGood = true;
let htmlCount = 0;
let mdCount = 0;
let missingHtml = [];
let missingMd = [];
let emptyFiles = [];

// Проверка главной страницы
const homePath = path.join(docsDir, 'home.html');
if (fs.existsSync(homePath)) {
    const stats = fs.statSync(homePath);
    console.log(`✅ home.html найден (${(stats.size / 1024).toFixed(2)} KB)`);
} else {
    console.log('❌ home.html НЕ НАЙДЕН!');
    allGood = false;
}

console.log('\n' + '─'.repeat(60) + '\n');

// Проверка всех документов
requiredDocs.forEach((doc, index) => {
    const htmlPath = path.join(docsDir, doc.html);
    const mdPath = path.join(docsDir, doc.md);
    
    console.log(`${index + 1}. ${doc.title}`);
    
    // Проверка HTML
    if (fs.existsSync(htmlPath)) {
        const stats = fs.statSync(htmlPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        if (stats.size === 0) {
            console.log(`   ⚠️  ${doc.html} - ПУСТОЙ ФАЙЛ`);
            emptyFiles.push(doc.html);
            allGood = false;
        } else {
            console.log(`   ✅ ${doc.html} (${sizeKB} KB)`);
            htmlCount++;
            
            // Проверка содержимого HTML
            const content = fs.readFileSync(htmlPath, 'utf8');
            if (!content.includes('markdown-content')) {
                console.log(`   ⚠️  ${doc.html} - отсутствует контейнер markdown-content`);
                allGood = false;
            }
            if (!content.includes('marked.parse')) {
                console.log(`   ⚠️  ${doc.html} - отсутствует парсинг markdown`);
                allGood = false;
            }
        }
    } else {
        console.log(`   ❌ ${doc.html} - НЕ НАЙДЕН`);
        missingHtml.push(doc.html);
        allGood = false;
    }
    
    // Проверка MD
    if (fs.existsSync(mdPath)) {
        const stats = fs.statSync(mdPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ${doc.md} (${sizeKB} KB)`);
        mdCount++;
    } else {
        console.log(`   ⚠️  ${doc.md} - не найден (HTML может быть устаревшим)`);
        missingMd.push(doc.md);
    }
    
    console.log('');
});

// Итоговая статистика
console.log('=' .repeat(60));
console.log('\n📊 СТАТИСТИКА:\n');
console.log(`   HTML файлов: ${htmlCount}/${requiredDocs.length}`);
console.log(`   MD файлов: ${mdCount}/${requiredDocs.length}`);

if (missingHtml.length > 0) {
    console.log(`\n❌ Отсутствующие HTML файлы (${missingHtml.length}):`);
    missingHtml.forEach(file => console.log(`   - ${file}`));
}

if (missingMd.length > 0) {
    console.log(`\n⚠️  Отсутствующие MD файлы (${missingMd.length}):`);
    missingMd.forEach(file => console.log(`   - ${file}`));
}

if (emptyFiles.length > 0) {
    console.log(`\n⚠️  Пустые файлы (${emptyFiles.length}):`);
    emptyFiles.forEach(file => console.log(`   - ${file}`));
}

console.log('\n' + '=' .repeat(60));

if (allGood && htmlCount === requiredDocs.length) {
    console.log('\n✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!');
    console.log('\n🎉 Документация готова к использованию!');
    console.log(`\n📂 Откройте файл: ${path.join(docsDir, 'home.html')}`);
    process.exit(0);
} else {
    console.log('\n❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ!');
    console.log('\n💡 Запустите: node scripts/build-docs-site.js');
    process.exit(1);
}
