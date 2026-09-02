import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using Bcrypt.
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword) return "";
  // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
  if (plainPassword.startsWith("$2a$") || plainPassword.startsWith("$2b$")) {
    return plainPassword;
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(plainPassword, salt);
}

/**
 * Synchronous version of hashPassword for data migration.
 */
export function hashPasswordSync(plainPassword) {
  if (!plainPassword) return "";
  if (plainPassword.startsWith("$2a$") || plainPassword.startsWith("$2b$")) {
    return plainPassword;
  }
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  return bcrypt.hashSync(plainPassword, salt);
}

/**
 * Compare a plain text password with a hashed password.
 */
export async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  // If stored password isn't hashed yet (fallback)
  if (!hashedPassword.startsWith("$2a$") && !hashedPassword.startsWith("$2b$")) {
    return plainPassword === hashedPassword;
  }
  return await bcrypt.compare(plainPassword, hashedPassword);
}
