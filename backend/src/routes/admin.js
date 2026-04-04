'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const { authorizePermissions } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/permissions');
const auditLogger = require('../middleware/auditLogger');
const adminController = require('../controllers/adminController');

const router = Router();

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }
  req.body = value;
  next();
};

const roleSchema = Joi.object({
  role: Joi.string().valid('admin', 'operator', 'viewer').required(),
});

router.use(authenticate);

// GET /api/admin/users — list all users
router.get('/users', authorizePermissions(PERMISSIONS.adminUsersRead), adminController.listUsers);

// GET /api/admin/users/:id — get single user
router.get('/users/:id', authorizePermissions(PERMISSIONS.adminUsersRead), adminController.getUser);

// PATCH /api/admin/users/:id/role — change role
router.patch(
  '/users/:id/role',
  authorizePermissions(PERMISSIONS.adminUsersWrite),
  validate(roleSchema),
  auditLogger('role-change', 'user', (req) => req.params.id),
  adminController.updateUserRole,
);

// DELETE /api/admin/users/:id — delete user
router.delete(
  '/users/:id',
  authorizePermissions(PERMISSIONS.adminUsersWrite),
  auditLogger('delete', 'user', (req) => req.params.id),
  adminController.deleteUser,
);

module.exports = router;
