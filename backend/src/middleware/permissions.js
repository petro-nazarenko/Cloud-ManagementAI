'use strict';

const PERMISSIONS = {
  resourcesWrite: 'resources:write',
  resourcesDelete: 'resources:delete',
  providersDeploy: 'providers:deploy',
  providersHealthRead: 'providers:health:read',
  providersHealthRefresh: 'providers:health:refresh',
  analyticsCostsRefresh: 'analytics:costs:refresh',
  analyticsRecommendationsRefresh: 'analytics:recommendations:refresh',
  analyticsRecommendationsWrite: 'analytics:recommendations:write',
  analyticsJobsRead: 'analytics:jobs:read',
  usersCloudCredentialsWrite: 'users:cloud-credentials:write',
};

const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  operator: [
    PERMISSIONS.resourcesWrite,
    PERMISSIONS.resourcesDelete,
    PERMISSIONS.providersDeploy,
    PERMISSIONS.providersHealthRead,
    PERMISSIONS.providersHealthRefresh,
    PERMISSIONS.analyticsCostsRefresh,
    PERMISSIONS.analyticsRecommendationsRefresh,
    PERMISSIONS.analyticsRecommendationsWrite,
    PERMISSIONS.analyticsJobsRead,
    PERMISSIONS.usersCloudCredentialsWrite,
  ],
  viewer: [],
};

const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || [];

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
};
