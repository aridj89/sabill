import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, DB_PATH } from "../db.js";
import { loadDatabase } from "../dbHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDirectory = path.dirname(DB_PATH);
export const BACKUP_DIR = process.env.BACKUP_DIR || path.join(dbDirectory, "backups");
export const JSON_EXPORT_FILE = process.env.JSON_EXPORT_PATH || path.join(dbDirectory, "database-backup.json");
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || "30", 10);

/**
 * Ensure backups directory exists.
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create a timestamped SQLite database backup file using native WAL-safe SQLite backup API.
 */
export async function createSqliteBackup() {
  try {
    ensureBackupDir();

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const destFile = path.join(BACKUP_DIR, `school-${timestamp}.db`);

    await db.backup(destFile);
    console.log(`📦 Backup SQLite réussi: ${destFile}`);

    pruneOldBackups();
    return true;
  } catch (err) {
    console.error("❌ Erreur lors du backup SQLite:", err);
    return false;
  }
}

/**
 * Prune older backup files exceeding MAX_BACKUPS limit.
 */
function pruneOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("school-") && f.endsWith(".db"))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const item of toDelete) {
        fs.unlinkSync(item.path);
        console.log(`🗑️ Backup ancien supprimé: ${item.name}`);
      }
    }
  } catch (err) {
    console.error("⚠️ Erreur nettoyage anciens backups:", err);
  }
}

/**
 * Export current school.db state to database.json / database-backup.json as a backup snapshot.
 */
export function exportDatabaseJson() {
  try {
    const fullData = loadDatabase();
    
    // Create sanitized export (without hashes or sensitive internal passwords for privacy)
    const exportData = JSON.parse(JSON.stringify(fullData));
    if (exportData.admin) delete exportData.admin.password;
    if (exportData.students) exportData.students.forEach(s => delete s.password);
    if (exportData.parents) exportData.parents.forEach(p => delete p.password);

    fs.writeFileSync(JSON_EXPORT_FILE, JSON.stringify(exportData, null, 2), "utf-8");
    console.log(`📄 Export JSON de sauvegarde mis à jour (${JSON_EXPORT_FILE}).`);
    return true;
  } catch (err) {
    console.error("❌ Erreur lors de l'export JSON:", err);
    return false;
  }
}

let backupInterval = null;

/**
 * Start periodic automated backup schedule (e.g. every 6 hours or configurable).
 */
export function startBackupScheduler(intervalHours = 6) {
  ensureBackupDir();
  
  // Run initial backup export on server start
  createSqliteBackup();
  exportDatabaseJson();

  const ms = intervalHours * 60 * 60 * 1000;
  if (backupInterval) clearInterval(backupInterval);

  backupInterval = setInterval(() => {
    createSqliteBackup();
    exportDatabaseJson();
  }, ms);

  console.log(`⏰ Service de Backup automatique démarré (Fréquence: toutes les ${intervalHours}h).`);
}

export function stopBackupScheduler() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
}
