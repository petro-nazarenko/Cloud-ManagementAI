'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Recommendation = sequelize.define('Recommendation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider: {
    type: DataTypes.ENUM('aws', 'azure', 'gcp'),
    allowNull: false,
  },
  resourceId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  resourceName: {
    type: DataTypes.STRING(256),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    defaultValue: 'medium',
  },
  estimatedMonthlySavings: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING(8),
    defaultValue: 'USD',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  action: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'applied', 'dismissed'),
    defaultValue: 'open',
  },
  appliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'recommendations',
  timestamps: true,
  indexes: [
    { fields: ['provider'] },
    { fields: ['status'] },
    { fields: ['severity'] },
    { fields: ['resourceId'] },
  ],
});

module.exports = Recommendation;
