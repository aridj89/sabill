/**
 * UID normalization — MUST match server/services/attendanceService.js#normalizeCardUid:
 * uppercase hexadecimal, no separators.
 */
export function normalizeUid(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

export function isValidUid(raw) {
  const n = normalizeUid(raw);
  return n.length >= 4 && n.length <= 20;
}
