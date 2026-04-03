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
const metricsService = require('../services/metricsService');

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
      const startedAt = process.hrtime.bigint();
      metricsService.queueJobsInFlight.inc({ job_name: job.name });

      const handler = handlers[job.name];
      if (!handler) {
        throw new Error(`No job handler registered for '${job.name}'.`);
      }

      try {
        const result = await handler(job.data);
        await setLatestJobResult(job.name, result);

        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        metricsService.queueJobDuration.observe({ job_name: job.name, status: 'completed' }, durationSeconds);
        metricsService.queueJobsProcessedTotal.inc({ job_name: job.name, status: 'completed' });

        return result;
      } catch (error) {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        metricsService.queueJobDuration.observe({ job_name: job.name, status: 'failed' }, durationSeconds);
        metricsService.queueJobsProcessedTotal.inc({ job_name: job.name, status: 'failed' });
        throw error;
      } finally {
        metricsService.queueJobsInFlight.dec({ job_name: job.name });
      }
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