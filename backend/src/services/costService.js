'use strict';

const buildCostsSnapshot = (period = '30d', provider) => {
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

  const breakdown = Object.entries(data).map(([p, services]) => ({
    provider: p,
    total: services.reduce((sum, s) => sum + s.amount, 0),
    currency: 'USD',
    services,
  }));

  const grandTotal = breakdown.reduce((sum, item) => sum + item.total, 0);

  return {
    period,
    grandTotal: { amount: parseFloat(grandTotal.toFixed(2)), currency: 'USD' },
    breakdown,
  };
};

module.exports = { buildCostsSnapshot };