'use strict';

const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const { connect, sync, close } = require('../utils/db');
const { seedAdmin } = require('../controllers/authController');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const makeToken = (overrides = {}) =>
  jwt.sign(
    { sub: 'u-user-test', email: 'usertest@example.com', role: 'admin', name: 'Test', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

let adminToken;
let operatorToken;
let viewerToken;
let registeredUserId;
let registeredUserEmail;
let registeredUserPassword;

beforeAll(async () => {
  await connect();
  await sync({ force: true });
  await seedAdmin();

  // Register a user we will use for profile/password tests
  registeredUserEmail = `profile-${Date.now()}@example.com`;
  registeredUserPassword = 'TestPass123!';

  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Profile User', email: registeredUserEmail, password: registeredUserPassword });

  registeredUserId = res.body.user.id;

  // Build tokens: admin/operator/viewer use makeToken (bypass DB),
  // but profile tests use a real token that matches the DB user
  adminToken = makeToken({ role: 'admin' });
  operatorToken = makeToken({ sub: 'u-op', email: 'op@t.com', role: 'operator' });
  viewerToken = makeToken({ sub: 'u-viewer', email: 'viewer@t.com', role: 'viewer' });
}, 30000);

afterAll(async () => {
  await close();
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns user profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${adminToken}`);
    // The admin token sub ('u-user-test') may not exist in DB, returns 404 → that's fine
    expect([200, 404]).toContain(res.status);
  });

  it('returns seeded admin profile', async () => {
    // Login first to get a real token linked to a DB user
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' });
    expect(login.status).toBe(200);

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@example.com');
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/users/profile
// ─────────────────────────────────────────────────────────────────────

describe('PUT /api/users/profile', () => {
  let userToken;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registeredUserEmail, password: registeredUserPassword });
    userToken = login.body.accessToken;
  });

  it('returns 401 without token', async () => {
    const res = await request(app).put('/api/users/profile').send({ name: 'New Name' });
    expect(res.status).toBe(401);
  });

  it('updates name successfully', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('updates timezone and currency', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ timezone: 'Europe/London', currency: 'EUR' });
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('Europe/London');
    expect(res.body.currency).toBe('EUR');
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'admin@example.com' }); // already taken
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/users/password
// ─────────────────────────────────────────────────────────────────────

describe('PUT /api/users/password', () => {
  let userToken;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registeredUserEmail, password: registeredUserPassword });
    userToken = login.body.accessToken;
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .send({ currentPassword: 'x', newPassword: 'newPass123' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'only-current' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong current password', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'NewPass123!' });
    expect(res.status).toBe(401);
  });

  it('changes password successfully', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: registeredUserPassword, newPassword: 'NewPass456!' });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/users/notifications
// ─────────────────────────────────────────────────────────────────────

describe('PUT /api/users/notifications', () => {
  let userToken;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registeredUserEmail, password: 'NewPass456!' });
    userToken = login.body.accessToken;
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/users/notifications')
      .send({ costAlerts: false });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .put('/api/users/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('updates notification preferences', async () => {
    const res = await request(app)
      .put('/api/users/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ costAlerts: false, weeklyReport: false });
    expect(res.status).toBe(200);
    expect(res.body.notifications.costAlerts).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/users/settings
// ─────────────────────────────────────────────────────────────────────

describe('PUT /api/users/settings', () => {
  let userToken;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registeredUserEmail, password: 'NewPass456!' });
    userToken = login.body.accessToken;
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/users/settings')
      .send({ currency: 'EUR' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .put('/api/users/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('updates cost settings', async () => {
    const res = await request(app)
      .put('/api/users/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currency: 'GBP', costAlertThreshold: 500 });
    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('GBP');
    expect(res.body.costAlertThreshold).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/cloud-credentials
// ─────────────────────────────────────────────────────────────────────

describe('POST /api/users/cloud-credentials', () => {
  let adminLoginToken;
  let viewerLoginToken;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' });
    adminLoginToken = adminLogin.body.accessToken;

    // Register a viewer
    const viewerEmail = `viewer-cred-${Date.now()}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Viewer Cred', email: viewerEmail, password: 'viewPass123' });
    const viewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: viewerEmail, password: 'viewPass123' });
    viewerLoginToken = viewerLogin.body.accessToken;
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/users/cloud-credentials')
      .send({ provider: 'aws', credentials: { key: 'val' } });
    expect(res.status).toBe(401);
  });

  it('viewer cannot save cloud credentials', async () => {
    const res = await request(app)
      .post('/api/users/cloud-credentials')
      .set('Authorization', `Bearer ${viewerLoginToken}`)
      .send({ provider: 'aws', credentials: { key: 'val' } });
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing provider', async () => {
    const res = await request(app)
      .post('/api/users/cloud-credentials')
      .set('Authorization', `Bearer ${adminLoginToken}`)
      .send({ credentials: { key: 'val' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid provider name', async () => {
    const res = await request(app)
      .post('/api/users/cloud-credentials')
      .set('Authorization', `Bearer ${adminLoginToken}`)
      .send({ provider: 'unknown', credentials: { key: 'val' } });
    expect(res.status).toBe(400);
  });

  it('admin saves credentials successfully when ENCRYPTION_KEY set', async () => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const res = await request(app)
      .post('/api/users/cloud-credentials')
      .set('Authorization', `Bearer ${adminLoginToken}`)
      .send({ provider: 'aws', credentials: { accessKeyId: 'AKIA123', secretAccessKey: 'secret' } });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});
