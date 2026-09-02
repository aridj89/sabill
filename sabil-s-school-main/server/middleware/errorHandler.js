/**
 * Global safe error handler middleware.
 * Masks internal stack traces in production.
 */
export function errorHandler(err, req, res, next) {
  console.error(`[SERVER ERROR] ${req.method} ${req.url}:`, err.message || err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  const isProd = process.env.NODE_ENV === "production";

  res.status(statusCode).json({
    success: false,
    message: isProd
      ? "Une erreur interne s'est produite."
      : err.message || "Erreur serveur.",
    ...(isProd ? {} : { stack: err.stack }),
  });
}
