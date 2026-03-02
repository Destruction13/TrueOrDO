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
// Frames: Декоративные рамки для аватаров
// ═══════════════════════════════════════════════════════════════════════════
async function seedFrames() {
  // Проверяем, есть ли уже рамки в базе
  const existingCount = await prisma.frame.count();
  if (existingCount > 0) {
    console.log(`[Frames] Already have ${existingCount} frames in database, skipping import`);
    return;
  }

  // Начальные рамки (slug соответствует именам файлов в /frames/)
  // Формат файлов: {slug}.png (один файл 1024x1024, без фона)
  const frames = [
    {
      name: "Cyberpunk 2077",
      slug: "Cuberpunk2077",
      game: "all",
      accessType: "free",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "One Two",
      slug: "onetwo",
      game: "all",
      accessType: "free",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Alien",
      slug: "ALIEN",
      game: "all",
      accessType: "free",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "DOTA 2",
      slug: "DOTA2",
      game: "all",
      accessType: "purchasable",
      price: 5000, // 50 рублей в копейках
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Game of Thrones",
      slug: "GOT",
      game: "all",
      accessType: "free",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "OSD",
      slug: "OSD",
      game: "all",
      accessType: "purchasable",
      price: 5000, // 50 рублей в копейках
      sortOrder: 6,
      isActive: true,
    },
    {
      name: "Scandinavia",
      slug: "SCANDINAVIA",
      game: "all",
      accessType: "free",
      sortOrder: 7,
      isActive: true,
    },
    // ═══════════════════════════════════════════════════════════════
    // GAME-SPECIFIC FRAMES (Рамки для конкретных игр)
    // Требуются файлы: /frames/{slug}.png
    // ═══════════════════════════════════════════════════════════════
    // Alias-специфичные рамки
    {
      name: "Мастер слов",
      slug: "alias-wordmaster",
      game: "alias",
      accessType: "vip",
      sortOrder: 10,
      isActive: false, // Активировать когда будет PNG файл
    },
    {
      name: "Alias Pro",
      slug: "alias-pro",
      game: "alias",
      accessType: "pro",
      sortOrder: 11,
      isActive: false,
    },
    // Truth or Dare специфичные рамки
    {
      name: "Правда или Действие",
      slug: "tod-classic",
      game: "tod",
      accessType: "vip",
      sortOrder: 20,
      isActive: false,
    },
    {
      name: "Экстремал",
      slug: "tod-extreme",
      game: "tod",
      accessType: "pro",
      sortOrder: 21,
      isActive: false,
    },
    // Codenames специфичные рамки
    {
      name: "Агент",
      slug: "codenames-agent",
      game: "codenames",
      accessType: "vip",
      sortOrder: 30,
      isActive: false,
    },
    {
      name: "Спаймастер",
      slug: "codenames-spymaster",
      game: "codenames",
      accessType: "pro",
      sortOrder: 31,
      isActive: false,
    },
    // Emotional Intelligence специфичные рамки
    {
      name: "Эмпат",
      slug: "emotional-empath",
      game: "emotional",
      accessType: "vip",
      sortOrder: 40,
      isActive: false,
    },
    {
      name: "Психолог",
      slug: "emotional-psychologist",
      game: "emotional",
      accessType: "pro",
      sortOrder: 41,
      isActive: false,
    },
  ];

  for (const frame of frames) {
    await prisma.frame.create({ data: frame });
  }

  console.log(`[Frames] Seeded ${frames.length} frames`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Nickname Gradients: Градиенты для никнейма
// ═══════════════════════════════════════════════════════════════════════════
async function seedNicknameGradients() {
  const existingCount = await prisma.nicknameGradient.count();
  if (existingCount > 0) {
    console.log(`[Gradients] Already have ${existingCount} gradients in database, skipping import`);
    return;
  }

  const gradients = [
    {
      name: "Огненный",
      slug: "fire",
      cssValue: "linear-gradient(90deg, #ff512f 0%, #f09819 100%)",
      accessType: "free",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Океан",
      slug: "ocean",
      cssValue: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
      accessType: "free",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Закат",
      slug: "sunset",
      cssValue: "linear-gradient(90deg, #f093fb 0%, #f5576c 100%)",
      accessType: "free",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "Киберпанк",
      slug: "cyberpunk",
      cssValue: "linear-gradient(90deg, #00d4ff 0%, #ff00ff 50%, #00d4ff 100%)",
      accessType: "free",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Золото",
      slug: "gold",
      cssValue: "linear-gradient(90deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)",
      accessType: "free",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "Изумруд",
      slug: "emerald",
      cssValue: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
      accessType: "free",
      sortOrder: 6,
      isActive: true,
    },
    {
      name: "Северное сияние",
      slug: "aurora",
      cssValue: "linear-gradient(90deg, #00c6ff 0%, #0072ff 50%, #7c3aed 100%)",
      accessType: "free",
      sortOrder: 7,
      isActive: true,
    },
    {
      name: "Радуга",
      slug: "rainbow",
      cssValue: "linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)",
      accessType: "free",
      sortOrder: 8,
      isActive: true,
    },
  ];

  for (const gradient of gradients) {
    await prisma.nicknameGradient.create({ data: gradient });
  }

  console.log(`[Gradients] Seeded ${gradients.length} nickname gradients`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Nickname Glows: Эффекты свечения для никнейма
// ═══════════════════════════════════════════════════════════════════════════
async function seedNicknameGlows() {
  const existingCount = await prisma.nicknameGlow.count();
  if (existingCount > 0) {
    console.log(`[Glows] Already have ${existingCount} glows in database, skipping import`);
    return;
  }

  const glows = [
    {
      name: "Мягкое белое",
      slug: "soft-white",
      cssValue: "0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)",
      accessType: "free",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Неоновое синее",
      slug: "neon-blue",
      cssValue: "0 0 5px #00d4ff, 0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 40px #00d4ff",
      accessType: "free",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Неоновое розовое",
      slug: "neon-pink",
      cssValue: "0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 40px #ff00ff",
      accessType: "free",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "Огненное",
      slug: "fire",
      cssValue: "0 0 5px #ff6600, 0 0 15px #ff3300, 0 0 30px #ff0000",
      accessType: "free",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Ледяное",
      slug: "ice",
      cssValue: "0 0 5px #00ffff, 0 0 15px #00bfff, 0 0 30px #0080ff",
      accessType: "free",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "Золотое сияние",
      slug: "gold",
      cssValue: "0 0 5px #ffd700, 0 0 15px #ffb700, 0 0 30px #ff9500",
      accessType: "free",
      sortOrder: 6,
      isActive: true,
    },
    {
      name: "Токсичное",
      slug: "toxic",
      cssValue: "0 0 5px #39ff14, 0 0 15px #32cd32, 0 0 30px #228b22",
      accessType: "free",
      sortOrder: 7,
      isActive: true,
    },
    {
      name: "Пурпурное",
      slug: "purple",
      cssValue: "0 0 5px #9400d3, 0 0 15px #8b008b, 0 0 30px #4b0082",
      accessType: "free",
      sortOrder: 8,
      isActive: true,
    },
  ];

  for (const glow of glows) {
    await prisma.nicknameGlow.create({ data: glow });
  }

  console.log(`[Glows] Seeded ${glows.length} nickname glows`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Nickname Effects: Анимированные эффекты никнейма (PRO)
// ═══════════════════════════════════════════════════════════════════════════
async function seedNicknameEffects() {
  const existingCount = await prisma.nicknameEffect.count();
  if (existingCount > 0) {
    console.log(`[Effects] Already have ${existingCount} effects in database, skipping import`);
    return;
  }

  const effects = [
    {
      name: "Искры",
      slug: "sparkles",
      component: "SparklesText",
      config: JSON.stringify({
        sparklesCount: 10,
        colors: ["#FFD700", "#FFA500", "#FF6347", "#FFFFFF"],
        speed: 0.8
      }),
      accessType: "pro",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Мерцание",
      slug: "shimmer",
      component: "ShimmerText",
      config: JSON.stringify({
        duration: 2,
        shimmerColor: "rgba(255, 255, 255, 0.8)"
      }),
      accessType: "pro",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Градиентный поток",
      slug: "gradient-flow",
      component: "GradientFlowText",
      config: JSON.stringify({
        colors: ["#ff0080", "#7928ca", "#ff0080"],
        duration: 3
      }),
      accessType: "pro",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "Пульсация",
      slug: "pulse",
      component: "PulseText",
      config: JSON.stringify({
        minOpacity: 0.6,
        maxOpacity: 1,
        duration: 1.5
      }),
      accessType: "vip",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Глитч",
      slug: "glitch",
      component: "GlitchText",
      config: JSON.stringify({
        intensity: 0.5,
        colors: ["#ff0000", "#00ff00", "#0000ff"]
      }),
      accessType: "pro",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "Волна",
      slug: "wave",
      component: "WaveText",
      config: JSON.stringify({
        amplitude: 5,
        frequency: 0.3,
        duration: 2
      }),
      accessType: "vip",
      sortOrder: 6,
      isActive: true,
    },
  ];

  for (const effect of effects) {
    await prisma.nicknameEffect.create({ data: effect });
  }

  console.log(`[Effects] Seeded ${effects.length} nickname effects`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Achievements: Достижения игроков
// ═══════════════════════════════════════════════════════════════════════════
async function seedAchievements() {
  const existingCount = await prisma.achievement.count();
  if (existingCount > 0) {
    console.log(`[Achievements] Already have ${existingCount} achievements in database, skipping import`);
    return;
  }

  const achievements = [
    // ═══════════════════════════════════════════════════════════════
    // ИГРОВЫЕ ДОСТИЖЕНИЯ - Truth or Dare
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Первая правда",
      slug: "tod-first-truth",
      description: "Завершите первое задание «Правда»",
      icon: "💬",
      category: "game_tod",
      gameType: "tod",
      rarity: "common",
      xpReward: 10,
      unlockCondition: JSON.stringify({ type: "count", field: "truthsCompleted", value: 1 }),
      sortOrder: 1,
    },
    {
      name: "Смельчак",
      slug: "tod-first-dare",
      description: "Завершите первое «Действие»",
      icon: "🎭",
      category: "game_tod",
      gameType: "tod",
      rarity: "common",
      xpReward: 10,
      unlockCondition: JSON.stringify({ type: "count", field: "daresCompleted", value: 1 }),
      sortOrder: 2,
    },
    {
      name: "Правдоруб",
      slug: "tod-truth-master",
      description: "Выполните 50 заданий «Правда»",
      icon: "🗣️",
      category: "game_tod",
      gameType: "tod",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "count", field: "truthsCompleted", value: 50 }),
      sortOrder: 3,
    },
    {
      name: "Бесстрашный",
      slug: "tod-dare-master",
      description: "Выполните 50 «Действий»",
      icon: "🔥",
      category: "game_tod",
      gameType: "tod",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "count", field: "daresCompleted", value: 50 }),
      sortOrder: 4,
    },
    {
      name: "Легенда вечеринки",
      slug: "tod-legend",
      description: "Сыграйте 100 игр в Truth or Dare",
      icon: "👑",
      category: "game_tod",
      gameType: "tod",
      rarity: "epic",
      xpReward: 50,
      unlockCondition: JSON.stringify({ type: "count", field: "gamesPlayed", gameType: "tod", value: 100 }),
      sortOrder: 5,
    },
    {
      name: "Мастер хаоса",
      slug: "tod-chaos-5",
      description: 'Выйти из режима "Хаос" 5 раз',
      icon: "🌀",
      category: "game_tod",
      gameType: "tod",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "count", field: "chaosEscapes", value: 5 }),
      sortOrder: 6,
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ИГРОВЫЕ ДОСТИЖЕНИЯ - Alias
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Первое слово",
      slug: "alias-first-word",
      description: "Угадайте первое слово в Alias",
      icon: "📝",
      category: "game_alias",
      gameType: "alias",
      rarity: "common",
      xpReward: 10,
      unlockCondition: JSON.stringify({ type: "count", field: "wordsGuessed", value: 1 }),
      sortOrder: 10,
    },
    {
      name: "Словесный мастер",
      slug: "alias-word-master",
      description: "Угадайте 100 слов",
      icon: "📚",
      category: "game_alias",
      gameType: "alias",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "count", field: "wordsGuessed", value: 100 }),
      sortOrder: 11,
    },
    {
      name: "Скорострел",
      slug: "alias-speedster",
      description: "Угадайте 10 слов за один раунд",
      icon: "⚡",
      category: "game_alias",
      gameType: "alias",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "single_round", field: "wordsGuessed", value: 10 }),
      sortOrder: 12,
    },
    {
      name: "Легенда Alias",
      slug: "alias-legend",
      description: "Выиграйте 50 игр в Alias",
      icon: "🎯",
      category: "game_alias",
      gameType: "alias",
      rarity: "epic",
      xpReward: 50,
      unlockCondition: JSON.stringify({ type: "count", field: "gamesWon", gameType: "alias", value: 50 }),
      sortOrder: 13,
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ИГРОВЫЕ ДОСТИЖЕНИЯ - Emotional Intelligence
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Первая эмоция",
      slug: "emotional-first-guess",
      description: "Правильно угадайте первую эмоцию",
      icon: "🎭",
      category: "game_emotional",
      gameType: "emotional",
      rarity: "common",
      xpReward: 10,
      unlockCondition: JSON.stringify({ type: "count", field: "correctGuesses", value: 1 }),
      sortOrder: 14,
    },
    {
      name: "Эмпат",
      slug: "emotional-empath",
      description: "Правильно угадать эмоцию 10 раз",
      icon: "💜",
      category: "game_emotional",
      gameType: "emotional",
      rarity: "common",
      xpReward: 15,
      unlockCondition: JSON.stringify({ type: "count", field: "correctGuesses", value: 10 }),
      sortOrder: 15,
    },
    {
      name: "Мастер эмоций",
      slug: "emotional-master",
      description: "Правильно угадать 100 эмоций",
      icon: "🧠",
      category: "game_emotional",
      gameType: "emotional",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "count", field: "correctGuesses", value: 100 }),
      sortOrder: 16,
    },
    {
      name: "Психолог",
      slug: "emotional-psychologist",
      description: "Правильно угадать 500 эмоций",
      icon: "🎓",
      category: "game_emotional",
      gameType: "emotional",
      rarity: "epic",
      xpReward: 50,
      unlockCondition: JSON.stringify({ type: "count", field: "correctGuesses", value: 500 }),
      sortOrder: 17,
    },
    {
      name: "Эмоциональный интеллект",
      slug: "emotional-winner",
      description: "Выиграйте 10 игр в Emotional",
      icon: "🏆",
      category: "game_emotional",
      gameType: "emotional",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "count", field: "gamesWon", gameType: "emotional", value: 10 }),
      sortOrder: 18,
    },
    {
      name: "Легенда Emotional",
      slug: "emotional-legend",
      description: "Выиграйте 50 игр в Emotional",
      icon: "👑",
      category: "game_emotional",
      gameType: "emotional",
      rarity: "epic",
      xpReward: 50,
      unlockCondition: JSON.stringify({ type: "count", field: "gamesWon", gameType: "emotional", value: 50 }),
      sortOrder: 19,
    },
    
    // ═══════════════════════════════════════════════════════════════
    // СОЦИАЛЬНЫЕ ДОСТИЖЕНИЯ
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Новичок",
      slug: "social-newcomer",
      description: "Зарегистрируйтесь на платформе",
      icon: "🌱",
      category: "social",
      rarity: "common",
      xpReward: 10,
      unlockCondition: JSON.stringify({ type: "event", event: "registration" }),
      sortOrder: 20,
    },
    {
      name: "Душа компании",
      slug: "social-party-soul",
      description: "Сыграйте с 10 разными игроками",
      icon: "🎉",
      category: "social",
      rarity: "common",
      xpReward: 15,
      unlockCondition: JSON.stringify({ type: "count", field: "uniquePlayers", value: 10 }),
      sortOrder: 21,
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ДОСТИЖЕНИЯ ВЕРНОСТИ
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Постоянный игрок",
      slug: "loyalty-streak-7",
      description: "Играйте 7 дней подряд",
      icon: "📅",
      category: "loyalty",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "streak", field: "loginDays", value: 7 }),
      sortOrder: 30,
    },
    {
      name: "Ветеран",
      slug: "loyalty-streak-30",
      description: "Играйте 30 дней подряд",
      icon: "🎖️",
      category: "loyalty",
      rarity: "epic",
      xpReward: 50,
      unlockCondition: JSON.stringify({ type: "streak", field: "loginDays", value: 30 }),
      sortOrder: 31,
    },
    {
      name: "VIP-статус",
      slug: "loyalty-vip",
      description: "Приобретите VIP-подписку",
      icon: "💜",
      category: "loyalty",
      rarity: "rare",
      xpReward: 25,
      unlockCondition: JSON.stringify({ type: "subscription", tier: "VIP" }),
      sortOrder: 32,
    },
    {
      name: "PRO-статус",
      slug: "loyalty-pro",
      description: "Приобретите PRO-подписку",
      icon: "💎",
      category: "loyalty",
      rarity: "epic",
      xpReward: 50,
      unlockCondition: JSON.stringify({ type: "subscription", tier: "PRO" }),
      sortOrder: 33,
    },
    
    // ═══════════════════════════════════════════════════════════════
    // СЕКРЕТНЫЕ ДОСТИЖЕНИЯ
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Ночная сова",
      slug: "secret-night-owl",
      description: "Играйте в 3 часа ночи",
      icon: "🦉",
      category: "secret",
      rarity: "secret",
      xpReward: 75,
      unlockCondition: JSON.stringify({ type: "time", hour: 3 }),
      isSecret: true,
      sortOrder: 40,
    },
    {
      name: "Мастер на все руки",
      slug: "secret-all-games",
      description: "Сыграйте во все игры за один день",
      icon: "🎲",
      category: "secret",
      rarity: "secret",
      xpReward: 75,
      unlockCondition: JSON.stringify({ type: "all_games_in_day" }),
      isSecret: true,
      sortOrder: 41,
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.create({ data: achievement });
  }

  console.log(`[Achievements] Seeded ${achievements.length} achievements`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main seed function
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("Starting seed...");
  
  // Seed Alias words
  await seedAliasWords();
  
  // Seed Frames
  await seedFrames();
  
  // Seed Nickname Gradients
  await seedNicknameGradients();
  
  // Seed Nickname Glows
  await seedNicknameGlows();
  
  // Seed Nickname Effects
  await seedNicknameEffects();
  
  // Seed Achievements
  await seedAchievements();
  
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
