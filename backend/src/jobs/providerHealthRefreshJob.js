'use strict';

const { healthCheckProviders } = require('../utils/providerHealth');

const runProviderHealthRefreshJob = async () => {
  const providers = await healthCheckProviders();
  return {
    providers,
    refreshedAt: new Date().toISOString(),
  };
};

module.exports = { runProviderHealthRefreshJob };