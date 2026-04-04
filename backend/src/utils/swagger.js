'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Cloud ManagementAI API',
      version: '1.0.0',
      description: 'AI-powered multi-cloud management REST API (AWS / Azure / GCP).',
      contact: { name: 'Cloud ManagementAI', url: 'https://github.com/petro-nazarenko/Cloud-ManagementAI' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: '/api', description: 'Current server (proxied via nginx)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
          },
        },
        Resource: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'prod-web-server' },
            type: { type: 'string', enum: ['ec2', 's3', 'vm', 'storage', 'function', 'database', 'network'] },
            provider: { type: 'string', enum: ['aws', 'azure', 'gcp'] },
            region: { type: 'string', example: 'us-east-1' },
            status: { type: 'string', example: 'running' },
            tags: { type: 'object', additionalProperties: { type: 'string' } },
            monthlyCost: { type: 'number', example: 142.5 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Recommendation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            provider: { type: 'string', enum: ['aws', 'azure', 'gcp'] },
            type: { type: 'string', example: 'right-sizing' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            status: { type: 'string', enum: ['open', 'applied', 'dismissed'] },
            estimatedMonthlySavings: { type: 'number', example: 57.00 },
            description: { type: 'string' },
            action: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
            timezone: { type: 'string', example: 'UTC' },
            currency: { type: 'string', example: 'USD' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            userEmail: { type: 'string' },
            action: { type: 'string', example: 'create' },
            resource: { type: 'string', example: 'resource' },
            resourceId: { type: 'string' },
            ip: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            state: { type: 'string', enum: ['active', 'completed', 'failed', 'waiting'] },
            mode: { type: 'string', enum: ['inline', 'redis'] },
          },
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and token management' },
      { name: 'Resources', description: 'Cloud resource CRUD' },
      { name: 'Analytics', description: 'Cost analytics and recommendations' },
      { name: 'Providers', description: 'Cloud provider health and resource listing' },
      { name: 'Users', description: 'User profile and settings' },
      { name: 'Audit', description: 'Audit log access' },
      { name: 'Admin', description: 'Admin-only user management' },
      { name: 'System', description: 'Health and Prometheus metrics' },
    ],
  },
  apis: ['./src/routes/*.js', './src/index.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
