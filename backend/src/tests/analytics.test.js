'use strict';

const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const { connect, sync, close } = require('../utils/db');
const { seedAdmin } = require('../controllers/authController');
const { seedResources } = require('../controllers/resourceController');
const { seedRecommendations } = require('../services/recommendationEngine');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const makeToken = (overrides = {}) =>
  jwt.sign(
    { sub: 'u-test', email: 'test@example.com', role: 'admin', name: 'Test User', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

beforeAll(async () => {
  await connect();
  await sync({ force: true });
  await seedAdmin();
  await seedResources();
  await seedRecommendations();
}, 30000);

afterAll(async () => {
  await close();
});

describe('Analytics — costs', () => {
  let token;
  beforeAll(() => { token = makeToken(); });

  it('GET /api/analytics/costs returns 401 without token', async () => {
    const res = await request(app).get('/api/analytics/costs');
    expect(res.status).toBe(401);
  });

  it('GET /api/analytics/costs returns cost snapshot', async () => {
    const res = await request(app)
      .get('/api/analytics/costs')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('grandTotal');
    expect(res.body).toHaveProperty('breakdown');
    expect(Array.isArray(res.body.breakdown)).toBe(true);
  });

  it('GET /api/analytics/costs?period=7d accepts period param', async () => {
    const res = await request(app)
      .get('/api/analytics/costs?period=7d')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('7d');
  });
});

describe('Analytics — usage', () => {
  let token;
  beforeAll(() => { token = makeToken(); });

  it('GET /api/analytics/usage returns utilisation data', async () => {
    const res = await request(app)
      .get('/api/analytics/usage')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('total');
  });

  it('GET /api/analytics/usage?provider=aws filters by provider', async () => {
    const res = await request(app)
      .get('/api/analytics/usage?provider=aws')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((u) => expect(u.provider).toBe('aws'));
  });
});

describe('Analytics — recommendations', () => {
  let token;
  let viewerToken;
  let recId;

  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('GET /api/analytics/recommendations returns open recommendations', async () => {
    const res = await request(app)
      .get('/api/analytics/recommendations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('totalEstimatedMonthlySavings');
    if (res.body.data.length > 0) {
      recId = res.body.data[0].id;
    }
  });

  it('GET /api/analytics/recommendations?status=open filters by status', async () => {
    const res = await request(app)
      .get('/api/analytics/recommendations?status=open')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => expect(r.status).toBe('open'));
  });

  it('PATCH /api/analytics/recommendations/:id applies a recommendation', async () => {
    if (!recId) return; // no seeded data to operate on
    const res = await request(app)
      .patch(`/api/analytics/recommendations/${recId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'applied' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('applied');
    expect(res.body).toHaveProperty('appliedAt');
  });

  it('PATCH /api/analytics/recommendations/:id rejects viewer role', async () => {
    if (!recId) return;
    const res = await request(app)
      .patch(`/api/analytics/recommendations/${recId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'dismissed' });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/analytics/recommendations/:id rejects invalid status', async () => {
    if (!recId) return;
    const res = await request(app)
      .patch(`/api/analytics/recommendations/${recId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/analytics/recommendations/nonexistent returns 404', async () => {
    const res = await request(app)
      .patch('/api/analytics/recommendations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'dismissed' });
    expect(res.status).toBe(404);
  });
});

describe('Analytics — job queue (inline mode)', () => {
  let token;
  let viewerToken;

  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('POST /api/analytics/costs/refresh returns 202 with job info', async () => {
    const res = await request(app)
      .post('/api/analytics/costs/refresh')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('job');
    expect(res.body.job).toHaveProperty('id');
    expect(res.body.job).toHaveProperty('name', 'cost-sync');
  });

  it('POST /api/analytics/costs/refresh returns 403 for viewer', async () => {
    const res = await request(app)
      .post('/api/analytics/costs/refresh')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/analytics/recommendations/refresh returns 202 with job info', async () => {
    const res = await request(app)
      .post('/api/analytics/recommendations/refresh')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('job');
    expect(res.body.job).toHaveProperty('name', 'recommendation-refresh');
  });

  it('POST /api/analytics/recommendations/refresh returns 403 for viewer', async () => {
    const res = await request(app)
      .post('/api/analytics/recommendations/refresh')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/analytics/jobs/:jobId returns job status for inline job', async () => {
    // First trigger a job to get a valid jobId
    const queueRes = await request(app)
      .post('/api/analytics/costs/refresh')
      .set('Authorization', `Bearer ${token}`);
    const { id: jobId } = queueRes.body.job;

    const res = await request(app)
      .get(`/api/analytics/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(jobId);
    expect(['completed', 'failed', 'active', 'waiting']).toContain(res.body.state);
  });

  it('GET /api/analytics/jobs/unknown returns 404', async () => {
    const res = await request(app)
      .get('/api/analytics/jobs/no-such-job-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/analytics/jobs/:jobId is accessible to viewer (analyticsJobsRead)', async () => {
    const queueRes = await request(app)
      .post('/api/analytics/costs/refresh')
      .set('Authorization', `Bearer ${token}`);
    const { id: jobId } = queueRes.body.job;

    const res = await request(app)
      .get(`/api/analytics/jobs/${jobId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    // viewer has analyticsJobsRead permission — should NOT be 403
    expect(res.status).not.toBe(403);
  });
});
