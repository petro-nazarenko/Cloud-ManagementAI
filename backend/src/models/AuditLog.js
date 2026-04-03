'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  userEmail: {
    type: DataTypes.STRING(256),
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  resource: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  resourceId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  before: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  after: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['resource'] },
  ],
});

module.exports = AuditLog;
