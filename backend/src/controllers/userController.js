'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const { ENCRYPTION_KEY_PATTERN } = require('../utils/config');

const SALT_ROUNDS = 10;
const ALGORITHM = 'aes-256-gcm';

// ── Helpers ───────────────────────────────────────────────────────────────────

const encrypt = (text) => {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required to store cloud credentials.');
  }

  if (!ENCRYPTION_KEY_PATTERN.test(encryptionKey)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters.');
  }

  const iv = crypto.randomBytes(16);
  const key = Buffer.from(encryptionKey, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/users/me — return current user profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub, {
      attributes: { exclude: ['passwordHash'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/profile — update display name, email, timezone
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { name, email, timezone, currency } = req.body;

    // If email is changing, check it isn't already taken
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already in use.' });
    }

    await user.update({
      ...(name && { name }),
      ...(email && { email }),
      ...(timezone && { timezone }),
      ...(currency && { currency }),
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
      currency: user.currency,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/password — change password (requires current password)
 */
const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { currentPassword, newPassword } = req.body;

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.update({ passwordHash });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/notifications — save notification preferences
 */
const updateNotifications = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const current = user.notifications || {};
    const updated = { ...current, ...req.body };
    await user.update({ notifications: updated });

    res.json({ notifications: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/settings — save cost preferences (currency, threshold)
 */
const updateSettings = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { currency, costAlertThreshold } = req.body;
    await user.update({
      ...(currency && { currency }),
      ...(costAlertThreshold != null && { costAlertThreshold: parseFloat(costAlertThreshold) }),
    });

    res.json({
      currency: user.currency,
      costAlertThreshold: user.costAlertThreshold,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/cloud-credentials — securely store encrypted provider credentials
 */
const saveCloudCredentials = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { provider, credentials } = req.body;
    if (!provider || !credentials) {
      return res.status(400).json({ error: 'provider and credentials are required.' });
    }

    // Encrypt the credentials before storing
    const encrypted = encrypt(JSON.stringify(credentials));

    // Merge with existing stored credentials
    const existingCreds = user.config ? (user.config.cloudCredentials || {}) : {};
    const updatedCreds = { ...existingCreds, [provider]: encrypted };

    await user.update({
      config: { ...(user.config || {}), cloudCredentials: updatedCreds },
    });

    res.json({ message: `Credentials for ${provider} stored securely.`, provider });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, updateProfile, updatePassword, updateNotifications, updateSettings, saveCloudCredentials };
