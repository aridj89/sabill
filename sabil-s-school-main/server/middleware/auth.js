import { verifyToken } from "../utils/jwt.js";

/**
 * Middleware: Verify Authorization header JWT token
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Accès non autorisé. Token manquant." });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ success: false, message: "Session expirée ou token invalide." });
  }

  req.user = user; // { id, role, username }
  next();
}

/**
 * Middleware: Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles - 'admin', 'teacher', 'student'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé. Vous n'avez pas les permissions nécessaires.",
      });
    }
    next();
  };
}

/**
 * Middleware: IDOR Protection for Student Data
 * Ensures a student can only access their own resource ID.
 */
export function requireSelfOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Non authentifié." });
  }

  // Admin can access any resource
  if (req.user.role === "admin") {
    return next();
  }

  // Student can only access their own studentId
  const requestedStudentId = req.params.studentId || req.query.studentId || req.body.studentId;
  if (req.user.role === "student" && requestedStudentId && requestedStudentId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Accès interdit. Vous ne pouvez consulter que vos propres données.",
    });
  }

  next();
}
