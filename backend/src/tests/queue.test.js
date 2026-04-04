'use strict';

/**
 * Tests for analyticsQueue inline mode and resultCache.
 * Kept in a separate file to avoid shared-SQLite-connection conflicts.
 */

const { connect, sync, close } = require('../utils/db');
const { seedResources } = require('../controllers/resourceController');

beforeAll(async () => {
  await connect();
  await sync({ force: true });
  await seedResources();
}, 30000);

afterAll(async () => {
  await close();
});

// ─────────────────────────────────────────────────────────────────────
// analyticsQueue — inline mode
// ─────────────────────────────────────────────────────────────────────

describe('analyticsQueue — inline mode', () => {
  const {
    enqueueRecommendationRefresh,
    enqueueProviderHealthRefresh,
    enqueueCostSync,
    getAnalyticsJobStatus,
  } = require('../queue/analyticsQueue');

  it('enqueueRecommendationRefresh returns completed job', async () => {
    const job = await enqueueRecommendationRefresh('test-user');
    expect(job).toHaveProperty('id');
    expect(job).toHaveProperty('name');
    expect(job.mode).toBe('inline');
    expect(job.state).toBe('completed');
  });

  it('enqueueProviderHealthRefresh completes inline', async () => {
    const job = await enqueueProviderHealthRefresh('test-user');
    expect(job.state).toBe('completed');
    expect(job.result).toBeDefined();
  });

  it('enqueueCostSync completes inline', async () => {
    const job = await enqueueCostSync('test-user');
    expect(job.state).toBe('completed');
    expect(job.result).toBeDefined();
  });

  it('getAnalyticsJobStatus returns job by id', async () => {
    const queued = await enqueueRecommendationRefresh('test');
    const status = await getAnalyticsJobStatus(queued.id);
    expect(status).not.toBeNull();
    expect(status.id).toBe(queued.id);
    expect(status.state).toBe('completed');
  });

  it('getAnalyticsJobStatus returns null for unknown job id', async () => {
    const status = await getAnalyticsJobStatus('non-existent-job-id-xyz');
    expect(status).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// resultCache — inline mode with all known job name TTLs
// ─────────────────────────────────────────────────────────────────────

describe('resultCache — known job name TTLs', () => {
  const { setLatestJobResult, getLatestJobResult } = require('../queue/resultCache');
  const { JOB_NAMES } = require('../queue/jobNames');

  it('stores and retrieves providerHealthRefresh result', async () => {
    const data = { providers: ['aws'], refreshedAt: new Date().toISOString() };
    await setLatestJobResult(JOB_NAMES.providerHealthRefresh, data);
    const result = await getLatestJobResult(JOB_NAMES.providerHealthRefresh);
    expect(result).toMatchObject(data);
  });

  it('stores and retrieves costSync result', async () => {
    const data = { period: '30d', grandTotal: { amount: 500, currency: 'USD' } };
    await setLatestJobResult(JOB_NAMES.costSync, data);
    const result = await getLatestJobResult(JOB_NAMES.costSync);
    expect(result).toMatchObject(data);
  });

  it('stores and retrieves recommendationRefresh result', async () => {
    const data = { created: 5, skipped: 2 };
    await setLatestJobResult(JOB_NAMES.recommendationRefresh, data);
    const result = await getLatestJobResult(JOB_NAMES.recommendationRefresh);
    expect(result).toMatchObject(data);
  });

  it('returns null for unknown job name', async () => {
    const result = await getLatestJobResult('non-existent-job-name');
    expect(result).toBeNull();
  });

  it('overwrites existing result when called again', async () => {
    await setLatestJobResult(JOB_NAMES.costSync, { period: '7d', grandTotal: { amount: 100 } });
    await setLatestJobResult(JOB_NAMES.costSync, { period: '30d', grandTotal: { amount: 999 } });
    const result = await getLatestJobResult(JOB_NAMES.costSync);
    expect(result.grandTotal.amount).toBe(999);
  });
});
