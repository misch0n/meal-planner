// ─────────────────────────────────────────────────────────────────────────────
// Local storage persistence (spec §3). The entire database lives in one
// localStorage key. JSON export/import ships from day one — it's the backup
// mechanism, the migration path, and insurance against "clear browsing data".
// ─────────────────────────────────────────────────────────────────────────────
import type { Database } from "../types";
import { DB_VERSION, seedDatabase } from "../data/seed";

const STORAGE_KEY = "meal-planner.db.v1";

export function loadDatabase(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDatabase();
    const parsed = JSON.parse(raw) as Database;
    return migrate(parsed);
  } catch (err) {
    console.error("Failed to load database, falling back to seed:", err);
    return seedDatabase();
  }
}

export function saveDatabase(db: Database): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error("Failed to persist database:", err);
  }
}

export function resetDatabase(): Database {
  const fresh = seedDatabase();
  saveDatabase(fresh);
  return fresh;
}

/** Forward migration hook. For now only stamps the version. */
function migrate(db: Database): Database {
  if (typeof db.version !== "number") db.version = DB_VERSION;
  db.ingredients ??= [];
  db.recipes ??= [];
  db.household ??= { members: [] };
  db.plans ??= [];
  db.logs ??= [];
  db.weights ??= [];
  return db;
}

export function exportDatabase(db: Database): string {
  return JSON.stringify(db, null, 2);
}

export interface ImportResult {
  ok: boolean;
  db?: Database;
  error?: string;
}

export function importDatabase(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json) as Database;
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "Not a valid JSON object." };
    }
    if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.recipes)) {
      return { ok: false, error: "Missing required fields (ingredients/recipes)." };
    }
    return { ok: true, db: migrate(parsed) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Parse error." };
  }
}

/** Trigger a browser download of the current DB as a timestamped JSON file. */
export function downloadDatabase(db: Database): void {
  const blob = new Blob([exportDatabase(db)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meal-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
