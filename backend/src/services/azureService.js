'use strict';

const { ResourceManagementClient } = require('@azure/arm-resources');
const { ClientSecretCredential } = require('@azure/identity');
const logger = require('../utils/logger');

const getClient = () => {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_SUBSCRIPTION_ID) {
    return null;
  }
  const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
  return new ResourceManagementClient(credential, AZURE_SUBSCRIPTION_ID);
};

/**
 * List all Azure resource groups.
 */
const listResourceGroups = async () => {
  const client = getClient();
  if (!client) {
    logger.warn('Azure credentials not configured — returning empty resource groups.');
    return [];
  }
  try {
    const groups = [];
    for await (const rg of client.resourceGroups.list()) {
      groups.push({
        id: rg.id,
        name: rg.name,
        location: rg.location,
        provisioningState: rg.properties?.provisioningState,
        tags: rg.tags || {},
      });
    }
    return groups;
  } catch (err) {
    logger.warn(`Azure listResourceGroups failed: ${err.message}`);
    return [];
  }
};

/**
 * List Azure VMs across all resource groups.
 */
const listVirtualMachines = async () => {
  const client = getClient();
  if (!client) {
    logger.warn('Azure credentials not configured — returning empty VM list.');
    return [];
  }
  try {
    const vms = [];
    for await (const vm of client.resources.list({ filter: "resourceType eq 'Microsoft.Compute/virtualMachines'" })) {
      vms.push({
        id: vm.id,
        name: vm.name,
        type: vm.type,
        location: vm.location,
        provider: 'azure',
        resourceType: 'vm',
        tags: vm.tags || {},
      });
    }
    return vms;
  } catch (err) {
    logger.warn(`Azure listVMs failed: ${err.message}`);
    return [];
  }
};

/**
 * Combined resource listing used by the providers route.
 */
const listResources = async () => {
  const [rgs, vms] = await Promise.all([listResourceGroups(), listVirtualMachines()]);
  return [
    ...rgs.map((r) => ({ ...r, provider: 'azure', resourceType: 'resource-group' })),
    ...vms,
  ];
};

/**
 * Deploy a resource (stubbed).
 */
const deployResource = async (config) => {
  logger.info(`Azure deploy requested: ${JSON.stringify(config)}`);
  return {
    deploymentId: `azure-deploy-${Date.now()}`,
    status: 'initiated',
    provider: 'azure',
    config,
  };
};

module.exports = { listResourceGroups, listVirtualMachines, listResources, deployResource };
