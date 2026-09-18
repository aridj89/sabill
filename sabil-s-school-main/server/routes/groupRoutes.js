import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * GET /api/groups — Read all groups
 */
router.get("/", (req, res, next) => {
  try {
    const rows = db.prepare("SELECT * FROM groups").all();
    const groups = rows.map(g => ({
      ...g,
      days: JSON.parse(g.days || "[]"),
      sessionsPerCycle: Number(g.sessionsPerCycle) || 4,
    }));
    res.json({ success: true, count: groups.length, groups });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/groups/:id — Read single group by ID
 */
router.get("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const row = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Groupe introuvable." });
    }
    const group = {
      ...row,
      days: JSON.parse(row.days || "[]"),
      sessionsPerCycle: Number(row.sessionsPerCycle) || 4,
    };
    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/groups — Create a new group
 */
router.post("/", (req, res, next) => {
  try {
    const {
      id,
      nom,
      categoryId,
      levelId,
      groupType = "Normal",
      days = [],
      time = "10:00",
      startDate = null,
      endDate = null,
      sessionsPerCycle = 4,
      academicYearId = null,
      sessions = [],
    } = req.body;

    if (!id || !nom) {
      return res.status(400).json({ success: false, message: "L'identifiant (id) et le nom du groupe sont requis." });
    }

    const insertGroup = db.transaction(() => {
      db.prepare(`
        INSERT INTO groups (id, nom, categoryId, levelId, groupType, days, time, startDate, endDate, sessionsPerCycle, academicYearId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        nom,
        categoryId || null,
        levelId || null,
        groupType || "Normal",
        JSON.stringify(days || []),
        time || "10:00",
        startDate || null,
        endDate || null,
        sessionsPerCycle || 4,
        academicYearId || null
      );

      // Optionally insert initial sessions if provided
      if (Array.isArray(sessions) && sessions.length > 0) {
        const stmtSession = db.prepare(`
          INSERT OR REPLACE INTO sessions (id, groupId, academicYearId, date, time, status, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of sessions) {
          stmtSession.run(
            s.id,
            id,
            s.academicYearId || academicYearId || null,
            s.date,
            s.time || time || "10:00",
            s.status || "planned",
            s.note || ""
          );
        }
      }
    });

    insertGroup();

    const created = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
    const formatted = {
      ...created,
      days: JSON.parse(created.days || "[]"),
      sessionsPerCycle: Number(created.sessionsPerCycle) || 4,
    };

    res.status(201).json({ success: true, message: "Groupe créé avec succès.", group: formatted });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ success: false, message: "Un groupe avec cet identifiant existe déjà." });
    }
    next(err);
  }
});

/**
 * PUT /api/groups/:id — Update existing group
 */
router.put("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nom,
      categoryId,
      levelId,
      groupType,
      days,
      time,
      startDate,
      endDate,
      sessionsPerCycle,
      academicYearId,
    } = req.body;

    const existing = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Groupe introuvable." });
    }

    const updatedNom = nom !== undefined ? nom : existing.nom;
    const updatedCat = categoryId !== undefined ? categoryId : existing.categoryId;
    const updatedLevel = levelId !== undefined ? levelId : existing.levelId;
    const updatedType = groupType !== undefined ? groupType : existing.groupType;
    const updatedDays = days !== undefined ? JSON.stringify(days) : existing.days;
    const updatedTime = time !== undefined ? time : existing.time;
    const updatedStart = startDate !== undefined ? startDate : existing.startDate;
    const updatedEnd = endDate !== undefined ? endDate : existing.endDate;
    const updatedCycle = sessionsPerCycle !== undefined ? Number(sessionsPerCycle) : existing.sessionsPerCycle;
    const updatedYear = academicYearId !== undefined ? academicYearId : existing.academicYearId;

    const result = db.prepare(`
      UPDATE groups
      SET nom = ?, categoryId = ?, levelId = ?, groupType = ?, days = ?, time = ?, startDate = ?, endDate = ?, sessionsPerCycle = ?, academicYearId = ?
      WHERE id = ?
    `).run(
      updatedNom,
      updatedCat,
      updatedLevel,
      updatedType,
      updatedDays,
      updatedTime,
      updatedStart,
      updatedEnd,
      updatedCycle,
      updatedYear,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Groupe introuvable." });
    }

    const updated = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
    const formatted = {
      ...updated,
      days: JSON.parse(updated.days || "[]"),
      sessionsPerCycle: Number(updated.sessionsPerCycle) || 4,
    };

    res.json({ success: true, message: "Groupe mis à jour avec succès.", group: formatted });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/groups/:id — Delete group from SQLite with cascading cleanup and verification
 */
router.delete("/:id", (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID du groupe manquant." });
    }

    // Check if group exists before deleting
    const existing = db.prepare("SELECT id, nom FROM groups WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Groupe avec l'ID '${id}' introuvable dans la base de données.` });
    }

    let deletedChanges = 0;

    const deleteTx = db.transaction(() => {
      // 1. Delete attendances associated with sessions of this group
      db.prepare(`
        DELETE FROM attendances
        WHERE sessionId IN (SELECT id FROM sessions WHERE groupId = ?)
      `).run(id);

      // 2. Delete sessions of this group
      db.prepare("DELETE FROM sessions WHERE groupId = ?").run(id);

      // 3. Delete enrollments of this group
      db.prepare("DELETE FROM enrollments WHERE groupId = ?").run(id);

      // 4. Delete the group itself from groups table
      const groupDelResult = db.prepare("DELETE FROM groups WHERE id = ?").run(id);
      deletedChanges = groupDelResult.changes;
    });

    deleteTx();

    if (deletedChanges > 0) {
      return res.json({
        success: true,
        message: `Le groupe '${existing.nom}' a été supprimé avec succès de la base de données.`,
        deletedId: id,
        changes: deletedChanges,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `Aucun groupe n'a été supprimé pour l'ID '${id}'.`,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
