'use strict';

const IORedis = require('ioredis');
const { isInlineQueueMode } = require('../utils/config');

let connection;

const getRedisConnection = () => {
  if (isInlineQueueMode()) return null;

  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }

  return connection;
};

module.exports = { getRedisConnection };