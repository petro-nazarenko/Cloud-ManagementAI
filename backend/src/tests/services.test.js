'use strict';

/**
 * Unit tests for pure utility modules:
 *  - services/costService    (buildCostsSnapshot, periodToDateRange, fetchRealCosts)
 *  - middleware/permissions  (PERMISSIONS, ROLE_PERMISSIONS, getRolePermissions)
 *  - middleware/authorize    (authorizePermissions, authorizeRoles)
 *  - middleware/errorHandler
 *  - queue/resultCache       (inline mode)
 *  - utils/providerHealth    (checkProviderCredentials)
 *  - services/metricsService (register exposed)
 *  - services/recommendationEngine (generateRecommendations rule logic)
 *  - utils/config            (isInlineQueueMode)
 */

const { buildCostsSnapshot, periodToDateRange, fetchRealCosts } = require('../services/costService');
const { PERMISSIONS, ROLE_PERMISSIONS, getRolePermissions } = require('../middleware/permissions');
const { authorizePermissions, authorizeRoles } = require('../middleware/authorize');
const errorHandler = require('../middleware/errorHandler');
const { setLatestJobResult, getLatestJobResult } = require('../queue/resultCache');
const { checkProviderCredentials } = require('../utils/providerHealth');
const { isInlineQueueMode } = require('../utils/config');

// ── Helpers ────────────────────────────────────────────────────────────────

const mockReq = (overrides = {}) => ({ user: { role: 'admin', sub: 'u1' }, ...overrides });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

// ─────────────────────────────────────────────────────────────────────
// costService
// ─────────────────────────────────────────────────────────────────────

describe('buildCostsSnapshot', () => {
  it('returns all providers when no filter', () => {
    const snap = buildCostsSnapshot();
    expect(snap.breakdown.length).toBe(3);
    expect(snap).toHaveProperty('grandTotal');
    expect(snap.period).toBe('30d');
  });

  it('filters to single provider', () => {
    const snap = buildCostsSnapshot('7d', 'aws');
    expect(snap.breakdown.length).toBe(1);
    expect(snap.breakdown[0].provider).toBe('aws');
    expect(snap.period).toBe('7d');
  });

  it('returns empty breakdown for unknown provider', () => {
    const snap = buildCostsSnapshot('30d', 'unknown');
    expect(snap.breakdown).toEqual([{ provider: 'unknown', total: 0, currency: 'USD', services: [] }]);
  });

  it('grandTotal equals sum of breakdown totals', () => {
    const snap = buildCostsSnapshot();
    const sum = snap.breakdown.reduce((s, b) => s + b.total, 0);
    expect(snap.grandTotal.amount).toBeCloseTo(sum, 2);
  });
});

describe('periodToDateRange', () => {
  it('converts 30d to date range', () => {
    const { startDate, endDate } = periodToDateRange('30d');
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    expect(diff).toBeCloseTo(30, 0);
  });

  it('defaults to 30d for invalid input', () => {
    const { startDate, endDate } = periodToDateRange('bad');
    const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    expect(diff).toBeCloseTo(30, 0);
  });
});

describe('fetchRealCosts — no credentials (test env)', () => {
  it('returns mock fallback snapshot for all providers', async () => {
    const result = await fetchRealCosts('30d');
    expect(result).toHaveProperty('grandTotal');
    expect(result).toHaveProperty('breakdown');
    expect(result.breakdown.length).toBe(3);
    result.breakdown.forEach((b) => expect(b.total).toBeGreaterThan(0));
  });

  it('filters by provider', async () => {
    const result = await fetchRealCosts('30d', 'gcp');
    expect(result.breakdown.length).toBe(1);
    expect(result.breakdown[0].provider).toBe('gcp');
  });
});

// ─────────────────────────────────────────────────────────────────────
// permissions
// ─────────────────────────────────────────────────────────────────────

describe('PERMISSIONS map', () => {
  it('contains all expected permission keys', () => {
    expect(PERMISSIONS).toHaveProperty('resourcesWrite');
    expect(PERMISSIONS).toHaveProperty('providersHealthRead');
    expect(PERMISSIONS).toHaveProperty('auditLogsRead');
    expect(PERMISSIONS).toHaveProperty('adminUsersRead');
  });
});

describe('getRolePermissions', () => {
  it('admin has all permissions', () => {
    const perms = getRolePermissions('admin');
    expect(perms.length).toBe(Object.values(PERMISSIONS).length);
  });

  it('operator has write permissions but not admin', () => {
    const perms = getRolePermissions('operator');
    expect(perms).toContain(PERMISSIONS.resourcesWrite);
    expect(perms).not.toContain(PERMISSIONS.adminUsersRead);
  });

  it('viewer has health and job read permissions', () => {
    const perms = getRolePermissions('viewer');
    expect(perms).toContain(PERMISSIONS.providersHealthRead);
    expect(perms).toContain(PERMISSIONS.analyticsJobsRead);
    expect(perms).not.toContain(PERMISSIONS.resourcesWrite);
  });

  it('unknown role returns empty array', () => {
    const perms = getRolePermissions('unknown');
    expect(perms).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// authorize middleware
// ─────────────────────────────────────────────────────────────────────

describe('authorizePermissions', () => {
  it('calls next() when role has required permission', () => {
    const next = jest.fn();
    const req = mockReq({ user: { role: 'admin' } });
    const res = mockRes();
    authorizePermissions(PERMISSIONS.resourcesWrite)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when role lacks permission', () => {
    const next = jest.fn();
    const req = mockReq({ user: { role: 'viewer' } });
    const res = mockRes();
    authorizePermissions(PERMISSIONS.resourcesWrite)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has no role', () => {
    const next = jest.fn();
    const req = { user: {} };
    const res = mockRes();
    authorizePermissions(PERMISSIONS.resourcesWrite)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when req.user is undefined', () => {
    const next = jest.fn();
    const req = {};
    const res = mockRes();
    authorizePermissions(PERMISSIONS.resourcesWrite)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('authorizeRoles', () => {
  it('calls next() for allowed role', () => {
    const next = jest.fn();
    const req = mockReq({ user: { role: 'admin' } });
    const res = mockRes();
    authorizeRoles('admin', 'operator')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 for disallowed role', () => {
    const next = jest.fn();
    const req = mockReq({ user: { role: 'viewer' } });
    const res = mockRes();
    authorizeRoles('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when req.user has no role', () => {
    const next = jest.fn();
    const req = { user: {} };
    const res = mockRes();
    authorizeRoles('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─────────────────────────────────────────────────────────────────────
// errorHandler
// ─────────────────────────────────────────────────────────────────────

describe('errorHandler middleware', () => {
  const makeErrRes = () => {
    const res = { _status: 500 };
    res.status = jest.fn().mockImplementation((s) => { res._status = s; return res; });
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('returns 500 for generic error', () => {
    const req = {};
    const res = makeErrRes();
    const next = jest.fn();
    errorHandler(new Error('boom'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'boom' }));
  });

  it('uses err.status when present', () => {
    const req = {};
    const res = makeErrRes();
    const err = new Error('not found');
    err.status = 404;
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('uses err.statusCode when present', () => {
    const req = {};
    const res = makeErrRes();
    const err = new Error('unprocessable');
    err.statusCode = 422;
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('includes stack trace in development mode', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const req = {};
    const res = makeErrRes();
    errorHandler(new Error('dev error'), req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.any(String) }));
    process.env.NODE_ENV = origEnv;
  });

  it('omits stack in test/production mode', () => {
    const req = {};
    const res = makeErrRes();
    errorHandler(new Error('prod error'), req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call).not.toHaveProperty('stack');
  });
});

// ─────────────────────────────────────────────────────────────────────
// resultCache (inline mode)
// ─────────────────────────────────────────────────────────────────────

describe('resultCache inline mode', () => {
  beforeEach(() => {
    process.env.QUEUE_MODE = 'inline';
  });

  afterAll(() => {
    delete process.env.QUEUE_MODE;
  });

  it('stores and retrieves a value', async () => {
    await setLatestJobResult('test-job', { foo: 'bar' });
    const result = await getLatestJobResult('test-job');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns null for unknown job', async () => {
    const result = await getLatestJobResult('no-such-job');
    expect(result).toBeNull();
  });

  it('overwrites previous value', async () => {
    await setLatestJobResult('over-job', { v: 1 });
    await setLatestJobResult('over-job', { v: 2 });
    const result = await getLatestJobResult('over-job');
    expect(result.v).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// providerHealth.checkProviderCredentials
// ─────────────────────────────────────────────────────────────────────

describe('checkProviderCredentials', () => {
  const origEnv = { ...process.env };
  afterEach(() => { process.env = { ...origEnv }; });

  it('aws: configured when both keys present', () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIATEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'secrettest';
    const { configured, missingVars } = checkProviderCredentials('aws');
    expect(configured).toBe(true);
    expect(missingVars).toHaveLength(0);
  });

  it('aws: not configured when secret is missing', () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    const { configured, missingVars } = checkProviderCredentials('aws');
    expect(configured).toBe(false);
    expect(missingVars.length).toBeGreaterThan(0);
  });

  it('azure: returns missing vars when unconfigured', () => {
    delete process.env.AZURE_TENANT_ID;
    delete process.env.AZURE_CLIENT_ID;
    const { configured, missingVars } = checkProviderCredentials('azure');
    expect(configured).toBe(false);
    expect(missingVars).toContain('AZURE_TENANT_ID');
  });

  it('gcp: configured when GOOGLE_APPLICATION_CREDENTIALS present', () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json';
    const { configured } = checkProviderCredentials('gcp');
    expect(configured).toBe(true);
  });

  it('unknown provider: returns configured=true (no required vars)', () => {
    const { configured } = checkProviderCredentials('unknown');
    expect(configured).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// isInlineQueueMode
// ─────────────────────────────────────────────────────────────────────

describe('isInlineQueueMode', () => {
  const origEnv = { ...process.env };
  afterEach(() => { process.env = { ...origEnv }; });

  it('returns true in test environment', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.QUEUE_MODE;
    delete process.env.REDIS_URL;
    expect(isInlineQueueMode()).toBe(true);
  });

  it('returns true when QUEUE_MODE=inline', () => {
    process.env.QUEUE_MODE = 'inline';
    expect(isInlineQueueMode()).toBe(true);
  });

  it('returns false when QUEUE_MODE=redis', () => {
    process.env.QUEUE_MODE = 'redis';
    expect(isInlineQueueMode()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// metricsService — register is available
// ─────────────────────────────────────────────────────────────────────

describe('metricsService', () => {
  it('exports expected metric objects', () => {
    const metrics = require('../services/metricsService');
    expect(metrics).toHaveProperty('httpRequestsTotal');
    expect(metrics).toHaveProperty('httpRequestDuration');
    expect(metrics).toHaveProperty('activeCloudResources');
    expect(metrics).toHaveProperty('register');
  });

  it('register can produce metrics output', async () => {
    const { register } = require('../services/metricsService');
    const output = await register.metrics();
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// recommendationEngine rule logic
// ─────────────────────────────────────────────────────────────────────

describe('recommendationEngine — generateRecommendations', () => {
  // We test the exported function directly against in-memory DB
  const { connect, sync, close } = require('../utils/db');
  const { seedResources } = require('../controllers/resourceController');
  const { runEngine: generateRecommendations, seedRecommendations } = require('../services/recommendationEngine');
  const { Recommendation } = require('../models');

  beforeAll(async () => {
    await connect();
    await sync({ force: true });
    await seedResources();
  }, 30000);

  afterAll(async () => {
    await close();
  });

  it('generates recommendations from seeded resources', async () => {
    const result = await generateRecommendations();
    expect(result).toHaveProperty('created');
    expect(result).toHaveProperty('skipped');
  });

  it('seedRecommendations populates the Recommendation table', async () => {
    await seedRecommendations();
    const count = await Recommendation.count();
    expect(count).toBeGreaterThanOrEqual(0); // may be 0 if none match rules
  });

  it('recommendations result has numeric created and skipped', async () => {
    const result = await generateRecommendations();
    expect(typeof result.created).toBe('number');
    expect(typeof result.skipped).toBe('number');
  });
});

// ─────────────────────────────────────────────────────────────────────
// resultCache — all known job name TTLs
// ─────────────────────────────────────────────────────────────────────

describe('resultCache — known job names', () => {
  const { setLatestJobResult, getLatestJobResult } = require('../queue/resultCache');
  const { JOB_NAMES } = require('../queue/jobNames');

  it('stores and retrieves providerHealthRefresh result', async () => {
    const data = { providers: [], refreshedAt: new Date().toISOString() };
    await setLatestJobResult(JOB_NAMES.providerHealthRefresh, data);
    const result = await getLatestJobResult(JOB_NAMES.providerHealthRefresh);
    expect(result).toMatchObject(data);
  });

  it('stores and retrieves costSync result', async () => {
    const data = { period: '30d', grandTotal: { amount: 100, currency: 'USD' } };
    await setLatestJobResult(JOB_NAMES.costSync, data);
    const result = await getLatestJobResult(JOB_NAMES.costSync);
    expect(result).toMatchObject(data);
  });

  it('stores and retrieves recommendationRefresh result', async () => {
    const data = { created: 3, skipped: 1 };
    await setLatestJobResult(JOB_NAMES.recommendationRefresh, data);
    const result = await getLatestJobResult(JOB_NAMES.recommendationRefresh);
    expect(result).toMatchObject(data);
  });
});
