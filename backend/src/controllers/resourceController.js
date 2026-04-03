'use strict';

const { randomUUID } = require('crypto');

const uuidv4 = () => randomUUID();

// In-memory resource store — replace with a real DB in production
const resources = new Map();

// Seed some sample resources
const seed = [
  { id: 'r-001', name: 'prod-web-server', type: 'ec2', provider: 'aws', region: 'us-east-1', status: 'running', tags: { env: 'production' }, config: { instanceType: 't3.medium' }, createdAt: new Date('2024-01-15').toISOString(), updatedAt: new Date('2024-01-15').toISOString() },
  { id: 'r-002', name: 'assets-bucket', type: 's3', provider: 'aws', region: 'us-east-1', status: 'active', tags: { env: 'production' }, config: {}, createdAt: new Date('2024-01-20').toISOString(), updatedAt: new Date('2024-01-20').toISOString() },
  { id: 'r-003', name: 'staging-vm', type: 'vm', provider: 'azure', region: 'eastus', status: 'stopped', tags: { env: 'staging' }, config: { size: 'Standard_B2s' }, createdAt: new Date('2024-02-01').toISOString(), updatedAt: new Date('2024-02-01').toISOString() },
];
seed.forEach((r) => resources.set(r.id, r));

const listResources = (req, res) => {
  const { provider, type, status, region } = req.query;
  let result = Array.from(resources.values());

  if (provider) result = result.filter((r) => r.provider === provider);
  if (type) result = result.filter((r) => r.type === type);
  if (status) result = result.filter((r) => r.status === status);
  if (region) result = result.filter((r) => r.region === region);

  res.json({
    data: result,
    total: result.length,
    filters: { provider, type, status, region },
  });
};

const getResource = (req, res) => {
  const resource = resources.get(req.params.id);
  if (!resource) {
    return res.status(404).json({ error: `Resource '${req.params.id}' not found.` });
  }
  res.json(resource);
};

const createResource = (req, res) => {
  const id = `r-${uuidv4()}`;
  const now = new Date().toISOString();
  const resource = {
    id,
    ...req.body,
    status: 'provisioning',
    createdAt: now,
    updatedAt: now,
  };
  resources.set(id, resource);
  res.status(201).json(resource);
};

const updateResource = (req, res) => {
  const existing = resources.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: `Resource '${req.params.id}' not found.` });
  }
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  resources.set(existing.id, updated);
  res.json(updated);
};

const deleteResource = (req, res) => {
  if (!resources.has(req.params.id)) {
    return res.status(404).json({ error: `Resource '${req.params.id}' not found.` });
  }
  resources.delete(req.params.id);
  res.status(204).send();
};

module.exports = { listResources, getResource, createResource, updateResource, deleteResource };
