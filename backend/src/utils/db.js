'use strict';

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const logger = require('./logger');

const isTest = process.env.NODE_ENV === 'test';

let sequelize;

if (isTest) {
  // In-memory SQLite for the test suite — no external DB required
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  });
} else {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'cloudmgmt',
    DB_USER = 'cloudmgmt_admin',
    DB_PASSWORD = '',
    DB_SSL = 'false',
  } = process.env;

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    dialect: 'postgres',
    dialectOptions: DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  });
}

/**
 * Connect to the database with exponential-backoff retry.
 * @param {number} maxRetries
 * @param {number} delayMs   Initial delay between retries (doubles each attempt)
 */
const connect = async (maxRetries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established.');
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error(`Database connection failed after ${maxRetries} attempts: ${err.message}`);
        throw err;
      }
      logger.warn(`DB connection attempt ${attempt}/${maxRetries} failed — retrying in ${delayMs}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
};

/**
 * Sync all models to the database.
 * - In test mode: `force: true` drops and recreates all tables (clean slate).
 * - In development mode: `alter: true` may be used to apply incremental changes.
 * - In production: `alter: false` is the default — run explicit migration scripts
 *   (e.g., Umzug or sequelize-cli migrations) to evolve the schema safely.
 *   Never use `force: true` or `alter: true` against a production database.
 */
const sync = async (options = {}) => {
  const defaultOptions = process.env.NODE_ENV === 'test' ? { force: true } : { alter: false };
  await sequelize.sync({ ...defaultOptions, ...options });
  logger.info('Database models synced.');
};

const createMigrator = () => {
  return new Umzug({
    migrations: {
      glob: path.join(__dirname, '../../migrations/*.js'),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: {
      info: (message) => logger.info(message),
      warn: (message) => logger.warn(message),
      error: (message) => logger.error(message),
      debug: (message) => logger.debug(message),
    },
  });
};

const migrate = async () => {
  const migrator = createMigrator();
  const executed = await migrator.up();

  if (executed.length === 0) {
    logger.info('Database migrations already up to date.');
  } else {
    logger.info(`Applied ${executed.length} database migration(s).`);
  }

  return executed;
};

const pendingMigrations = async () => {
  const migrator = createMigrator();
  return migrator.pending();
};

const revertLastMigration = async () => {
  const migrator = createMigrator();
  const reverted = await migrator.down();

  if (!reverted) {
    logger.info('No database migration to revert.');
    return null;
  }

  logger.info(`Reverted migration '${reverted.name}'.`);
  return reverted;
};

/**
 * Gracefully close the connection pool.
 */
const close = async () => {
  await sequelize.close();
  logger.info('Database connection closed.');
};

module.exports = { sequelize, connect, sync, migrate, pendingMigrations, revertLastMigration, close };
