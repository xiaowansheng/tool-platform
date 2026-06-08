import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let db: Database.Database | null = null;

function getDbPath(): string {
  const dataDir = process.env.TOOL_PLATFORM_DATA_DIR ?? path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "stats.db");
}

function getDb(): Database.Database {
  if (db) return db;

  db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      target_id   TEXT PRIMARY KEY,
      visit_count INTEGER NOT NULL DEFAULT 0,
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  return db;
}

export interface VisitRecord {
  target_id: string;
  visit_count: number;
  updated_at: number;
}

export function incrementVisit(targetId: string): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO page_visits (target_id, visit_count, updated_at)
    VALUES (?, 1, unixepoch())
    ON CONFLICT(target_id) DO UPDATE SET
      visit_count = visit_count + 1,
      updated_at = unixepoch()
    RETURNING visit_count
  `);
  const result = stmt.get(targetId) as { visit_count: number } | undefined;
  return result?.visit_count ?? 0;
}

export function getVisitCount(targetId: string): number {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT visit_count FROM page_visits WHERE target_id = ?"
  );
  const result = stmt.get(targetId) as { visit_count: number } | undefined;
  return result?.visit_count ?? 0;
}

export function getVisitCountForTargets(targetIds: string[]): number {
  if (targetIds.length === 0) {
    return 0;
  }

  const database = getDb();
  const placeholders = targetIds.map(() => "?").join(", ");
  const stmt = database.prepare(`
    SELECT COALESCE(SUM(visit_count), 0) AS visit_count
    FROM page_visits
    WHERE target_id IN (${placeholders})
  `);
  const result = stmt.get(...targetIds) as { visit_count: number } | undefined;
  return result?.visit_count ?? 0;
}

export function getTopTools(limit: number): Array<{ toolId: string; visitCount: number }> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT target_id, visit_count
    FROM page_visits
    WHERE target_id LIKE 'tool:%'
    ORDER BY visit_count DESC
    LIMIT ?
  `);
  return (stmt.all(limit) as Array<{ target_id: string; visit_count: number }>).map(
    (row) => ({
      toolId: row.target_id.replace(/^tool:/, ""),
      visitCount: row.visit_count
    })
  );
}

export function getAllToolVisits(): Array<{ toolId: string; visitCount: number }> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT target_id, visit_count
    FROM page_visits
    WHERE target_id LIKE 'tool:%'
  `);
  return (stmt.all() as Array<{ target_id: string; visit_count: number }>).map(
    (row) => ({
      toolId: row.target_id.replace(/^tool:/, ""),
      visitCount: row.visit_count
    })
  );
}

export function getAllCategoryVisits(): Array<{ categoryId: string; visitCount: number }> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT target_id, visit_count
    FROM page_visits
    WHERE target_id LIKE 'category:%'
  `);
  return (stmt.all() as Array<{ target_id: string; visit_count: number }>).map(
    (row) => ({
      categoryId: row.target_id.replace(/^category:/, ""),
      visitCount: row.visit_count
    })
  );
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
