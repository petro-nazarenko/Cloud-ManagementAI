'use strict';

const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Returns an Express middleware that writes an audit-log entry after the
 * response is sent.
 *
 * Usage:
 *   router.post('/', auditLogger('create', 'resource'), handler);
 *   router.delete('/:id', auditLogger('delete', 'resource', (req) => req.params.id), handler);
 */
const auditLogger = (action, resource, getResourceId = null) => {
  return (req, res, next) => {
    // Capture the request body snapshot before any handler modifies it
    const before = req.method === 'PUT' || req.method === 'PATCH' ? { ...req.body } : undefined;

    res.on('finish', async () => {
      // Only audit mutating operations and only when they succeed (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      try {
        const resourceId = getResourceId ? getResourceId(req) : req.params?.id || null;
        const after = ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined;

        await AuditLog.create({
          userId: req.user?.sub || null,
          userEmail: req.user?.email || null,
          action,
          resource,
          resourceId,
          before: before || null,
          after: after || null,
          ip: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent']?.slice(0, 512) || null,
        });
      } catch (err) {
        // Audit failures must never break the main request flow
        logger.warn(`AuditLog write failed: ${err.message}`);
      }
    });

    next();
  };
};

module.exports = auditLogger;
