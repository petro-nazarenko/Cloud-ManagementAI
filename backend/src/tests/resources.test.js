'use strict';

const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const { connect, sync, close } = require('../utils/db');
const { seedAdmin } = require('../controllers/authController');
const { seedResources } = require('../controllers/resourceController');
const { seedRecommendations } = require('../services/recommendationEngine');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Helper: generate a valid test token
const makeToken = (overrides = {}) =>
  jwt.sign(
    { sub: 'u-test', email: 'test@example.com', role: 'admin', name: 'Test User', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

beforeAll(async () => {
  // NODE_ENV=test → SQLite in-memory (see utils/db.js)
  await connect();
  await sync({ force: true });
  await seedAdmin();
  await seedResources();
  await seedRecommendations();
}, 30000);

afterAll(async () => {
  await close();
});

describe('Health & Metrics', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /metrics returns Prometheus metrics text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/http_requests_total/);
  });
});

describe('Auth endpoints', () => {
  it('POST /api/auth/register creates a new user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: `alice-${Date.now()}@example.com`, password: 'secret123', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.role).toBe('viewer');
  });

  it('POST /api/auth/register rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ name: 'Bob', email, password: 'secret123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Bob', email, password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/login succeeds with seeded admin account', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin1234' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('POST /api/auth/login returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh returns new tokens', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin1234' });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: loginRes.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('POST /api/auth/refresh returns 401 for invalid token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });
});

describe('Resources API', () => {
  let token;
  let viewerToken;

  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('GET /api/resources returns 401 without token', async () => {
    const res = await request(app).get('/api/resources');
    expect(res.status).toBe(401);
  });

  it('GET /api/resources returns seeded resources', async () => {
    const res = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('totalPages');
  });

  it('GET /api/resources?provider=aws filters by provider', async () => {
    const res = await request(app)
      .get('/api/resources?provider=aws')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => expect(r.provider).toBe('aws'));
  });

  it('GET /api/resources supports pagination', async () => {
    const res = await request(app)
      .get('/api/resources?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.limit).toBe(2);
  });

  let createdId;

  it('POST /api/resources creates a resource', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'test-instance', type: 'ec2', provider: 'aws', region: 'us-west-2' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('test-instance');
    expect(res.body).toHaveProperty('id');
    createdId = res.body.id;
  });

  it('POST /api/resources returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'viewer-instance', type: 'ec2', provider: 'aws', region: 'us-west-2' });
    expect(res.status).toBe(403);
  });

  it('POST /api/resources returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'bad-resource' }); // missing type, provider, region
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('details');
  });

  it('GET /api/resources/:id returns the created resource', async () => {
    const res = await request(app)
      .get(`/api/resources/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  it('PUT /api/resources/:id updates the resource', async () => {
    const res = await request(app)
      .put(`/api/resources/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'updated-instance', type: 'ec2', provider: 'aws', region: 'us-west-2' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('updated-instance');
  });

  it('DELETE /api/resources/:id removes the resource', async () => {
    const res = await request(app)
      .delete(`/api/resources/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('GET /api/resources/:id returns 404 after deletion', async () => {
    const res = await request(app)
      .get(`/api/resources/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Analytics API', () => {
  let token;
  let viewerToken;
  let queuedJobId;

  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('GET /api/analytics/costs returns cost breakdown', async () => {
    const res = await request(app)
      .get('/api/analytics/costs')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('grandTotal');
    expect(res.body).toHaveProperty('breakdown');
  });

  it('GET /api/analytics/costs?provider=aws filters by provider', async () => {
    const res = await request(app)
      .get('/api/analytics/costs?provider=aws')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.breakdown.length).toBe(1);
    expect(res.body.breakdown[0].provider).toBe('aws');
  });

  it('GET /api/analytics/usage returns utilisation data', async () => {
    const res = await request(app)
      .get('/api/analytics/usage')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/analytics/recommendations returns recommendations with savings', async () => {
    const res = await request(app)
      .get('/api/analytics/recommendations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalEstimatedMonthlySavings');
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/analytics/recommendations/refresh queues a refresh job', async () => {
    const res = await request(app)
      .post('/api/analytics/recommendations/refresh')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
    expect(res.body.job).toHaveProperty('id');
    expect(res.body.job).toHaveProperty('state');
    queuedJobId = res.body.job.id;
  });

  it('GET /api/analytics/jobs/:jobId returns analytics job status', async () => {
    const res = await request(app)
      .get(`/api/analytics/jobs/${queuedJobId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(queuedJobId);
  });

  it('POST /api/analytics/recommendations/refresh returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/analytics/recommendations/refresh')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /api/analytics/recommendations/:id updates status', async () => {
    const listRes = await request(app)
      .get('/api/analytics/recommendations')
      .set('Authorization', `Bearer ${token}`);
    const recId = listRes.body.data[0].id;

    const res = await request(app)
      .patch(`/api/analytics/recommendations/${recId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'dismissed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
  });

  it('PATCH /api/analytics/recommendations/:id returns 403 for viewer role', async () => {
    const listRes = await request(app)
      .get('/api/analytics/recommendations')
      .set('Authorization', `Bearer ${token}`);
    const recId = listRes.body.data[0].id;

    const res = await request(app)
      .patch(`/api/analytics/recommendations/${recId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'dismissed' });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/analytics/recommendations/:id returns 400 for invalid status', async () => {
    const listRes = await request(app)
      .get('/api/analytics/recommendations?status=dismissed')
      .set('Authorization', `Bearer ${token}`);
    const recId = listRes.body.data[0]?.id || '00000000-0000-0000-0000-000000000000';

    const res = await request(app)
      .patch(`/api/analytics/recommendations/${recId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/analytics/recommendations/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .patch('/api/analytics/recommendations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'applied' });
    expect(res.status).toBe(404);
  });
});

describe('Providers API', () => {
  let token;
  let viewerToken;

  beforeAll(() => {
    token = makeToken();
    viewerToken = makeToken({ role: 'viewer' });
  });

  it('GET /api/providers lists all providers', async () => {
    const res = await request(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const names = res.body.providers.map((p) => p.name);
    expect(names).toContain('aws');
    expect(names).toContain('azure');
    expect(names).toContain('gcp');
  });

  it('GET /api/providers lists configured status', async () => {
    const res = await request(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.providers.forEach((p) => {
      expect(p).toHaveProperty('configured');
      expect(p).toHaveProperty('status');
    });
  });

  it('GET /api/providers/unknown/resources returns 404', async () => {
    const res = await request(app)
      .get('/api/providers/unknown/resources')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/providers/unknown/deploy returns 404', async () => {
    const res = await request(app)
      .post('/api/providers/unknown/deploy')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceType: 'ec2', region: 'us-east-1', name: 'test' });
    expect(res.status).toBe(404);
  });

  it('POST /api/providers/aws/deploy returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/providers/aws/deploy')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ resourceType: 'ec2', region: 'us-east-1', name: 'test' });
    expect(res.status).toBe(403);
  });
});

describe('Users API', () => {
  let token;
  let adminId;

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin1234' });
    token = res.body.accessToken;
    adminId = res.body.user.id;
  });

  it('GET /api/users/me returns current user', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@example.com');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('PUT /api/users/profile updates name', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Admin' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Admin');
  });

  it('PUT /api/users/notifications updates preferences', async () => {
    const res = await request(app)
      .put('/api/users/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ costAlerts: false, weeklyReport: false });
    expect(res.status).toBe(200);
    expect(res.body.notifications.costAlerts).toBe(false);
  });

  it('PUT /api/users/settings updates cost preferences', async () => {
    const res = await request(app)
      .put('/api/users/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'EUR', costAlertThreshold: 2000 });
    expect(res.status).toBe(200);
  });

  it('POST /api/users/cloud-credentials stores encrypted provider credentials', async () => {
    const res = await request(app)
      .post('/api/users/cloud-credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'aws', credentials: { accessKeyId: 'test-key', secretAccessKey: 'test-secret' } });
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('aws');

    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.config.cloudCredentials.aws).toMatch(/:/);
    expect(meRes.body.config.cloudCredentials.aws).not.toContain('test-secret');
  });

  it('PUT /api/users/password returns 401 for wrong current password', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpassword123' });
    expect(res.status).toBe(401);
  });

  it('PUT /api/users/password succeeds with correct current password', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin1234', newPassword: 'NewAdmin9999!' });
    expect(res.status).toBe(200);
  });

  it('GET /api/users/me returns 401 without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
