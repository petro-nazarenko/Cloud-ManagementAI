'use strict';

const { ResourceManagementClient } = require('@azure/arm-resources');
const { ClientSecretCredential } = require('@azure/identity');
const logger = require('../utils/logger');

const getCredential = () => {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) return null;
  return new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
};

const getClient = () => {
  const { AZURE_SUBSCRIPTION_ID } = process.env;
  const credential = getCredential();
  if (!credential || !AZURE_SUBSCRIPTION_ID) {
    return null;
  }
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
 * List Azure Kubernetes Service (AKS) clusters.
 */
const listAKSClusters = async () => {
  const client = getClient();
  if (!client) {
    logger.warn('Azure credentials not configured — returning empty AKS list.');
    return [];
  }
  try {
    const clusters = [];
    for await (const cluster of client.resources.list({ filter: "resourceType eq 'Microsoft.ContainerService/managedClusters'" })) {
      clusters.push({
        id: cluster.id,
        name: cluster.name,
        location: cluster.location,
        provider: 'azure',
        resourceType: 'aks',
        tags: cluster.tags || {},
      });
    }
    return clusters;
  } catch (err) {
    logger.warn(`Azure listAKSClusters failed: ${err.message}`);
    return [];
  }
};

/**
 * List Azure SQL databases.
 */
const listSQLDatabases = async () => {
  const client = getClient();
  if (!client) {
    logger.warn('Azure credentials not configured — returning empty SQL database list.');
    return [];
  }
  try {
    const databases = [];
    for await (const db of client.resources.list({ filter: "resourceType eq 'Microsoft.Sql/servers/databases'" })) {
      databases.push({
        id: db.id,
        name: db.name,
        location: db.location,
        provider: 'azure',
        resourceType: 'sql-database',
        tags: db.tags || {},
      });
    }
    return databases;
  } catch (err) {
    logger.warn(`Azure listSQLDatabases failed: ${err.message}`);
    return [];
  }
};

/**
 * Fetch Azure cost data using Azure Cost Management REST API.
 * Falls back gracefully when credentials are absent.
 */
const getCosts = async (startDate, endDate) => {
  const { AZURE_SUBSCRIPTION_ID } = process.env;
  const credential = getCredential();
  if (!credential || !AZURE_SUBSCRIPTION_ID) {
    logger.warn('Azure credentials not configured — returning empty cost data.');
    return [];
  }
  try {
    const token = await credential.getToken('https://management.azure.com/.default');
    const url = `https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;
    const body = {
      type: 'ActualCost',
      dataSet: {
        granularity: 'Monthly',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        grouping: [{ type: 'Dimension', name: 'ServiceName' }],
      },
      timePeriod: { from: startDate, to: endDate },
    };

    const https = require('https');
    const result = await new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': `Bearer ${token.token}`,
        },
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    return result.properties?.rows || [];
  } catch (err) {
    logger.warn(`Azure Cost Management query failed: ${err.message}`);
    return [];
  }
};

/**
 * Combined resource listing used by the providers route.
 */
const listResources = async () => {
  const [rgs, vms, aksClusters, sqlDbs] = await Promise.all([
    listResourceGroups(),
    listVirtualMachines(),
    listAKSClusters(),
    listSQLDatabases(),
  ]);
  return [
    ...rgs.map((r) => ({ ...r, provider: 'azure', resourceType: 'resource-group' })),
    ...vms,
    ...aksClusters,
    ...sqlDbs,
  ];
};

/**
 * Deploy a resource using Azure Resource Manager template.
 */
const deployResource = async (config) => {
  logger.info(`Azure deploy requested: ${JSON.stringify(config)}`);
  const client = getClient();
  if (!client) {
    return {
      deploymentId: `azure-deploy-${Date.now()}`,
      status: 'failed',
      provider: 'azure',
      error: 'Azure credentials not configured.',
      config,
    };
  }
  try {
    const deploymentName = `cloud-mgmt-${config.name}-${Date.now()}`;
    const resourceGroupName = config.resourceGroup || 'cloud-mgmt-rg';
    const deployment = await client.deployments.beginCreateOrUpdate(
      resourceGroupName,
      deploymentName,
      {
        properties: {
          mode: 'Incremental',
          template: config.template || { '$schema': 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#', contentVersion: '1.0.0.0', resources: [] },
          parameters: config.parameters || {},
        },
      }
    );
    return {
      deploymentId: deploymentName,
      status: 'initiated',
      provider: 'azure',
      config,
    };
  } catch (err) {
    logger.warn(`Azure ARM deploy failed: ${err.message}`);
    return {
      deploymentId: `azure-deploy-${Date.now()}`,
      status: 'failed',
      provider: 'azure',
      error: err.message,
      config,
    };
  }
};

module.exports = { listResourceGroups, listVirtualMachines, listAKSClusters, listSQLDatabases, getCosts, listResources, deployResource };
