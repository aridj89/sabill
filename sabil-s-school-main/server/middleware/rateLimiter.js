import rateLimit from "express-rate-limit";

/**
 * Strict Rate Limiter for Login requests (anti brute-force)
 * Max 10 attempts per 15 minutes per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 20 : 1000, // Relaxed limit in development
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
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
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: {
    success: false,
    message: "Quota de requêtes dépassé. Veuillez patienter un moment.",
  },
});
