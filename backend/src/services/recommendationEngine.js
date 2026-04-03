'use strict';

/**
 * Rule-based recommendation engine.
 *
 * Analyses resource utilisation data and emits cost-saving recommendations
 * that are then persisted in the Recommendation model.
 */

const { Recommendation, Resource } = require('../models');
const logger = require('../utils/logger');

// ── Rule definitions ──────────────────────────────────────────────────────────

const RULES = [
  {
    id: 'idle-compute',
    type: 'right-sizing',
    severity: 'medium',
    applies: (r) =>
      ['ec2', 'vm', 'instance'].includes(r.type) &&
      r.status === 'running' &&
      r.cpuPercent != null &&
      r.cpuPercent < 10,
    build: (r) => ({
      provider: r.provider,
      resourceId: r.id,
      resourceName: r.name,
      type: 'right-sizing',
      severity: 'medium',
      estimatedMonthlySavings: parseFloat(((r.monthlyCost || 0) * 0.4).toFixed(2)),
      currency: 'USD',
      description: `${r.name} (${r.type}) has CPU utilisation of ${r.cpuPercent}% — consistently below 10%. Downsize to a smaller instance class to reduce costs.`,
      action: `Resize ${r.name} to the next smaller instance type during the next maintenance window.`,
    }),
  },
  {
    id: 'stopped-compute',
    type: 'schedule',
    severity: 'high',
    applies: (r) =>
      ['ec2', 'vm', 'instance'].includes(r.type) &&
      r.status === 'stopped' &&
      (r.monthlyCost || 0) === 0 &&
      r.tags &&
      r.tags.env !== 'production',
    build: (r) => ({
      provider: r.provider,
      resourceId: r.id,
      resourceName: r.name,
      type: 'schedule',
      severity: 'high',
      estimatedMonthlySavings: parseFloat(((r.monthlyCost || 50) * 0.9).toFixed(2)),
      currency: 'USD',
      description: `${r.name} is stopped but still incurs storage costs. Consider terminating and snapshotting if unused.`,
      action: `Terminate ${r.name} after taking a snapshot, or configure an auto-start/stop schedule.`,
    }),
  },
  {
    id: 'high-memory-utilisation',
    type: 'right-sizing',
    severity: 'low',
    applies: (r) =>
      r.memoryPercent != null && r.memoryPercent > 90 && r.status === 'running',
    build: (r) => ({
      provider: r.provider,
      resourceId: r.id,
      resourceName: r.name,
      type: 'right-sizing',
      severity: 'low',
      estimatedMonthlySavings: 0,
      currency: 'USD',
      description: `${r.name} memory utilisation is ${r.memoryPercent}% — above 90%. Upsize to prevent out-of-memory errors.`,
      action: `Upgrade ${r.name} to a memory-optimised instance type to improve stability.`,
    }),
  },
  {
    id: 'cold-storage',
    type: 'storage-class',
    severity: 'low',
    applies: (r) =>
      ['s3', 'storage'].includes(r.type) &&
      r.storagePct != null &&
      r.storagePct < 20,
    build: (r) => ({
      provider: r.provider,
      resourceId: r.id,
      resourceName: r.name,
      type: 'storage-class',
      severity: 'low',
      estimatedMonthlySavings: parseFloat(((r.monthlyCost || 0) * 0.3).toFixed(2)),
      currency: 'USD',
      description: `${r.name} has low storage utilisation (${r.storagePct}%). Objects may be eligible for a cheaper storage tier.`,
      action: `Apply a lifecycle policy to move infrequently accessed objects to a cheaper storage class (e.g. S3 Glacier Instant Retrieval, Azure Cool, GCS Nearline).`,
    }),
  },
  {
    id: 'committed-use',
    type: 'committed-use',
    severity: 'low',
    applies: (r) =>
      r.status === 'running' &&
      (r.monthlyCost || 0) > 200 &&
      r.tags &&
      r.tags.env === 'production',
    build: (r) => ({
      provider: r.provider,
      resourceId: r.id,
      resourceName: r.name,
      type: 'committed-use',
      severity: 'low',
      estimatedMonthlySavings: parseFloat(((r.monthlyCost || 0) * 0.2).toFixed(2)),
      currency: 'USD',
      description: `${r.name} is a long-running production resource costing $${r.monthlyCost}/mo. A 1-year reserved/committed-use contract could save ~20%.`,
      action: `Purchase a 1-year reserved instance or committed use discount for ${r.name}.`,
    }),
  },
];

// ── Engine ─────────────────────────────────────────────────────────────────────

/**
 * Run all rules over the current resource set and upsert recommendations.
 * Existing open recommendations for the same (resourceId, type) pair are not
 * duplicated; already-applied or dismissed ones are left unchanged.
 */
const runEngine = async () => {
  try {
    const resources = await Resource.findAll();
    let created = 0;
    let skipped = 0;

    for (const resource of resources) {
      for (const rule of RULES) {
        if (!rule.applies(resource)) continue;

        const rec = rule.build(resource);

        // Don't create a new recommendation if an open one already exists
        const existing = await Recommendation.findOne({
          where: { resourceId: resource.id, type: rec.type, status: 'open' },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await Recommendation.create(rec);
        created++;
      }
    }

    logger.info(`Recommendation engine: ${created} new recommendations created, ${skipped} skipped (already open).`);
  } catch (err) {
    logger.error(`Recommendation engine error: ${err.message}`);
  }
};

/**
 * Seed initial recommendations if the DB is empty (ensures the UI is not blank
 * on a fresh install before cloud credentials are configured).
 */
const seedRecommendations = async () => {
  const count = await Recommendation.count();
  if (count > 0) return;

  await runEngine();

  // If still empty (e.g. no resources with metrics), insert demo recommendations
  const countAfter = await Recommendation.count();
  if (countAfter === 0) {
    await Recommendation.bulkCreate([
      {
        provider: 'aws',
        resourceId: null,
        resourceName: 'prod-web-server',
        type: 'right-sizing',
        severity: 'medium',
        estimatedMonthlySavings: 180,
        currency: 'USD',
        description: 'EC2 instance t3.medium is consistently using <30% CPU over the last 14 days. Downsize to t3.small to save ~$180/month.',
        action: 'Resize instance to t3.small during next maintenance window.',
        status: 'open',
      },
      {
        provider: 'azure',
        resourceId: null,
        resourceName: 'staging-vm',
        type: 'schedule',
        severity: 'high',
        estimatedMonthlySavings: 450,
        currency: 'USD',
        description: 'staging-vm is running 24/7 but shows zero traffic outside business hours (9am–6pm weekdays).',
        action: 'Configure auto-shutdown schedule to stop VM outside business hours.',
        status: 'open',
      },
      {
        provider: 'gcp',
        resourceId: null,
        resourceName: 'compute-node-1',
        type: 'committed-use',
        severity: 'low',
        estimatedMonthlySavings: 120,
        currency: 'USD',
        description: 'compute-node-1 has been running continuously for 6 months. A 1-year committed use discount would save ~20%.',
        action: 'Purchase a 1-year committed use contract for this instance.',
        status: 'open',
      },
      {
        provider: 'aws',
        resourceId: null,
        resourceName: 'assets-bucket',
        type: 'storage-class',
        severity: 'low',
        estimatedMonthlySavings: 60,
        currency: 'USD',
        description: '72% of objects in assets-bucket have not been accessed in 90+ days. Move to S3 Glacier Instant Retrieval.',
        action: 'Apply an S3 Lifecycle policy to transition cold objects to Glacier Instant Retrieval after 90 days.',
        status: 'open',
      },
    ]);
  }
};

module.exports = { runEngine, seedRecommendations };
