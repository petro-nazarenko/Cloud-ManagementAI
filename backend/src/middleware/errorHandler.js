'use strict';

const logger = require('../utils/logger');

/**
 * Global Express error-handling middleware.
 * Normalises errors into a consistent JSON response shape.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log stack traces for unexpected server errors
  if (status >= 500) {
    logger.error(err);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
