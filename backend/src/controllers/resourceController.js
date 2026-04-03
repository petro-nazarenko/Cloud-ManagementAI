'use strict';

const { Op } = require('sequelize');
const { Resource } = require('../models');

const listResources = async (req, res, next) => {
  try {
    const { provider, type, status, region, page = '1', limit = '50' } = req.query;

    const where = {};
    if (provider) where.provider = provider;
    if (type) where.type = type;
    if (status) where.status = status;
    if (region) where.region = region;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Resource.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      data: rows,
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
      filters: { provider, type, status, region },
    });
  } catch (err) {
    next(err);
  }
};

const getResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: `Resource '${req.params.id}' not found.` });
    }
    res.json(resource);
  } catch (err) {
    next(err);
  }
};

const createResource = async (req, res, next) => {
  try {
    const resource = await Resource.create({
      ...req.body,
      status: 'provisioning',
    });
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
};

const updateResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: `Resource '${req.params.id}' not found.` });
    }
    await resource.update(req.body);
    res.json(resource);
  } catch (err) {
    next(err);
  }
};

const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: `Resource '${req.params.id}' not found.` });
    }
    await resource.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * Seed initial sample resources if the DB is empty.
 */
const seedResources = async () => {
  const count = await Resource.count();
  if (count > 0) return;

  await Resource.bulkCreate([
    { name: 'prod-web-server', type: 'ec2', provider: 'aws', region: 'us-east-1', status: 'running', tags: { env: 'production' }, config: { instanceType: 't3.medium' }, monthlyCost: 142.5, cpuPercent: 67.4, memoryPercent: 72.1 },
    { name: 'assets-bucket', type: 's3', provider: 'aws', region: 'us-east-1', status: 'active', tags: { env: 'production' }, config: {}, monthlyCost: 28.4 },
    { name: 'staging-vm', type: 'vm', provider: 'azure', region: 'eastus', status: 'stopped', tags: { env: 'staging' }, config: { size: 'Standard_B2s' }, monthlyCost: 0, cpuPercent: 12.0, memoryPercent: 30.5 },
    { name: 'rds-mysql-prod', type: 'database', provider: 'aws', region: 'us-east-1', status: 'running', tags: { env: 'production' }, config: { instanceClass: 'db.r6g.xlarge' }, monthlyCost: 310.8 },
    { name: 'compute-node-1', type: 'ec2', provider: 'gcp', region: 'us-central1', status: 'running', tags: { env: 'production' }, config: { machineType: 'n1-standard-4' }, monthlyCost: 88.2, cpuPercent: 88.9, memoryPercent: 91.0 },
  ]);
};

module.exports = { listResources, getResource, createResource, updateResource, deleteResource, seedResources };
