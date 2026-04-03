'use strict';

const { Router } = require('express');
const authenticate = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// GET /api/analytics/costs — cost breakdown by provider, service, and time range
router.get('/costs', analyticsController.getCosts);

// GET /api/analytics/usage — resource utilisation metrics
router.get('/usage', analyticsController.getUsage);

// GET /api/analytics/recommendations — AI-generated cost-saving recommendations
router.get('/recommendations', analyticsController.getRecommendations);

module.exports = router;
