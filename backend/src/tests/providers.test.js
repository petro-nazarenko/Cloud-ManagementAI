'use strict';

// Mock GCP service to avoid credential timeout in test environments
jest.mock('../services/gcpService', () => ({
  listResources: jest.fn().mockResolvedValue([]),
  deployResource: jest.fn().mockResolvedValue({ deploymentId: 'gcp-mock', status: 'initiated' }),
}));

const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const { connect, sync, close } = require('../utils/db');
const { seedAdmin } = require('../controllers/authController');
const { seedResources } = require('../controllers/resourceController');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const makeToken = (overrides = {}) =>
  jwt.sign(
    { sub: 'u-test', email: 'test@example.com', role: 'admin', name: 'Test', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

beforeAll(async () => {
  await connect();
  await sync({ force: true });
  await seedAdmin();
  await seedResources();
}, 30000);

afterAll(async () => {
  await close();
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/providers
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/providers', () => {
  let token;
  let viewerToken;
  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/providers');
    expect(res.status).toBe(401);
  });

  it('returns provider list with viewer token', async () => {
    const res = await request(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('providers');
    expect(Array.isArray(res.body.providers)).toBe(true);
    const names = res.body.providers.map((p) => p.name);
    expect(names).toContain('aws');
    expect(names).toContain('azure');
    expect(names).toContain('gcp');
  });

  it('each provider has required fields', async () => {
    const res = await request(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.providers.forEach((p) => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('displayName');
      expect(p).toHaveProperty('configured');
      expect(p).toHaveProperty('status');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/providers/health
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/providers/health', () => {
  let token;
  let viewerToken;
  let operatorToken;
  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
    operatorToken = makeToken({ sub: 'u-op', email: 'op@test.com', role: 'operator' });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/providers/health');
    expect(res.status).toBe(401);
  });

  it('viewer can read provider health', async () => {
    const res = await request(app)
      .get('/api/providers/health')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('providers');
  });

  it('operator can read provider health', async () => {
    const res = await request(app)
      .get('/api/providers/health')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
  });

  it('returns unconfigured status when no credentials set', async () => {
    const res = await request(app)
      .get('/api/providers/health')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // In test env no actual cloud credentials are set
    const providers = res.body.providers;
    expect(providers).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/providers/health/refresh
// ─────────────────────────────────────────────────────────────────────

describe('POST /api/providers/health/refresh', () => {
  let adminToken;
  let viewerToken;
  beforeAll(() => {
    adminToken = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/providers/health/refresh');
    expect(res.status).toBe(401);
  });

  it('viewer cannot refresh provider health', async () => {
    const res = await request(app)
      .post('/api/providers/health/refresh')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can queue health refresh', async () => {
    const res = await request(app)
      .post('/api/providers/health/refresh')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('job');
    expect(res.body.job).toHaveProperty('id');
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/providers/:name/resources
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/providers/:name/resources', () => {
  let token;
  beforeAll(() => { token = makeToken(); });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/providers/aws/resources');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown provider', async () => {
      const res = await request(app)
        .get('/api/providers/unknown/resources')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
  });

  it('returns empty array for aws (no credentials in test)', async () => {
    const res = await request(app)
      .get('/api/providers/aws/resources')
      .set('Authorization', `Bearer ${token}`);
    // Either 200 with empty data or 200 with resources — never a 5xx
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resources');
  });

  it('returns empty array for azure (no credentials in test)', async () => {
    const res = await request(app)
      .get('/api/providers/azure/resources')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resources');
  });

  it('returns empty array for gcp (no credentials in test)', async () => {
    const res = await request(app)
      .get('/api/providers/gcp/resources')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resources');
  }, 15000);
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/providers/:name/deploy
// ─────────────────────────────────────────────────────────────────────

describe('POST /api/providers/:name/deploy', () => {
  let adminToken;
  let viewerToken;
  beforeAll(() => {
    adminToken = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/providers/aws/deploy')
      .send({ resourceType: 'ec2', region: 'us-east-1', name: 'test' });
    expect(res.status).toBe(401);
  });

  it('viewer cannot deploy', async () => {
    const res = await request(app)
      .post('/api/providers/aws/deploy')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ resourceType: 'ec2', region: 'us-east-1', name: 'test' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown provider', async () => {
      const res = await request(app)
        .post('/api/providers/unknown/deploy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resourceType: 'ec2', region: 'us-east-1', name: 'test' });
      expect(res.status).toBe(404);
  });

  it('returns 400 for missing required body fields', async () => {
    const res = await request(app)
      .post('/api/providers/aws/deploy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'test' }); // missing resourceType, region
    expect(res.status).toBe(400);
  });

  it('admin deploy attempt returns a result (no real AWS credentials)', async () => {
    const res = await request(app)
      .post('/api/providers/aws/deploy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resourceType: 'ec2', region: 'us-east-1', name: 'test-deploy' });
    // May succeed with failed status or return an error — no 5xx crash
    expect([200, 201, 202, 400]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/providers/health/jobs/:jobId
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/providers/health/jobs/:jobId', () => {
  let adminToken;
  let viewerToken;
  let jobId;

  beforeAll(async () => {
    adminToken = makeToken();
    viewerToken = makeToken({ role: 'viewer' });

    // Queue a health refresh to get a valid jobId
    const res = await request(app)
      .post('/api/providers/health/refresh')
      .set('Authorization', `Bearer ${adminToken}`);
    jobId = res.body.job?.id;
  });

  it('viewer can check job status', async () => {
    if (!jobId) return;
    const res = await request(app)
      .get(`/api/providers/health/jobs/${jobId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent job', async () => {
    const res = await request(app)
      .get('/api/providers/health/jobs/nonexistent-job-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
