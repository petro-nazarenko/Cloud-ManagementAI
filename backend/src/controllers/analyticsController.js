'use strict';

/**
 * Returns mock cost data structured like a real cloud billing API.
 * Replace with live Cost Explorer / Azure Cost Management / GCP Billing calls.
 */
const getCosts = (req, res) => {
  const { period = '30d', provider } = req.query;

  const allCosts = {
    aws: [
      { service: 'EC2', amount: 1240.50, currency: 'USD', period },
      { service: 'S3', amount: 320.10, currency: 'USD', period },
      { service: 'RDS', amount: 890.00, currency: 'USD', period },
      { service: 'Lambda', amount: 45.80, currency: 'USD', period },
    ],
    azure: [
      { service: 'Virtual Machines', amount: 980.00, currency: 'USD', period },
      { service: 'Blob Storage', amount: 210.00, currency: 'USD', period },
      { service: 'Azure SQL', amount: 640.00, currency: 'USD', period },
    ],
    gcp: [
      { service: 'Compute Engine', amount: 750.00, currency: 'USD', period },
      { service: 'Cloud Storage', amount: 190.00, currency: 'USD', period },
      { service: 'BigQuery', amount: 420.00, currency: 'USD', period },
    ],
  };

  const data = provider ? { [provider]: allCosts[provider] || [] } : allCosts;

  const totalByProvider = Object.entries(data).map(([p, services]) => ({
    provider: p,
    total: services.reduce((sum, s) => sum + s.amount, 0),
    currency: 'USD',
    services,
  }));

  const grandTotal = totalByProvider.reduce((sum, p) => sum + p.total, 0);

  res.json({
    period,
    grandTotal: { amount: parseFloat(grandTotal.toFixed(2)), currency: 'USD' },
    breakdown: totalByProvider,
  });
};

/**
 * Returns mock resource utilisation metrics.
 */
const getUsage = (req, res) => {
  const { provider, resourceType } = req.query;

  const usage = [
    { resourceId: 'r-001', name: 'prod-web-server', provider: 'aws', resourceType: 'ec2', cpuPercent: 67.4, memoryPercent: 72.1, networkMbps: 145, storagePct: 45 },
    { resourceId: 'r-003', name: 'staging-vm', provider: 'azure', resourceType: 'vm', cpuPercent: 12.0, memoryPercent: 30.5, networkMbps: 20, storagePct: 22 },
    { resourceId: 'r-004', name: 'compute-node-1', provider: 'gcp', resourceType: 'instance', cpuPercent: 88.9, memoryPercent: 91.0, networkMbps: 310, storagePct: 60 },
  ];

  let result = usage;
  if (provider) result = result.filter((u) => u.provider === provider);
  if (resourceType) result = result.filter((u) => u.resourceType === resourceType);

  res.json({ data: result, total: result.length });
};

/**
 * Returns AI-generated cost-saving recommendations (mock data).
 */
const getRecommendations = (req, res) => {
  const recommendations = [
    {
      id: 'rec-001',
      provider: 'aws',
      resourceId: 'r-001',
      resourceName: 'prod-web-server',
      type: 'right-sizing',
      severity: 'medium',
      estimatedMonthlySavings: 180.00,
      currency: 'USD',
      description: 'EC2 instance t3.medium is consistently using <30% CPU over the last 14 days. Downsize to t3.small to save ~$180/month.',
      action: 'Resize instance to t3.small during next maintenance window.',
    },
    {
      id: 'rec-002',
      provider: 'azure',
      resourceId: 'r-003',
      resourceName: 'staging-vm',
      type: 'schedule',
      severity: 'high',
      estimatedMonthlySavings: 450.00,
      currency: 'USD',
      description: 'staging-vm is running 24/7 but shows zero traffic outside business hours (9am–6pm weekdays).',
      action: 'Configure auto-shutdown schedule to stop VM outside business hours.',
    },
    {
      id: 'rec-003',
      provider: 'gcp',
      resourceId: 'r-004',
      resourceName: 'compute-node-1',
      type: 'committed-use',
      severity: 'low',
      estimatedMonthlySavings: 120.00,
      currency: 'USD',
      description: 'compute-node-1 has been running continuously for 6 months. A 1-year committed use discount would save ~20%.',
      action: 'Purchase a 1-year committed use contract for this instance.',
    },
    {
      id: 'rec-004',
      provider: 'aws',
      resourceId: 'r-002',
      resourceName: 'assets-bucket',
      type: 'storage-class',
      severity: 'low',
      estimatedMonthlySavings: 60.00,
      currency: 'USD',
      description: '72% of objects in assets-bucket have not been accessed in 90+ days. Move to S3 Glacier Instant Retrieval.',
      action: 'Apply an S3 Lifecycle policy to transition cold objects to Glacier Instant Retrieval after 90 days.',
    },
  ];

  const totalSavings = recommendations.reduce((s, r) => s + r.estimatedMonthlySavings, 0);

  res.json({
    data: recommendations,
    total: recommendations.length,
    totalEstimatedMonthlySavings: { amount: totalSavings, currency: 'USD' },
  });
};

module.exports = { getCosts, getUsage, getRecommendations };
