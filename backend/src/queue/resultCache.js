'use strict';

const { getRedisConnection } = require('./connection');
const { isInlineQueueMode } = require('../utils/config');

const inlineCache = new Map();

const getKey = (jobName) => `cloudmgmt:queue:last-result:${jobName}`;

const setLatestJobResult = async (jobName, value) => {
  if (isInlineQueueMode()) {
    inlineCache.set(jobName, value);
    return;
  }

  const redis = getRedisConnection();
  await redis.set(getKey(jobName), JSON.stringify(value));
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