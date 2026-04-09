'use strict';

const PERMISSIONS = {
  resourcesRead: 'resources:read',
  resourcesWrite: 'resources:write',
  resourcesDelete: 'resources:delete',
  providersDeploy: 'providers:deploy',
  providersHealthRead: 'providers:health:read',
  providersHealthRefresh: 'providers:health:refresh',
  analyticsCostsRead: 'analytics:costs:read',
  analyticsCostsRefresh: 'analytics:costs:refresh',
  analyticsRecommendationsRead: 'analytics:recommendations:read',
  analyticsRecommendationsRefresh: 'analytics:recommendations:refresh',
  analyticsRecommendationsWrite: 'analytics:recommendations:write',
  analyticsJobsRead: 'analytics:jobs:read',
  usersCloudCredentialsWrite: 'users:cloud-credentials:write',
  auditLogsRead: 'audit:logs:read',
  adminUsersRead: 'admin:users:read',
  adminUsersWrite: 'admin:users:write',
};

const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  operator: [
    PERMISSIONS.resourcesRead,
    PERMISSIONS.resourcesWrite,
    PERMISSIONS.resourcesDelete,
    PERMISSIONS.providersDeploy,
    PERMISSIONS.providersHealthRead,
    PERMISSIONS.providersHealthRefresh,
    PERMISSIONS.analyticsCostsRead,
    PERMISSIONS.analyticsCostsRefresh,
    PERMISSIONS.analyticsRecommendationsRead,
    PERMISSIONS.analyticsRecommendationsRefresh,
    PERMISSIONS.analyticsRecommendationsWrite,
    PERMISSIONS.analyticsJobsRead,
    PERMISSIONS.usersCloudCredentialsWrite,
    PERMISSIONS.auditLogsRead,
  ],
  viewer: [
    PERMISSIONS.resourcesRead,
    PERMISSIONS.providersHealthRead,
    PERMISSIONS.analyticsCostsRead,
    PERMISSIONS.analyticsRecommendationsRead,
    PERMISSIONS.analyticsJobsRead,
  ],
};

const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || [];

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
};
