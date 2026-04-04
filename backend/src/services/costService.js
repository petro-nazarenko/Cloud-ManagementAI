'use strict';

const logger = require('../utils/logger');

/**
 * Static fallback cost snapshot used when cloud credentials are absent.
 * Values approximate realistic monthly spend for demo purposes.
 */
const MOCK_COSTS = {
  aws: [
    { service: 'EC2', amount: 1240.50, currency: 'USD' },
    { service: 'S3', amount: 320.10, currency: 'USD' },
    { service: 'RDS', amount: 890.00, currency: 'USD' },
    { service: 'Lambda', amount: 45.80, currency: 'USD' },
  ],
  azure: [
    { service: 'Virtual Machines', amount: 980.00, currency: 'USD' },
    { service: 'Blob Storage', amount: 210.00, currency: 'USD' },
    { service: 'Azure SQL', amount: 640.00, currency: 'USD' },
  ],
  gcp: [
    { service: 'Compute Engine', amount: 750.00, currency: 'USD' },
    { service: 'Cloud Storage', amount: 190.00, currency: 'USD' },
    { service: 'BigQuery', amount: 420.00, currency: 'USD' },
  ],
};

/**
 * Build a cost snapshot from static mock data.
 * Used as a fallback when cloud credentials are not configured.
 */
const buildCostsSnapshot = (period = '30d', provider) => {
  const data = provider ? { [provider]: MOCK_COSTS[provider] || [] } : MOCK_COSTS;

  const breakdown = Object.entries(data).map(([p, services]) => ({
    provider: p,
    total: services.reduce((sum, s) => sum + s.amount, 0),
    currency: 'USD',
    services: services.map((s) => ({ ...s, period })),
  }));

  const grandTotal = breakdown.reduce((sum, item) => sum + item.total, 0);

  return {
    period,
    grandTotal: { amount: parseFloat(grandTotal.toFixed(2)), currency: 'USD' },
    breakdown,
  };
};

/** Convert a period string like '30d' | '7d' | '90d' to ISO date strings */
const periodToDateRange = (period = '30d') => {
  const days = parseInt(period, 10) || 30;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
};

/**
 * Attempt to fetch real cost data from AWS Cost Explorer.
 * Returns null when credentials are absent or the call fails.
 */
const fetchAWSCosts = async (period) => {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) return null;

  try {
    const awsService = require('./awsService');
    const { startDate, endDate } = periodToDateRange(period);
    const results = await awsService.getCosts(startDate, endDate);
    if (!results || results.length === 0) return null;

    // Aggregate all time-period groups into a single service → amount map
    const serviceMap = {};
    for (const periodResult of results) {
      for (const group of periodResult.Groups || []) {
        const serviceName = group.Keys?.[0] || 'Other';
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || 0);
        serviceMap[serviceName] = (serviceMap[serviceName] || 0) + amount;
      }
    }

    const services = Object.entries(serviceMap)
      .filter(([, amount]) => amount > 0)
      .map(([service, amount]) => ({
        service,
        amount: parseFloat(amount.toFixed(2)),
        currency: 'USD',
        period,
      }));

    return {
      provider: 'aws',
      total: parseFloat(services.reduce((s, i) => s + i.amount, 0).toFixed(2)),
      currency: 'USD',
      services,
      source: 'live',
    };
  } catch (err) {
    logger.warn(`fetchAWSCosts failed: ${err.message}`);
    return null;
  }
};

/**
 * Attempt to fetch real cost data from Azure Cost Management.
 * Returns null when credentials are absent or the call fails.
 */
const fetchAzureCosts = async (period) => {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_SUBSCRIPTION_ID) return null;

  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const { CostManagementClient } = require('@azure/arm-costmanagement');

    const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
    const client = new CostManagementClient(credential);

    const { startDate, endDate } = periodToDateRange(period);
    const scope = `/subscriptions/${AZURE_SUBSCRIPTION_ID}`;

    const result = await client.query.usage(scope, {
      type: 'Usage',
      timeframe: 'Custom',
      timePeriod: { from: new Date(startDate), to: new Date(endDate) },
      dataset: {
        granularity: 'None',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        grouping: [{ type: 'Dimension', name: 'ServiceName' }],
      },
    });

    const serviceMap = {};
    const cols = (result.columns || []).map((c) => c.name);
    const costIdx = cols.indexOf('Cost');
    const nameIdx = cols.indexOf('ServiceName');

    for (const row of result.rows || []) {
      const serviceName = row[nameIdx] || 'Other';
      const amount = parseFloat(row[costIdx] || 0);
      serviceMap[serviceName] = (serviceMap[serviceName] || 0) + amount;
    }

    const services = Object.entries(serviceMap)
      .filter(([, amount]) => amount > 0)
      .map(([service, amount]) => ({
        service,
        amount: parseFloat(amount.toFixed(2)),
        currency: 'USD',
        period,
      }));

    return {
      provider: 'azure',
      total: parseFloat(services.reduce((s, i) => s + i.amount, 0).toFixed(2)),
      currency: 'USD',
      services,
      source: 'live',
    };
  } catch (err) {
    logger.warn(`fetchAzureCosts failed: ${err.message}`);
    return null;
  }
};

/**
 * Fetch real costs from all configured providers and merge with mock fallback
 * for providers that are not configured.
 */
const fetchRealCosts = async (period = '30d', provider) => {
  const providers = provider ? [provider] : ['aws', 'azure', 'gcp'];
  const breakdown = [];

  for (const p of providers) {
    let data = null;

    if (p === 'aws') data = await fetchAWSCosts(period);
    if (p === 'azure') data = await fetchAzureCosts(period);
    // GCP: fall through to mock (Cloud Billing API requires separate account setup)

    if (data) {
      breakdown.push(data);
    } else {
      // Fallback to mock for this provider
      const mock = MOCK_COSTS[p] || [];
      breakdown.push({
        provider: p,
        total: parseFloat(mock.reduce((s, i) => s + i.amount, 0).toFixed(2)),
        currency: 'USD',
        services: mock.map((s) => ({ ...s, period })),
        source: 'mock',
      });
    }
  }

  const grandTotal = breakdown.reduce((sum, item) => sum + item.total, 0);
  return {
    period,
    grandTotal: { amount: parseFloat(grandTotal.toFixed(2)), currency: 'USD' },
    breakdown,
  };
};

module.exports = { buildCostsSnapshot, fetchRealCosts, periodToDateRange };