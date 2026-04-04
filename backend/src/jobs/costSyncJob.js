'use strict';

const { fetchRealCosts } = require('../services/costService');

const runCostSyncJob = async () => {
  const snapshot = await fetchRealCosts('30d');
  return {
    ...snapshot,
    refreshedAt: new Date().toISOString(),
  };
};

module.exports = { runCostSyncJob };