const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// Truth or Dare: Wheels data
// ═══════════════════════════════════════════════════════════════════════════
const wheelsFilePath = path.join(__dirname, "..", "data", "wheels.json");
const wheelsRaw = fs.readFileSync(wheelsFilePath, "utf8");
const wheelsData = JSON.parse(wheelsRaw.replace(/^\uFEFF/, ""));

const categories = wheelsData.categories || [];
const totalItems = categories.reduce((sum, category) => sum + (category.items || []).length, 0);

console.log(`[Wheels] Loaded: ${categories.length} categories, ${totalItems} scenarios.`);

// ═══════════════════════════════════════════════════════════════════════════
// Alias: Words import from txt files
// ═══════════════════════════════════════════════════════════════════════════
async function seedAliasWords() {
  const aliasDir = path.join(__dirname, "..", "data", "alias");
  const difficulties = ["easy", "normal", "hard"];
  
  let totalWords = 0;
  
  // Сначала проверим, есть ли уже слова в базе
  const existingCount = await prisma.aliasWord.count();
  if (existingCount > 0) {
    console.log(`[Alias] Already have ${existingCount} words in database, skipping import`);
    return;
  }
  
  for (const difficulty of difficulties) {
    const filePath = path.join(aliasDir, `${difficulty}.txt`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`[Alias] File not found: ${filePath}, skipping...`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    
    const words = lines
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0);
    
    // Убираем дубликаты внутри файла
    const uniqueWords = [...new Set(words)];
    totalWords += uniqueWords.length;
    
    // Разбиваем на батчи по 500 для стабильности SQLite
    const BATCH_SIZE = 500;
    let inserted = 0;
    
    for (let i = 0; i < uniqueWords.length; i += BATCH_SIZE) {
      const batch = uniqueWords.slice(i, i + BATCH_SIZE);
      
      // Используем raw SQL для быстрой вставки
      const values = batch.map(text => `('${text.replace(/'/g, "''")}', '${difficulty}', 1)`).join(',');
      
      try {
        await prisma.$executeRawUnsafe(`
          INSERT OR IGNORE INTO AliasWord (id, text, difficulty, isActive, createdAt)
          SELECT lower(hex(randomblob(12))), text, difficulty, isActive, datetime('now')
          FROM (SELECT column1 as text, column2 as difficulty, column3 as isActive FROM (VALUES ${values}))
        `);
        inserted += batch.length;
      } catch (error) {
        console.error(`[Alias] Batch insert error:`, error.message);
      }
    }
    
    console.log(`[Alias] ${difficulty}: ${uniqueWords.length} unique words processed`);
  }
  
  const totalInDb = await prisma.aliasWord.count();
  console.log(`[Alias] Total: ${totalWords} words processed, ${totalInDb} words in database`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main seed function
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("Starting seed...");
  
  // Seed Alias words
  await seedAliasWords();
  
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
