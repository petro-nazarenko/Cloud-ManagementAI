'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const { authorizePermissions } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/permissions');
const auditLogger = require('../middleware/auditLogger');
const resourceController = require('../controllers/resourceController');

const router = Router();

const resourceSchema = Joi.object({
  name: Joi.string().min(1).max(128).required(),
  type: Joi.string().valid('ec2', 's3', 'vm', 'storage', 'function', 'database', 'network').required(),
  provider: Joi.string().valid('aws', 'azure', 'gcp').required(),
  region: Joi.string().min(1).max(64).required(),
  tags: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  config: Joi.object().default({}),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
};

// All resource routes require authentication
router.use(authenticate);

// GET /api/resources — list all resources with optional filters and pagination
router.get('/', resourceController.listResources);

// POST /api/resources — create a new resource
router.post('/', authorizePermissions(PERMISSIONS.resourcesWrite), validate(resourceSchema), auditLogger('create', 'resource'), resourceController.createResource);

// GET /api/resources/:id — get a single resource
router.get('/:id', resourceController.getResource);

// PUT /api/resources/:id — update a resource
router.put('/:id', authorizePermissions(PERMISSIONS.resourcesWrite), validate(resourceSchema.fork(['name', 'type', 'provider', 'region'], (f) => f.optional())), auditLogger('update', 'resource'), resourceController.updateResource);

// DELETE /api/resources/:id — delete a resource
router.delete('/:id', authorizePermissions(PERMISSIONS.resourcesDelete), auditLogger('delete', 'resource'), resourceController.deleteResource);

module.exports = router;
