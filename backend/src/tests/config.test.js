'use strict';

const { shouldSeedDemoData, validateConfig } = require('../utils/config');

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
  process.env = { ...ORIGINAL_ENV };
};

beforeEach(() => {
  resetEnv();
});

afterAll(() => {
  resetEnv();
});

describe('config validation', () => {
  it('validateConfig throws when production uses default secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'change-me-in-production';
    process.env.DB_PASSWORD = 'changeme';
    process.env.CORS_ORIGIN = '';
    process.env.ENCRYPTION_KEY = 'short';

    expect(() => validateConfig()).toThrow(/Invalid production configuration/);
  });

  it('validateConfig accepts valid production configuration', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'very-strong-production-secret-value-123456';
    process.env.DB_PASSWORD = 'a-better-db-password';
    process.env.CORS_ORIGIN = 'https://cloud.example.com';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    expect(() => validateConfig()).not.toThrow();
  });

  it('shouldSeedDemoData defaults to false in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_DEMO_SEEDING;

    expect(shouldSeedDemoData()).toBe(false);
  });

  it('shouldSeedDemoData respects explicit override', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEMO_SEEDING = 'true';

    expect(shouldSeedDemoData()).toBe(true);
  });
});