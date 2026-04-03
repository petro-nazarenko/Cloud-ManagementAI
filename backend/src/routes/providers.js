'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const awsService = require('../services/awsService');
const azureService = require('../services/azureService');
const gcpService = require('../services/gcpService');

const router = Router();

const SUPPORTED_PROVIDERS = ['aws', 'azure', 'gcp'];

const deploySchema = Joi.object({
  resourceType: Joi.string().required(),
  region: Joi.string().required(),
  name: Joi.string().min(1).max(128).required(),
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

const resolveProviderService = (name) => {
  switch (name) {
    case 'aws': return awsService;
    case 'azure': return azureService;
    case 'gcp': return gcpService;
    default: return null;
  }
};

// All provider routes require authentication
router.use(authenticate);

// GET /api/providers — list supported cloud providers and their status
router.get('/', (req, res) => {
  res.json({
    providers: SUPPORTED_PROVIDERS.map((name) => ({
      name,
      status: 'available',
      displayName: { aws: 'Amazon Web Services', azure: 'Microsoft Azure', gcp: 'Google Cloud Platform' }[name],
    })),
  });
});

// GET /api/providers/:name/resources — list resources from a specific provider
router.get('/:name/resources', async (req, res, next) => {
  const { name } = req.params;
  const service = resolveProviderService(name);
  if (!service) {
    return res.status(404).json({ error: `Provider '${name}' is not supported.` });
  }
  try {
    const resources = await service.listResources(req.query);
    res.json({ provider: name, resources });
  } catch (err) {
    next(err);
  }
});

// POST /api/providers/:name/deploy — deploy a resource on a specific provider
router.post('/:name/deploy', validate(deploySchema), async (req, res, next) => {
  const { name } = req.params;
  const service = resolveProviderService(name);
  if (!service) {
    return res.status(404).json({ error: `Provider '${name}' is not supported.` });
  }
  try {
    const result = await service.deployResource(req.body);
    res.status(202).json({ provider: name, deployment: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
