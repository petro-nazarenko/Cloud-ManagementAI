'use strict';

const { buildCostsSnapshot } = require('../services/costService');

const runCostSyncJob = async () => {
  const snapshot = buildCostsSnapshot('30d');
  return {
    ...snapshot,
    refreshedAt: new Date().toISOString(),
  };
};

module.exports = { runCostSyncJob };