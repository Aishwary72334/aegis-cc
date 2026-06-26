// Global Error Handler for Express Server
// Prevents stack traces and sensitive database errors leaking to the client

export const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  
  // 1. Log detailed error details for server logs/diagnostics (No secrets logged)
  console.error(`[AEGIS Error] ${timestamp}`);
  console.error(`Path: ${req.path} | Method: ${req.method}`);
  console.error(`Message: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // 2. Format sanitized output for client
  const statusCode = err.statusCode || err.status || 500;
  
  // Hide deep details in production environment
  const responseMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected server error occurred.'
    : err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: responseMessage
  });
};
