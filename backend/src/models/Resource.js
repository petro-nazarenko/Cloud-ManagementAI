'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Resource = sequelize.define('Resource', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  provider: {
    type: DataTypes.ENUM('aws', 'azure', 'gcp'),
    allowNull: false,
  },
  region: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    defaultValue: 'provisioning',
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  config: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  monthlyCost: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  cpuPercent: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  memoryPercent: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  networkMbps: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  storagePct: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  tableName: 'resources',
  timestamps: true,
  indexes: [
    { fields: ['provider'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['region'] },
  ],
});

module.exports = Resource;
