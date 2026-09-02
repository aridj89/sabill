import rateLimit from "express-rate-limit";

/**
 * Strict Rate Limiter for Login requests (anti brute-force)
 * Max 10 attempts per 15 minutes per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de tentatives de connexion. Veuillez réessayer après 15 minutes.",
  },
});

/**
 * General Rate Limiter for API endpoints
 * Max 300 requests per 15 minutes per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quota de requêtes dépassé. Veuillez patienter un moment.",
  },
});
