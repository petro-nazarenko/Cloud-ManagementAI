'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const logger = require('../utils/logger');
const { connect, close } = require('../utils/db');
const { isInlineQueueMode } = require('../utils/config');
const { getRedisConnection } = require('../queue/connection');
const { JOB_NAMES } = require('../queue/jobNames');
const { runRecommendationRefreshJob } = require('../jobs/recommendationRefreshJob');
const { runProviderHealthRefreshJob } = require('../jobs/providerHealthRefreshJob');
const { runCostSyncJob } = require('../jobs/costSyncJob');
const { setLatestJobResult } = require('../queue/resultCache');

const handlers = {
  [JOB_NAMES.recommendationRefresh]: runRecommendationRefreshJob,
  [JOB_NAMES.providerHealthRefresh]: runProviderHealthRefreshJob,
  [JOB_NAMES.costSync]: runCostSyncJob,
};

const start = async () => {
  if (isInlineQueueMode()) {
    logger.info('Queue worker not started because QUEUE_MODE resolved to inline.');
    return;
  }

  await connect();

  const worker = new Worker(
    'analytics',
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) {
        throw new Error(`No job handler registered for '${job.name}'.`);
      }

      const result = await handler(job.data);
      await setLatestJobResult(job.name, result);
      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Queue job '${job.name}' (${job.id}) completed.`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Queue job '${job?.name}' (${job?.id}) failed: ${error.message}`);
  });

  const shutdown = async () => {
    await worker.close();
    await close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Analytics queue worker started.');
};

start().catch(async (error) => {
  logger.error(`Queue worker startup failed: ${error.message}`);
  await close();
  process.exit(1);
});