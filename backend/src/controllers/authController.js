'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

// In-memory user store — replace with a real database in production
const users = new Map();

// Seed a default admin account
const seedAdmin = async () => {
  const hash = await bcrypt.hash('admin1234', SALT_ROUNDS);
  users.set('admin@example.com', {
    id: 'u-001',
    name: 'Admin User',
    email: 'admin@example.com',
    passwordHash: hash,
    role: 'admin',
    createdAt: new Date().toISOString(),
  });
};
seedAdmin();

const signTokens = (user) => {
  const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (users.has(email)) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = {
      id: `u-${Date.now()}`,
      name,
      email,
      passwordHash,
      role: role || 'viewer',
      createdAt: new Date().toISOString(),
    };
    users.set(email, user);

    const tokens = signTokens(user);
    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = users.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const tokens = signTokens(user);
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
};

const refresh = (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    // Look up the user to get current role/name in case it changed
    const user = Array.from(users.values()).find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const tokens = signTokens(user);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh };
