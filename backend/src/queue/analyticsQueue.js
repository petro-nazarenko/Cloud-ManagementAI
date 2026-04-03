'use strict';

const { Queue } = require('bullmq');
const logger = require('../utils/logger');
const { isInlineQueueMode } = require('../utils/config');
const { getRedisConnection } = require('./connection');
const { JOB_NAMES } = require('./jobNames');
const { runRecommendationRefreshJob } = require('../jobs/recommendationRefreshJob');

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

const runInlineRecommendationRefresh = async () => {
  const jobId = `inline-${Date.now()}`;
  inlineJobs.set(jobId, { id: jobId, name: JOB_NAMES.recommendationRefresh, state: 'active', mode: 'inline' });

  try {
    const result = await runRecommendationRefreshJob();
    const job = {
      id: jobId,
      name: JOB_NAMES.recommendationRefresh,
      state: 'completed',
      mode: 'inline',
      result,
    };
    inlineJobs.set(jobId, job);
    return job;
  } catch (error) {
    const job = {
      id: jobId,
      name: JOB_NAMES.recommendationRefresh,
      state: 'failed',
      mode: 'inline',
      error: error.message,
    };
    inlineJobs.set(jobId, job);
    throw error;
  }
};

const enqueueRecommendationRefresh = async (requestedBy) => {
  if (isInlineQueueMode()) {
    return runInlineRecommendationRefresh();
  }

  const queue = getAnalyticsQueue();
  const job = await queue.add(JOB_NAMES.recommendationRefresh, { requestedBy });

  logger.info(`Queued recommendation refresh job '${job.id}'.`);

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

module.exports = {
  enqueueRecommendationRefresh,
  getAnalyticsJobStatus,
  getAnalyticsQueue,
};