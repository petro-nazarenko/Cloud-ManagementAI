'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { DEFAULT_JWT_SECRET } = require('../utils/config');

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

/**
 * Seed a default admin account if one does not already exist.
 * Called from index.js after the DB is connected and synced.
 */
const seedAdmin = async () => {
  const exists = await User.findOne({ where: { email: 'admin@example.com' } });
  if (!exists) {
    const passwordHash = await bcrypt.hash('admin1234', SALT_ROUNDS);
    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
    });
  }
};

const signTokens = (user) => {
  const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'viewer',
    });

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
    const user = await User.findOne({ where: { email } });

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

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await User.findByPk(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const tokens = signTokens(user);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, seedAdmin };
