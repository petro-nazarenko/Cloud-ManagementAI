'use strict';

const { runEngine } = require('../services/recommendationEngine');

const runRecommendationRefreshJob = async () => {
  const summary = await runEngine();
  return {
    ...summary,
    refreshedAt: new Date().toISOString(),
  };
};

module.exports = { runRecommendationRefreshJob };