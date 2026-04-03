'use strict';

const DEFAULT_JWT_SECRET = 'change-me-in-production';
const DEFAULT_DB_PASSWORD = 'changeme';
const ENCRYPTION_KEY_PATTERN = /^[0-9a-fA-F]{64}$/;

const isProduction = () => process.env.NODE_ENV === 'production';

const validateConfig = () => {
  if (!isProduction()) return;

  const errors = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    errors.push('JWT_SECRET must be set to a non-default value in production.');
  }

  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === DEFAULT_DB_PASSWORD) {
    errors.push('DB_PASSWORD must be set to a non-default value in production.');
  }

  if (!process.env.CORS_ORIGIN) {
    errors.push('CORS_ORIGIN must be set in production.');
  }

  if (!process.env.ENCRYPTION_KEY || !ENCRYPTION_KEY_PATTERN.test(process.env.ENCRYPTION_KEY)) {
    errors.push('ENCRYPTION_KEY must be exactly 64 hex characters in production.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production configuration: ${errors.join(' ')}`);
  }
};

const shouldSeedDemoData = () => {
  if (process.env.ENABLE_DEMO_SEEDING === 'true') return true;
  if (process.env.ENABLE_DEMO_SEEDING === 'false') return false;
  return !isProduction();
};

const isInlineQueueMode = () => {
  if (process.env.QUEUE_MODE === 'inline') return true;
  if (process.env.QUEUE_MODE === 'redis') return false;
  return process.env.NODE_ENV === 'test' || !process.env.REDIS_URL;
};

module.exports = {
  DEFAULT_DB_PASSWORD,
  DEFAULT_JWT_SECRET,
  ENCRYPTION_KEY_PATTERN,
  isInlineQueueMode,
  shouldSeedDemoData,
  validateConfig,
};