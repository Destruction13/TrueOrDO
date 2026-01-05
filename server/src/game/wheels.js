const fs = require("fs");
const path = require("path");

let cached = null;

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
  const index = Math.floor(Math.random() * items.length);
  return { item: items[index], index, category };
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

module.exports = {
  getWheelData,
  pickWheel1,
  pickWheel2,
  pickTruthQuestion
};
