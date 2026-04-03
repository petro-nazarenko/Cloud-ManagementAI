'use strict';

const client = require('prom-client');

// Create a dedicated registry to avoid collisions in tests
const register = new client.Registry();

// Collect default Node.js metrics (event loop lag, memory, CPU, etc.)
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const activeCloudResources = new client.Gauge({
  name: 'cloud_resources_active_total',
  help: 'Number of active cloud resources tracked',
  labelNames: ['provider', 'resource_type'],
  registers: [register],
});

const cloudProviderErrors = new client.Counter({
  name: 'cloud_provider_errors_total',
  help: 'Total errors from cloud provider SDK calls',
  labelNames: ['provider', 'operation'],
  registers: [register],
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  activeCloudResources,
  cloudProviderErrors,
};
