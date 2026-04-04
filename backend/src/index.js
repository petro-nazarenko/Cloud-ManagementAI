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
const usersRouter = require('./routes/users');
const auditRouter = require('./routes/audit');
const adminRouter = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const metricsService = require('./services/metricsService');
const logger = require('./utils/logger');
const { connect, migrate, sync } = require('./utils/db');
const { shouldSeedDemoData, validateConfig } = require('./utils/config');
const { seedAdmin } = require('./controllers/authController');
const { seedResources } = require('./controllers/resourceController');
const { seedRecommendations } = require('./services/recommendationEngine');
const swaggerSpec = require('./utils/swagger');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin '${origin}' not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Tight rate limit for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

// General API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
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
app.use('/api/users', usersRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);

// OpenAPI docs (disabled in test to keep test output clean)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server only when this module is the entry point
if (require.main === module) {
  (async () => {
    try {
      validateConfig();
      await connect();

      if (process.env.NODE_ENV === 'production') {
        await migrate();
      } else {
        await sync();
      }

      if (shouldSeedDemoData()) {
        await seedAdmin();
        await seedResources();
        await seedRecommendations();
      }

      app.listen(PORT, () => {
        logger.info(`Cloud Management AI backend running on port ${PORT}`);
      });
    } catch (err) {
      logger.error(`Startup failed: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = app;
