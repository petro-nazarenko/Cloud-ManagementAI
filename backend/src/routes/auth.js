'use strict';

const { Router } = require('express');
const Joi = require('joi');
const authController = require('../controllers/authController');

const router = Router();

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

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(64).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// POST /api/auth/register
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account (role defaults to viewer)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Alice }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: User created, content: { application/json: { schema: { $ref: '#/components/schemas/Tokens' } } } }
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 */
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT access + refresh tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, content: { application/json: { schema: { $ref: '#/components/schemas/Tokens' } } } }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh
/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens issued, content: { application/json: { schema: { $ref: '#/components/schemas/Tokens' } } } }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

module.exports = router;
