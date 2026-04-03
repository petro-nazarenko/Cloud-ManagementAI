'use strict';

const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Helper: generate a valid test token
const makeToken = (overrides = {}) =>
  jwt.sign(
    { sub: 'u-test', email: 'test@example.com', role: 'admin', name: 'Test User', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

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
      .send({ name: 'Alice', email: `alice-${Date.now()}@example.com`, password: 'secret123', role: 'viewer' });
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

  it('POST /api/auth/refresh returns new tokens', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin1234' });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: loginRes.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });
});

describe('Resources API', () => {
  let token;

  beforeAll(() => {
    token = makeToken();
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
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/resources?provider=aws filters by provider', async () => {
    const res = await request(app)
      .get('/api/resources?provider=aws')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => expect(r.provider).toBe('aws'));
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
  beforeAll(() => { token = makeToken(); });

  it('GET /api/analytics/costs returns cost breakdown', async () => {
    const res = await request(app)
      .get('/api/analytics/costs')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('grandTotal');
    expect(res.body).toHaveProperty('breakdown');
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
});

describe('Providers API', () => {
  let token;
  beforeAll(() => { token = makeToken(); });

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

  it('GET /api/providers/unknown/resources returns 404', async () => {
    const res = await request(app)
      .get('/api/providers/unknown/resources')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
