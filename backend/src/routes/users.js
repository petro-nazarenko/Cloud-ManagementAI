'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = Router();

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }
  req.body = value;
  next();
};

const profileSchema = Joi.object({
  name: Joi.string().min(1).max(128),
  email: Joi.string().email(),
  timezone: Joi.string().max(64),
  currency: Joi.string().length(3).uppercase(),
}).min(1);

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const notificationsSchema = Joi.object({
  costAlerts: Joi.boolean(),
  securityAlerts: Joi.boolean(),
  resourceChanges: Joi.boolean(),
  weeklyReport: Joi.boolean(),
  emailDigest: Joi.boolean(),
  slackIntegration: Joi.boolean(),
}).min(1);

const settingsSchema = Joi.object({
  currency: Joi.string().length(3).uppercase(),
  costAlertThreshold: Joi.number().positive(),
}).min(1);

const credentialsSchema = Joi.object({
  provider: Joi.string().valid('aws', 'azure', 'gcp').required(),
  credentials: Joi.object().required(),
});

// All user routes require authentication
router.use(authenticate);

// GET /api/users/me — current user profile
router.get('/me', userController.getMe);

// PUT /api/users/profile — update name, email, timezone, currency
router.put('/profile', validate(profileSchema), userController.updateProfile);

// PUT /api/users/password — change password
router.put('/password', validate(passwordSchema), userController.updatePassword);

// PUT /api/users/notifications — update notification preferences
router.put('/notifications', validate(notificationsSchema), userController.updateNotifications);

// PUT /api/users/settings — update cost preferences
router.put('/settings', validate(settingsSchema), userController.updateSettings);

// POST /api/users/cloud-credentials — store encrypted provider credentials
router.post('/cloud-credentials', validate(credentialsSchema), userController.saveCloudCredentials);

module.exports = router;
