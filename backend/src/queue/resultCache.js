'use strict';

const { getRedisConnection } = require('./connection');
const { isInlineQueueMode } = require('../utils/config');
const { JOB_NAMES } = require('./jobNames');

const inlineCache = new Map();

const getKey = (jobName) => `cloudmgmt:queue:last-result:${jobName}`;

// How long (in seconds) each job result remains valid in Redis before expiring.
// Slightly longer than the respective repeat interval so a failed run can still
// serve the previous cached value until the next successful execution.
const RESULT_TTL_SECONDS = {
  [JOB_NAMES.providerHealthRefresh]: 10 * 60,    // 10 minutes
  [JOB_NAMES.costSync]:              7 * 3600,    // 7 hours
  [JOB_NAMES.recommendationRefresh]: 2 * 3600,   // 2 hours
};

const DEFAULT_TTL_SECONDS = 3600; // 1 hour fallback

const setLatestJobResult = async (jobName, value) => {
  if (isInlineQueueMode()) {
    inlineCache.set(jobName, value);
    return;
  }

  const ttl = RESULT_TTL_SECONDS[jobName] ?? DEFAULT_TTL_SECONDS;
  const redis = getRedisConnection();
  await redis.set(getKey(jobName), JSON.stringify(value), 'EX', ttl);
};

const getLatestJobResult = async (jobName) => {
  if (isInlineQueueMode()) {
    return inlineCache.get(jobName) || null;
  }

  const redis = getRedisConnection();
  const value = await redis.get(getKey(jobName));
  return value ? JSON.parse(value) : null;
};

module.exports = {
  setLatestJobResult,
  getLatestJobResult,
};