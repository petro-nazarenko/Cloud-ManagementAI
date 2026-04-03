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
 * Combined resource listing used by the providers route.
 */
const listResources = async (query = {}) => {
  const projects = await listProjects();
  const targetProject = query.projectId || (projects[0] && projects[0].id);
  const instances = targetProject ? await listInstances(targetProject, query.zone) : [];
  return [...projects, ...instances];
};

/**
 * Deploy a resource (stubbed).
 */
const deployResource = async (config) => {
  logger.info(`GCP deploy requested: ${JSON.stringify(config)}`);
  return {
    deploymentId: `gcp-deploy-${Date.now()}`,
    status: 'initiated',
    provider: 'gcp',
    config,
  };
};

module.exports = { listProjects, listInstances, listResources, deployResource };
