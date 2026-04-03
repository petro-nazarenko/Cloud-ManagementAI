'use strict';

const { getRolePermissions } = require('./permissions');

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

const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const grantedPermissions = getRolePermissions(role);
    const missingPermissions = requiredPermissions.filter((permission) => !grantedPermissions.includes(permission));

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        error: 'Forbidden.',
        requiredPermissions,
      });
    }

    next();
  };
};

module.exports = { authorizeRoles, authorizePermissions };