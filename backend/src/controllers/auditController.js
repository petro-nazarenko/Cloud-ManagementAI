'use strict';

const { Op } = require('sequelize');
const { AuditLog } = require('../models');

const MAX_LIMIT = 200;

/**
 * GET /api/audit
 * Query params: userId, userEmail, action, resource, resourceId,
 *               startDate, endDate, page (1-based), limit (default 50)
 */
const listAuditLogs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.userId)    where.userId    = req.query.userId;
    if (req.query.userEmail) where.userEmail = { [Op.iLike]: `%${req.query.userEmail}%` };
    if (req.query.action)    where.action    = req.query.action;
    if (req.query.resource)  where.resource  = req.query.resource;
    if (req.query.resourceId) where.resourceId = req.query.resourceId;

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt[Op.gte] = new Date(req.query.startDate);
      if (req.query.endDate)   where.createdAt[Op.lte] = new Date(req.query.endDate);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
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
 * GET /api/audit/:id — single log entry
 */
const getAuditLog = async (req, res, next) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: `Audit log '${req.params.id}' not found.` });
    res.json(log);
  } catch (err) {
    next(err);
  }
};

module.exports = { listAuditLogs, getAuditLog };
