'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const { authorizePermissions } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/permissions');
const analyticsController = require('../controllers/analyticsController');

const router = Router();

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }
  req.body = value;
  next();
};

const recStatusSchema = Joi.object({
  status: Joi.string().valid('open', 'applied', 'dismissed').required(),
});

// All analytics routes require authentication
router.use(authenticate);

// GET /api/analytics/costs — cost breakdown by provider, service, and time range
router.get('/costs', analyticsController.getCosts);

// POST /api/analytics/costs/refresh — queue cost sync job
router.post('/costs/refresh', authorizePermissions(PERMISSIONS.analyticsCostsRefresh), analyticsController.queueCostSync);

// GET /api/analytics/usage — resource utilisation metrics
router.get('/usage', analyticsController.getUsage);

// GET /api/analytics/recommendations — AI-generated cost-saving recommendations
router.get('/recommendations', analyticsController.getRecommendations);

// POST /api/analytics/recommendations/refresh — queue recommendation refresh job
router.post('/recommendations/refresh', authorizePermissions(PERMISSIONS.analyticsRecommendationsRefresh), analyticsController.queueRecommendationRefresh);

// GET /api/analytics/jobs/:jobId — get analytics job status
router.get('/jobs/:jobId', authorizePermissions(PERMISSIONS.analyticsJobsRead), analyticsController.getAnalyticsJob);

// PATCH /api/analytics/recommendations/:id — update recommendation status (apply/dismiss)
router.patch('/recommendations/:id', authorizePermissions(PERMISSIONS.analyticsRecommendationsWrite), validate(recStatusSchema), analyticsController.updateRecommendation);

module.exports = router;
