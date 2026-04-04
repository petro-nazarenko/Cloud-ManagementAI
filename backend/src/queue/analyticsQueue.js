'use strict';

const { Queue } = require('bullmq');
const logger = require('../utils/logger');
const { isInlineQueueMode } = require('../utils/config');
const { getRedisConnection } = require('./connection');
const { JOB_NAMES } = require('./jobNames');
const { runRecommendationRefreshJob } = require('../jobs/recommendationRefreshJob');
const { runProviderHealthRefreshJob } = require('../jobs/providerHealthRefreshJob');
const { runCostSyncJob } = require('../jobs/costSyncJob');
const { getLatestJobResult, setLatestJobResult } = require('./resultCache');

const inlineJobs = new Map();

let analyticsQueue;

const getAnalyticsQueue = () => {
  if (isInlineQueueMode()) return null;

  if (!analyticsQueue) {
    analyticsQueue = new Queue('analytics', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }

  return analyticsQueue;
};

const inlineHandlers = {
  [JOB_NAMES.recommendationRefresh]: runRecommendationRefreshJob,
  [JOB_NAMES.providerHealthRefresh]: runProviderHealthRefreshJob,
  [JOB_NAMES.costSync]: runCostSyncJob,
};

const runInlineJob = async (jobName) => {
  const handler = inlineHandlers[jobName];
  if (!handler) {
    throw new Error(`No inline handler registered for '${jobName}'.`);
  }

  const jobId = `inline-${Date.now()}`;
  inlineJobs.set(jobId, { id: jobId, name: jobName, state: 'active', mode: 'inline' });

  try {
    const result = await handler();
    await setLatestJobResult(jobName, result);

    const job = {
      id: jobId,
      name: jobName,
      state: 'completed',
      mode: 'inline',
      result,
    };
    inlineJobs.set(jobId, job);
    return job;
  } catch (error) {
    const job = {
      id: jobId,
      name: jobName,
      state: 'failed',
      mode: 'inline',
      error: error.message,
    };
    inlineJobs.set(jobId, job);
    throw error;
  }
};

const enqueueAnalyticsJob = async (jobName, payload = {}) => {
  if (isInlineQueueMode()) {
    return runInlineJob(jobName);
  }

  const queue = getAnalyticsQueue();
  const job = await queue.add(jobName, payload);

  logger.info(`Queued analytics job '${jobName}' with id '${job.id}'.`);

  return {
    id: job.id,
    name: job.name,
    state: 'waiting',
    mode: 'redis',
  };
};

const getAnalyticsJobStatus = async (jobId) => {
  if (isInlineQueueMode()) {
    const job = inlineJobs.get(jobId);
    return job || null;
  }

  const queue = getAnalyticsQueue();
  const job = await queue.getJob(jobId);
  if (!job) return null;

  return {
    id: job.id,
    name: job.name,
    state: await job.getState(),
    mode: 'redis',
    result: job.returnvalue || null,
    failedReason: job.failedReason || null,
  };
};

const enqueueRecommendationRefresh = async (requestedBy) => enqueueAnalyticsJob(JOB_NAMES.recommendationRefresh, { requestedBy });
const enqueueProviderHealthRefresh = async (requestedBy) => enqueueAnalyticsJob(JOB_NAMES.providerHealthRefresh, { requestedBy });
const enqueueCostSync = async (requestedBy) => enqueueAnalyticsJob(JOB_NAMES.costSync, { requestedBy });

// Cron-like repeat intervals (milliseconds)
const SCHEDULES = {
  [JOB_NAMES.providerHealthRefresh]: 5 * 60 * 1000,      //  5 minutes
  [JOB_NAMES.costSync]:              6 * 60 * 60 * 1000,  //  6 hours
  [JOB_NAMES.recommendationRefresh]: 60 * 60 * 1000,      //  1 hour
};

/**
 * Register repeatable BullMQ job schedulers.
 * Idempotent — safe to call on every worker startup and will upsert rather than
 * create duplicate schedulers.
 * No-op when QUEUE_MODE is not redis.
 */
const registerScheduledJobs = async () => {
  if (isInlineQueueMode()) {
    logger.info('Skipping scheduled job registration (inline queue mode).');
    return;
  }

  const queue = getAnalyticsQueue();

  for (const [jobName, everyMs] of Object.entries(SCHEDULES)) {
    await queue.upsertJobScheduler(
      `scheduled:${jobName}`,
      { every: everyMs },
      { name: jobName, data: { source: 'scheduler' } },
    );
    logger.info(`Registered scheduler for '${jobName}' every ${everyMs / 1000}s.`);
  }
};

module.exports = {
  enqueueAnalyticsJob,
  enqueueCostSync,
  enqueueProviderHealthRefresh,
  enqueueRecommendationRefresh,
  getAnalyticsJobStatus,
  getAnalyticsQueue,
  getLatestJobResult,
  registerScheduledJobs,
};