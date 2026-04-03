'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');
const awsService = require('../services/awsService');
const azureService = require('../services/azureService');
const gcpService = require('../services/gcpService');
const { checkProviderCredentials, healthCheckProviders } = require('../utils/providerHealth');
const { enqueueProviderHealthRefresh, getAnalyticsJobStatus, getLatestJobResult } = require('../queue/analyticsQueue');
const { JOB_NAMES } = require('../queue/jobNames');

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

// GET /api/providers — list supported cloud providers and their configuration status
router.get('/', (req, res) => {
  const DISPLAY_NAMES = { aws: 'Amazon Web Services', azure: 'Microsoft Azure', gcp: 'Google Cloud Platform' };
  res.json({
    providers: SUPPORTED_PROVIDERS.map((name) => {
      const { configured, missingVars } = checkProviderCredentials(name);
      return {
        name,
        displayName: DISPLAY_NAMES[name],
        configured,
        status: configured ? 'available' : 'unconfigured',
        ...(process.env.NODE_ENV !== 'production' && !configured && { missingVars }),
      };
    }),
  });
});

// GET /api/providers/health — perform live connectivity checks for all providers
router.get('/health', authorizeRoles('admin', 'operator'), async (req, res, next) => {
  try {
    const cached = await getLatestJobResult(JOB_NAMES.providerHealthRefresh);
    if (cached) {
      return res.json({
        providers: cached.providers,
        source: 'queued-cache',
        refreshedAt: cached.refreshedAt || null,
      });
    }

    const results = await healthCheckProviders();
    res.json({ providers: results, source: 'fallback-live' });
  } catch (err) {
    next(err);
  }
});

// POST /api/providers/health/refresh — queue provider health refresh job
router.post('/health/refresh', authorizeRoles('admin', 'operator'), async (req, res, next) => {
  try {
    const job = await enqueueProviderHealthRefresh({
      userId: req.user.sub,
      email: req.user.email,
      role: req.user.role,
    });

    res.status(202).json({
      message: 'Provider health refresh queued.',
      job,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/providers/health/jobs/:jobId — provider health job status
router.get('/health/jobs/:jobId', authorizeRoles('admin', 'operator'), async (req, res, next) => {
  try {
    const job = await getAnalyticsJobStatus(req.params.jobId);
    if (!job || job.name !== JOB_NAMES.providerHealthRefresh) {
      return res.status(404).json({ error: `Provider health job '${req.params.jobId}' not found.` });
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
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
router.post('/:name/deploy', authorizeRoles('admin', 'operator'), validate(deploySchema), async (req, res, next) => {
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
