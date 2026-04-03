'use strict';

/**
 * Coarse-grained role authorization used as a phase-0 guardrail.
 * This is intentionally simple and will be replaced by permission-based RBAC.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden.',
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };