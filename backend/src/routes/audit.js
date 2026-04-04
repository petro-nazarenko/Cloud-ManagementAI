'use strict';

const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { authorizePermissions } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/permissions');
const auditController = require('../controllers/auditController');

const router = Router();

router.use(authenticate);

// GET /api/audit — paginated audit log (admin + operator)
router.get('/', authorizePermissions(PERMISSIONS.auditLogsRead), auditController.listAuditLogs);

// GET /api/audit/:id — single entry
router.get('/:id', authorizePermissions(PERMISSIONS.auditLogsRead), auditController.getAuditLog);

module.exports = router;
