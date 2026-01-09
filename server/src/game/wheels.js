const fs = require("fs");
const path = require("path");

let cached = null;
let cachedChaosTruth = null;

// Язвительные фразочки для shamed-игроков
const SHAME_TITLES = [
  "Главный мастер сливов",
  "Легенда избегания ответственности",
  "Профессиональный уклонист",
  "Чемпион «я пас»",
  "Смелость закончилась в прошлой версии",
  "Титан мягкой силы (очень мягкой)",
  "Герой только на словах",
  "Сверхразум, который не рискует",
  "Лицо «давайте без этого»",
  "Опасен, если сидит молча"
];

function loadTruthQuestions() {
  const filePath = path.join(__dirname, "..", "..", "data", "truth-questions.json");
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function loadChaosTruthQuestions() {
  if (cachedChaosTruth) {
    return cachedChaosTruth;
  }
  const filePath = path.join(__dirname, "..", "..", "data", "truth-questions-chaos.json");
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    cachedChaosTruth = Array.isArray(parsed) ? parsed : [];
    return cachedChaosTruth;
  } catch (error) {
    // Fallback to normal questions if chaos file missing
    return loadTruthQuestions();
  }
}

function loadWheelData() {
  if (cached) {
    return cached;
  }
  const filePath = path.join(__dirname, "..", "..", "data", "wheels.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  cached = { ...data, truthQuestions: loadTruthQuestions() };
  return cached;
}

function getWheelData() {
  return loadWheelData();
}

function pickWheel1() {
  const data = loadWheelData();
  const categories = data.categories || [];
  const index = Math.floor(Math.random() * categories.length);
  return { category: categories[index], index };
}

function pickWheel2(categoryId) {
  const data = loadWheelData();
  const category = data.categories.find((item) => item.id === categoryId);
  if (!category) {
    return null;
  }
  const items = category.items || [];
  // Filter out chaos items for normal players
  const normalItems = items.filter((item) => !item.tags || !item.tags.includes("chaos"));
  const index = Math.floor(Math.random() * normalItems.length);
  return { item: normalItems[index], index, category };
}

/**
 * Pick wheel2 for chaos player: 9 normal + 3 chaos items, shuffled
 * Returns reelItems array with isChaos flag for each item
 */
function pickWheel2ForChaos(categoryId) {
  const data = loadWheelData();
  const category = data.categories.find((item) => item.id === categoryId);
  if (!category) {
    return null;
  }
  
  const allItems = category.items || [];
  const normalPool = allItems.filter((item) => !item.tags || !item.tags.includes("chaos"));
  const chaosPool = allItems.filter((item) => item.tags && item.tags.includes("chaos"));
  
  // Shuffle helper
  const shuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  
  // Select 9 normal (or less if not enough)
  const shuffledNormal = shuffle(normalPool);
  const selectedNormal = shuffledNormal.slice(0, Math.min(9, shuffledNormal.length));
  
  // Select 3 chaos (or less if not enough)
  const shuffledChaos = shuffle(chaosPool);
  const selectedChaos = shuffledChaos.slice(0, Math.min(3, shuffledChaos.length));
  
  // Combine and shuffle
  const combined = [
    ...selectedNormal.map((item) => ({ ...item, isChaos: false })),
    ...selectedChaos.map((item) => ({ ...item, isChaos: true }))
  ];
  const reelItems = shuffle(combined);
  
  // Ensure we have 12 items (fill with normal if needed)
  while (reelItems.length < 12 && normalPool.length > 0) {
    const extra = normalPool[Math.floor(Math.random() * normalPool.length)];
    reelItems.push({ ...extra, isChaos: false });
  }
  
  // Pick target index
  const index = Math.floor(Math.random() * reelItems.length);
  const item = reelItems[index];
  
  // Build reelItems for client (minimal data)
  const reelItemsForClient = reelItems.map((ri) => ({
    id: ri.id,
    title: ri.shortTitle || ri.label,
    isChaos: ri.isChaos
  }));
  
  return {
    item,
    index,
    category,
    reelItems: reelItemsForClient,
    fullReelItems: reelItems
  };
}

function pickTruthQuestion() {
  const data = loadWheelData();
  const questions = data.truthQuestions || [];
  if (!questions.length) {
    return null;
  }
  const index = Math.floor(Math.random() * questions.length);
  return { question: questions[index], index };
}

function pickChaosTruthQuestion() {
  const questions = loadChaosTruthQuestions();
  if (!questions.length) {
    return pickTruthQuestion(); // Fallback
  }
  const index = Math.floor(Math.random() * questions.length);
  return { question: questions[index], index };
}

function getRandomShameTitle() {
  return SHAME_TITLES[Math.floor(Math.random() * SHAME_TITLES.length)];
}

module.exports = {
  getWheelData,
  pickWheel1,
  pickWheel2,
  pickWheel2ForChaos,
  pickTruthQuestion,
  pickChaosTruthQuestion,
  getRandomShameTitle,
  SHAME_TITLES
};
