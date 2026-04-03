'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(256),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING(256),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'operator', 'viewer'),
    defaultValue: 'viewer',
  },
  timezone: {
    type: DataTypes.STRING(64),
    defaultValue: 'UTC',
  },
  currency: {
    type: DataTypes.STRING(8),
    defaultValue: 'USD',
  },
  costAlertThreshold: {
    type: DataTypes.FLOAT,
    defaultValue: 1000,
  },
  notifications: {
    type: DataTypes.JSON,
    defaultValue: {
      costAlerts: true,
      securityAlerts: true,
      resourceChanges: false,
      weeklyReport: true,
      emailDigest: true,
      slackIntegration: false,
    },
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [{ unique: true, fields: ['email'] }],
});

module.exports = User;
