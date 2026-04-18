'use strict';

const { User } = require('../models');

const ALLOWED_ROLES = ['admin', 'operator', 'viewer'];

/**
 * GET /api/admin/users
 * Returns paginated list of all users (excluding passwordHash).
 * Query: page, limit, role, search (matches name or email)
 */
const listUsers = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const { Op } = require('sequelize');
    const where = {};

    if (req.query.role) where.role = req.query.role;
    if (req.query.search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users/:id — single user profile (admin view)
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/role — update a user's role
 * Body: { role: 'admin' | 'operator' | 'viewer' }
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role '${role}'. Must be one of: ${ALLOWED_ROLES.join(', ')}.`,
      });
    }

    // Prevent admins from demoting themselves
    if (req.params.id === req.user.sub && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote your own admin role.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await user.update({ role });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id — remove a user account
 * Admins cannot delete themselves.
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'You cannot delete your own account via admin API.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await user.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUser, updateUserRole, deleteUser };
