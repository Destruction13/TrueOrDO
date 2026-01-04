const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "data", "wheels.json");
const raw = fs.readFileSync(filePath, "utf8");
const data = JSON.parse(raw.replace(/^\uFEFF/, ""));

const categories = data.categories || [];
const totalItems = categories.reduce((sum, category) => sum + (category.items || []).length, 0);

console.log(`Seed content loaded: ${categories.length} categories, ${totalItems} scenarios.`);
