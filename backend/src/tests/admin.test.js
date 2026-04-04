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
    { sub: 'u-admin', email: 'admin@example.com', role: 'admin', name: 'Admin User', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

let adminToken;
let operatorToken;
let viewerToken;
let seedUserId;

beforeAll(async () => {
  await connect();
  await sync({ force: true });
  await seedAdmin();
  await seedResources();
  await seedRecommendations();

  adminToken    = makeToken({ role: 'admin' });
  operatorToken = makeToken({ sub: 'u-operator', email: 'operator@example.com', role: 'operator' });
  viewerToken   = makeToken({ sub: 'u-viewer',   email: 'viewer@example.com',   role: 'viewer' });
}, 30000);

afterAll(async () => {
  await close();
});

// ────────────────────────────────────────────────────────────────────
// Audit Log API
// ────────────────────────────────────────────────────────────────────

describe('Audit Log API', () => {
  beforeAll(async () => {
    // Generate some audit entries by mutating a resource
    await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'audit-test-instance', type: 'ec2', provider: 'aws', region: 'eu-west-1' });
  });

  it('GET /api/audit returns 401 without token', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('GET /api/audit returns 403 for viewer', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/audit returns paginated list for admin', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('totalPages');
  });

  it('GET /api/audit returns paginated list for operator', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/audit?action=create filters by action', async () => {
    const res = await request(app)
      .get('/api/audit?action=create')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((entry) => expect(entry.action).toBe('create'));
  });

  it('GET /api/audit?resource=resource filters by resource type', async () => {
    const res = await request(app)
      .get('/api/audit?resource=resource')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((entry) => expect(entry.resource).toBe('resource'));
  });

  it('GET /api/audit?page=1&limit=1 respects pagination', async () => {
    const res = await request(app)
      .get('/api/audit?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.limit).toBe(1);
  });

  it('GET /api/audit/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/audit/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/audit/:id returns the entry when it exists', async () => {
    // Grab a known entry first
    const list = await request(app)
      .get('/api/audit?action=create&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    if (list.body.data.length === 0) return; // Nothing to check

    const { id } = list.body.data[0];
    const res = await request(app)
      .get(`/api/audit/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });
});

// ────────────────────────────────────────────────────────────────────
// Admin Users API
// ────────────────────────────────────────────────────────────────────

describe('Admin Users API', () => {
  it('GET /api/admin/users returns 401 without token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/users returns 403 for viewer', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/users returns 403 for operator', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/users returns user list for admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // No password hashes exposed
    res.body.data.forEach((u) => expect(u).not.toHaveProperty('passwordHash'));
  });

  it('GET /api/admin/users?role=admin filters by role', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((u) => expect(u.role).toBe('admin'));
  });

  it('GET /api/admin/users pagination works', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.limit).toBe(1);
  });

  it('GET /api/admin/users/:id returns single user', async () => {
    // Create a test user first
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Target User', email: `target-${Date.now()}@example.com`, password: 'pass1234' });
    expect(reg.status).toBe(201);
    seedUserId = reg.body.user.id;

    const res = await request(app)
      .get(`/api/admin/users/${seedUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seedUserId);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('GET /api/admin/users/:id returns 404 for unknown user', async () => {
    const res = await request(app)
      .get('/api/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /api/admin/users/:id/role changes role successfully', async () => {
    if (!seedUserId) return;
    const res = await request(app)
      .patch(`/api/admin/users/${seedUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'operator' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('operator');
  });

  it('PATCH /api/admin/users/:id/role rejects invalid role', async () => {
    if (!seedUserId) return;
    const res = await request(app)
      .patch(`/api/admin/users/${seedUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/admin/users/:id/role returns 403 for viewer', async () => {
    if (!seedUserId) return;
    const res = await request(app)
      .patch(`/api/admin/users/${seedUserId}/role`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ role: 'viewer' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/admin/users/:id deletes a user', async () => {
    // Register a throwaway user
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Throwaway', email: `throw-${Date.now()}@example.com`, password: 'pass1234' });
    const throwId = reg.body.user.id;

    const res = await request(app)
      .delete(`/api/admin/users/${throwId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    // Confirm gone
    const check = await request(app)
      .get(`/api/admin/users/${throwId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(check.status).toBe(404);
  });

  it('DELETE /api/admin/users/:id returns 403 for viewer', async () => {
    if (!seedUserId) return;
    const res = await request(app)
      .delete(`/api/admin/users/${seedUserId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
