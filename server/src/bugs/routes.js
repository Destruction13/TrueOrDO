/**
 * Bug Tracker API Routes
 * Handles CRUD operations for bugs.json and bug markdown files
 */

const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const BUGS_JSON_PATH = path.join(__dirname, "..", "..", "..", "docs", "plan", "bugs.json");
const BUGS_MD_DIR = path.join(__dirname, "..", "..", "..", "docs", "plan");

/**
 * Load bugs database from bugs.json
 */
async function loadBugsDatabase() {
  try {
    const content = await fs.readFile(BUGS_JSON_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // Если файл не существует, создаём пустую базу
    if (error.code === "ENOENT") {
      return {
        bugs: [],
        nextId: 1,
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalBugs: 0,
          openBugs: 0,
          resolvedBugs: 0
        }
      };
    }
    throw error;
  }
}

/**
 * Save bugs database to bugs.json
 */
async function saveBugsDatabase(database) {
  await fs.writeFile(BUGS_JSON_PATH, JSON.stringify(database, null, 2), "utf-8");
}

/**
 * Generate bug markdown content
 */
function generateBugMarkdown(bug) {
  const lines = [];
  
  // Frontmatter
  lines.push("---");
  lines.push(`id: "${bug.id}"`);
  lines.push(`title: "${bug.title}"`);
  lines.push(`priority: ${bug.priority}`);
  lines.push(`status: ${bug.status}`);
  lines.push(`createdAt: ${bug.createdAt}`);
  lines.push(`updatedAt: ${bug.updatedAt}`);
  lines.push(`tags: [${bug.tags.join(", ")}]`);
  if (bug.assignee) {
    lines.push(`assignee: "${bug.assignee}"`);
  }
  lines.push(`reporter: "${bug.reporter || "user"}"`);
  lines.push("---");
  lines.push("");
  
  // Title
  lines.push(`# Bug #${bug.id}: ${bug.title}`);
  lines.push("");
  
  // Description
  lines.push("## Описание");
  lines.push("");
  lines.push(bug.description);
  lines.push("");
  
  // Steps to Reproduce
  if (bug.stepsToReproduce) {
    lines.push("## Шаги воспроизведения");
    lines.push("");
    lines.push(bug.stepsToReproduce);
    lines.push("");
  }
  
  // Expected Behavior
  if (bug.expectedBehavior) {
    lines.push("## Ожидаемое поведение");
    lines.push("");
    lines.push(bug.expectedBehavior);
    lines.push("");
  }
  
  // Actual Behavior
  if (bug.actualBehavior) {
    lines.push("## Фактическое поведение");
    lines.push("");
    lines.push(bug.actualBehavior);
    lines.push("");
  }
  
  // Resolution (if resolved)
  if (bug.resolution && (bug.status === "resolved" || bug.status === "closed")) {
    lines.push("## Решение");
    lines.push("");
    lines.push(bug.resolution);
    lines.push("");
  }
  
  return lines.join("\n");
}

/**
 * Update database metadata
 */
function updateMetadata(database) {
  database.metadata.lastUpdated = new Date().toISOString();
  database.metadata.totalBugs = database.bugs.length;
  database.metadata.openBugs = database.bugs.filter(b => b.status === "open").length;
  database.metadata.resolvedBugs = database.bugs.filter(b => b.status === "resolved").length;
}

/**
 * Create bugs router
 */
function createBugsRouter() {
  const router = express.Router();

  // GET /api/bugs - Get all bugs
  router.get("/", async (req, res) => {
    try {
      const database = await loadBugsDatabase();
      res.json(database.bugs);
    } catch (error) {
      console.error("[Bugs] Error loading bugs:", error);
      res.status(500).json({ error: "Failed to load bugs" });
    }
  });

  // GET /api/bugs/:id - Get bug by ID
  router.get("/:id", async (req, res) => {
    try {
      const database = await loadBugsDatabase();
      const bug = database.bugs.find(b => b.id === req.params.id);
      
      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      // Load markdown file
      const mdPath = path.join(BUGS_MD_DIR, `bug-${bug.id}.md`);
      try {
        const markdown = await fs.readFile(mdPath, "utf-8");
        res.json({ ...bug, markdown });
      } catch (error) {
        // Если markdown не найден, возвращаем только данные из JSON
        res.json(bug);
      }
    } catch (error) {
      console.error("[Bugs] Error loading bug:", error);
      res.status(500).json({ error: "Failed to load bug" });
    }
  });

  // POST /api/bugs - Create new bug
  router.post("/", async (req, res) => {
    try {
      const { title, description, priority, status, tags, stepsToReproduce, expectedBehavior, actualBehavior, assignee, reporter, resolution } = req.body;

      // Validation
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (!description || description.trim().length === 0) {
        return res.status(400).json({ error: "Description is required" });
      }

      const database = await loadBugsDatabase();
      
      // Generate ID (format: K-XXX)
      const id = `K-${database.nextId.toString().padStart(2, "0")}`;
      database.nextId++;
      
      const now = new Date().toISOString();
      
      // Create bug entry
      const bug = {
        id,
        title: title.trim(),
        description: description.trim(),
        priority: priority || "medium",
        status: status || "open",
        createdAt: now,
        updatedAt: now,
        tags: tags || [],
        stepsToReproduce: stepsToReproduce || "",
        assignee: assignee || null,
        reporter: reporter || "user",
        resolution: resolution || null
      };
      
      // Add to database
      database.bugs.push(bug);
      updateMetadata(database);
      
      // Save database
      await saveBugsDatabase(database);
      
      // Create markdown file
      const markdown = generateBugMarkdown(bug);
      const mdPath = path.join(BUGS_MD_DIR, `bug-${id}.md`);
      await fs.writeFile(mdPath, markdown, "utf-8");
      
      console.log(`[Bugs] Created bug ${id}: ${title}`);
      res.status(201).json(bug);
    } catch (error) {
      console.error("[Bugs] Error creating bug:", error);
      res.status(500).json({ error: "Failed to create bug" });
    }
  });

  // PATCH /api/bugs/:id - Update bug
  router.patch("/:id", async (req, res) => {
    try {
      const database = await loadBugsDatabase();
      const bugIndex = database.bugs.findIndex(b => b.id === req.params.id);
      
      if (bugIndex === -1) {
        return res.status(404).json({ error: "Bug not found" });
      }
      
      const bug = database.bugs[bugIndex];
      const now = new Date().toISOString();
      
      // Update fields
      const updatedBug = {
        ...bug,
        title: req.body.title !== undefined ? req.body.title.trim() : bug.title,
        description: req.body.description !== undefined ? req.body.description.trim() : bug.description,
        priority: req.body.priority !== undefined ? req.body.priority : bug.priority,
        status: req.body.status !== undefined ? req.body.status : bug.status,
        tags: req.body.tags !== undefined ? req.body.tags : bug.tags,
        stepsToReproduce: req.body.stepsToReproduce !== undefined ? req.body.stepsToReproduce : bug.stepsToReproduce,
        expectedBehavior: req.body.expectedBehavior !== undefined ? req.body.expectedBehavior : bug.expectedBehavior,
        actualBehavior: req.body.actualBehavior !== undefined ? req.body.actualBehavior : bug.actualBehavior,
        assignee: req.body.assignee !== undefined ? req.body.assignee : bug.assignee,
        resolution: req.body.resolution !== undefined ? req.body.resolution : bug.resolution,
        updatedAt: now
      };
      
      database.bugs[bugIndex] = updatedBug;
      updateMetadata(database);
      
      // Save database
      await saveBugsDatabase(database);
      
      // Update markdown file
      const markdown = generateBugMarkdown(updatedBug);
      const mdPath = path.join(BUGS_MD_DIR, `bug-${updatedBug.id}.md`);
      await fs.writeFile(mdPath, markdown, "utf-8");
      
      console.log(`[Bugs] Updated bug ${updatedBug.id}`);
      res.json(updatedBug);
    } catch (error) {
      console.error("[Bugs] Error updating bug:", error);
      res.status(500).json({ error: "Failed to update bug" });
    }
  });

  // DELETE /api/bugs/:id - Delete bug
  router.delete("/:id", async (req, res) => {
    try {
      const database = await loadBugsDatabase();
      const bugIndex = database.bugs.findIndex(b => b.id === req.params.id);
      
      if (bugIndex === -1) {
        return res.status(404).json({ error: "Bug not found" });
      }
      
      const bug = database.bugs[bugIndex];
      
      // Remove from database
      database.bugs.splice(bugIndex, 1);
      updateMetadata(database);
      
      // Save database
      await saveBugsDatabase(database);
      
      // Delete markdown file
      const mdPath = path.join(BUGS_MD_DIR, `bug-${bug.id}.md`);
      try {
        await fs.unlink(mdPath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
      
      console.log(`[Bugs] Deleted bug ${bug.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[Bugs] Error deleting bug:", error);
      res.status(500).json({ error: "Failed to delete bug" });
    }
  });

  return router;
}

module.exports = { createBugsRouter };
