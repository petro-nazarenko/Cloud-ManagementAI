'use strict';

const { DataTypes } = require('sequelize');

const userNotificationsDefault = {
  costAlerts: true,
  securityAlerts: true,
  resourceChanges: false,
  weeklyReport: true,
  emailDigest: true,
  slackIntegration: false,
};

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable('users', {
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
      },
      passwordHash: {
        type: DataTypes.STRING(256),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'operator', 'viewer'),
        allowNull: false,
        defaultValue: 'viewer',
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'UTC',
      },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: 'USD',
      },
      costAlertThreshold: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1000,
      },
      notifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: userNotificationsDefault,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable('resources', {
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
        allowNull: false,
        defaultValue: 'provisioning',
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      monthlyCost: {
        type: DataTypes.FLOAT,
        allowNull: false,
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('resources', ['provider']);
    await queryInterface.addIndex('resources', ['type']);
    await queryInterface.addIndex('resources', ['status']);
    await queryInterface.addIndex('resources', ['region']);

    await queryInterface.createTable('recommendations', {
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
        allowNull: false,
        defaultValue: 'medium',
      },
      estimatedMonthlySavings: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
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
        allowNull: false,
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('recommendations', ['provider']);
    await queryInterface.addIndex('recommendations', ['status']);
    await queryInterface.addIndex('recommendations', ['severity']);
    await queryInterface.addIndex('recommendations', ['resourceId']);

    await queryInterface.createTable('audit_logs', {
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['resource']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('recommendations');
    await queryInterface.dropTable('resources');
    await queryInterface.dropTable('users');
  },
};