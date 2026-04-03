'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const resourcesRouter = require('./routes/resources');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');
const providersRouter = require('./routes/providers');
const errorHandler = require('./middleware/errorHandler');
const metricsService = require('./services/metricsService');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Prometheus metrics middleware — count every request
app.use((req, res, next) => {
  const end = metricsService.httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
    metricsService.httpRequestsTotal.inc({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
});

// Health check — no auth required
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Prometheus metrics scrape endpoint — no auth required
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.register.contentType);
    res.end(await metricsService.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/providers', providersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server only when this module is the entry point
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Cloud Management AI backend running on port ${PORT}`);
  });
}

module.exports = app;
