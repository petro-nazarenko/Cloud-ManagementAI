'use strict';

const { ProjectsClient } = require('@google-cloud/resource-manager');
const logger = require('../utils/logger');

const getProjectsClient = () => {
  try {
    // Credentials are picked up from GOOGLE_APPLICATION_CREDENTIALS env var
    return new ProjectsClient();
  } catch (err) {
    logger.warn(`GCP client init failed: ${err.message}`);
    return null;
  }
};

/**
 * List all GCP projects accessible by the service account.
 */
const listProjects = async () => {
  const client = getProjectsClient();
  if (!client) return [];
  try {
    const [projects] = await client.searchProjects();
    return projects.map((p) => ({
      id: p.projectId,
      name: p.displayName,
      state: p.state,
      provider: 'gcp',
      resourceType: 'project',
      labels: p.labels || {},
    }));
  } catch (err) {
    logger.warn(`GCP listProjects failed: ${err.message}`);
    return [];
  }
};

/**
 * List GCP Compute Engine instances via REST (requires GOOGLE_APPLICATION_CREDENTIALS).
 * Falls back gracefully when credentials are absent.
 */
const listInstances = async (projectId, zone) => {
  if (!projectId) {
    logger.warn('GCP listInstances: projectId is required.');
    return [];
  }
  try {
    // Dynamic import to avoid hard dependency when credentials are missing
    const { InstancesClient } = require('@google-cloud/compute');
    const computeClient = new InstancesClient();
    const instances = [];
    const [response] = await computeClient.aggregatedList({ project: projectId });
    for (const [, instanceData] of Object.entries(response)) {
      for (const inst of instanceData.instances || []) {
        instances.push({
          id: inst.id?.toString(),
          name: inst.name,
          status: inst.status,
          zone: inst.zone?.split('/').pop(),
          machineType: inst.machineType?.split('/').pop(),
          provider: 'gcp',
          resourceType: 'instance',
          labels: inst.labels || {},
        });
      }
    }
    return instances;
  } catch (err) {
    logger.warn(`GCP listInstances failed: ${err.message}`);
    return [];
  }
};

/**
 * List GKE clusters in a project.
 */
const listGKEClusters = async (projectId) => {
  if (!projectId) return [];
  try {
    const { ClusterManagerClient } = require('@google-cloud/container');
    const client = new ClusterManagerClient();
    const [response] = await client.listClusters({ parent: `projects/${projectId}/locations/-` });
    return (response.clusters || []).map((c) => ({
      id: c.selfLink || `projects/${projectId}/clusters/${c.name}`,
      name: c.name,
      status: c.status,
      location: c.location,
      nodeCount: c.currentNodeCount,
      provider: 'gcp',
      resourceType: 'gke',
    }));
  } catch (err) {
    logger.warn(`GCP listGKEClusters failed: ${err.message}`);
    return [];
  }
};

/**
 * List Cloud Run services in a project region.
 */
const listCloudRunServices = async (projectId, region = '-') => {
  if (!projectId) return [];
  try {
    const { ServicesClient } = require('@google-cloud/run').v2;
    const client = new ServicesClient();
    const [services] = await client.listServices({
      parent: `projects/${projectId}/locations/${region}`,
    });
    return (services || []).map((s) => ({
      id: s.name,
      name: s.name.split('/').pop(),
      status: s.terminalCondition?.state || 'unknown',
      region,
      provider: 'gcp',
      resourceType: 'cloud-run',
      uri: s.uri,
    }));
  } catch (err) {
    logger.warn(`GCP listCloudRunServices failed: ${err.message}`);
    return [];
  }
};

/**
 * List Cloud SQL instances in a project.
 */
const listCloudSQLInstances = async (projectId) => {
  if (!projectId) return [];
  try {
    const { SqlInstancesServiceClient } = require('@google-cloud/sql-admin').v1beta4;
    const client = new SqlInstancesServiceClient();
    const [response] = await client.list({ project: projectId });
    return (response.items || []).map((inst) => ({
      id: inst.selfLink || inst.name,
      name: inst.name,
      status: inst.state,
      databaseVersion: inst.databaseVersion,
      region: inst.region,
      provider: 'gcp',
      resourceType: 'cloud-sql',
    }));
  } catch (err) {
    logger.warn(`GCP listCloudSQLInstances failed: ${err.message}`);
    return [];
  }
};

/**
 * Combined resource listing used by the providers route.
 */
const listResources = async (query = {}) => {
  const projects = await listProjects();
  const targetProject = query.projectId || (projects[0] && projects[0].id);
  const [instances, gkeClusters, cloudRunServices, cloudSqlInstances] = await Promise.all([
    targetProject ? listInstances(targetProject, query.zone) : Promise.resolve([]),
    targetProject ? listGKEClusters(targetProject) : Promise.resolve([]),
    targetProject ? listCloudRunServices(targetProject, query.region) : Promise.resolve([]),
    targetProject ? listCloudSQLInstances(targetProject) : Promise.resolve([]),
  ]);
  return [...projects, ...instances, ...gkeClusters, ...cloudRunServices, ...cloudSqlInstances];
};

/**
 * Deploy a resource via GCP Deployment Manager.
 */
const deployResource = async (config) => {
  logger.info(`GCP deploy requested: ${JSON.stringify(config)}`);
  const projects = await listProjects();
  const projectId = config.projectId || (projects[0] && projects[0].id);
  if (!projectId) {
    return { deploymentId: `gcp-deploy-${Date.now()}`, status: 'failed', provider: 'gcp', error: 'No GCP project available.', config };
  }
  try {
    const { DeploymentManagerClient } = require('@google-cloud/deployment-manager');
    const client = new DeploymentManagerClient();
    const deploymentName = `cloud-mgmt-${config.name}-${Date.now()}`;
    await client.insert({
      project: projectId,
      resource: {
        name: deploymentName,
        target: {
          config: {
            content: config.templateContent || '{}',
          },
        },
      },
    });
    return { deploymentId: deploymentName, status: 'initiated', provider: 'gcp', config };
  } catch (err) {
    logger.warn(`GCP Deployment Manager deploy failed: ${err.message}`);
    return { deploymentId: `gcp-deploy-${Date.now()}`, status: 'failed', provider: 'gcp', error: err.message, config };
  }
};

module.exports = {
  listProjects, listInstances, listGKEClusters, listCloudRunServices, listCloudSQLInstances,
  listResources, deployResource,
};
