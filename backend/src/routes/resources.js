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
/**
 * @openapi
 * /resources:
 *   get:
 *     tags: [Resources]
 *     summary: List cloud resources with optional filters and pagination
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema: { type: string, enum: [aws, azure, gcp] }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated resource list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/Resource' } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *       401: { description: Unauthorized }
 */
router.get('/', resourceController.listResources);

// POST /api/resources — create a new resource
/**
 * @openapi
 * /resources:
 *   post:
 *     tags: [Resources]
 *     summary: Create a new cloud resource record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Resource' }
 *     responses:
 *       201: { description: Resource created, content: { application/json: { schema: { $ref: '#/components/schemas/Resource' } } } }
 *       400: { description: Validation error }
 *       403: { description: Insufficient permissions }
 */
router.post('/', authorizePermissions(PERMISSIONS.resourcesWrite), validate(resourceSchema), auditLogger('create', 'resource'), resourceController.createResource);

// GET /api/resources/:id — get a single resource
/**
 * @openapi
 * /resources/{id}:
 *   get:
 *     tags: [Resources]
 *     summary: Get a single cloud resource by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Resource found, content: { application/json: { schema: { $ref: '#/components/schemas/Resource' } } } }
 *       404: { description: Not found }
 */
router.get('/:id', resourceController.getResource);

// PUT /api/resources/:id — update a resource
/**
 * @openapi
 * /resources/{id}:
 *   put:
 *     tags: [Resources]
 *     summary: Update a cloud resource
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Resource' }
 *     responses:
 *       200: { description: Updated resource, content: { application/json: { schema: { $ref: '#/components/schemas/Resource' } } } }
 *       403: { description: Insufficient permissions }
 *       404: { description: Not found }
 */
router.put('/:id', authorizePermissions(PERMISSIONS.resourcesWrite), validate(resourceSchema.fork(['name', 'type', 'provider', 'region'], (f) => f.optional())), auditLogger('update', 'resource'), resourceController.updateResource);

// DELETE /api/resources/:id — delete a resource
/**
 * @openapi
 * /resources/{id}:
 *   delete:
 *     tags: [Resources]
 *     summary: Delete a cloud resource
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       403: { description: Insufficient permissions }
 *       404: { description: Not found }
 */
router.delete('/:id', authorizePermissions(PERMISSIONS.resourcesDelete), auditLogger('delete', 'resource'), resourceController.deleteResource);

module.exports = router;
