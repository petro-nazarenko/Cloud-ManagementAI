'use strict';

/**
 * Unit tests for services/azureService.js using mocked Azure SDK clients.
 */

const mockGetToken = jest.fn();
const mockRGsListIter = jest.fn();
const mockResourcesListIter = jest.fn();
const mockDeploymentsBegin = jest.fn();

// Build an async-iterator from an array
const makeAsyncIter = (items) => ({
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: async () => i < items.length
        ? { value: items[i++], done: false }
        : { done: true },
    };
  },
});

jest.mock('@azure/identity', () => ({
  ClientSecretCredential: jest.fn().mockImplementation(() => ({
    getToken: mockGetToken,
  })),
}));

jest.mock('@azure/arm-resources', () => ({
  ResourceManagementClient: jest.fn().mockImplementation(() => ({
    resourceGroups: {
      list: jest.fn().mockReturnValue(makeAsyncIter([])),
    },
    resources: {
      list: jest.fn().mockReturnValue(makeAsyncIter([])),
    },
    deployments: {
      beginCreateOrUpdate: mockDeploymentsBegin,
    },
  })),
}));

const azureService = require('../services/azureService');

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  delete process.env.AZURE_TENANT_ID;
  delete process.env.AZURE_CLIENT_ID;
  delete process.env.AZURE_CLIENT_SECRET;
  delete process.env.AZURE_SUBSCRIPTION_ID;
});

afterAll(() => {
  process.env = originalEnv;
});

// ─────────────────────────────────────────────────────────────────────
// listResourceGroups
// ─────────────────────────────────────────────────────────────────────

describe('azureService.listResourceGroups', () => {
  it('returns empty array when Azure credentials are not configured', async () => {
    const result = await azureService.listResourceGroups();
    expect(result).toEqual([]);
  });

  it('returns mapped resource groups when credentials are configured', async () => {
    process.env.AZURE_TENANT_ID = 'tenant-id';
    process.env.AZURE_CLIENT_ID = 'client-id';
    process.env.AZURE_CLIENT_SECRET = 'client-secret';
    process.env.AZURE_SUBSCRIPTION_ID = 'subscription-id';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const rgs = [
      { id: '/subscriptions/sub/rg/my-rg', name: 'my-rg', location: 'eastus', properties: { provisioningState: 'Succeeded' }, tags: { env: 'prod' } },
    ];
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter(rgs)) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listResourceGroups();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-rg');
    expect(result[0].location).toBe('eastus');
    expect(result[0].provisioningState).toBe('Succeeded');
    expect(result[0].tags).toEqual({ env: 'prod' });
  });

  it('returns empty array on iteration error', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const errorIter = {
      [Symbol.asyncIterator]() {
        return {
          next: async () => { throw new Error('NetworkError'); },
        };
      },
    };
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(errorIter) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listResourceGroups();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listVirtualMachines
// ─────────────────────────────────────────────────────────────────────

describe('azureService.listVirtualMachines', () => {
  it('returns empty array when credentials not configured', async () => {
    const result = await azureService.listVirtualMachines();
    expect(result).toEqual([]);
  });

  it('returns mapped VMs when credentials are configured', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const vms = [
      { id: '/subscriptions/sub/rg/rg1/vm/my-vm', name: 'my-vm', type: 'Microsoft.Compute/virtualMachines', location: 'eastus', tags: {} },
    ];
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter(vms)) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listVirtualMachines();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-vm');
    expect(result[0].provider).toBe('azure');
    expect(result[0].resourceType).toBe('vm');
  });

  it('returns empty array on error', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const errorIter = {
      [Symbol.asyncIterator]() {
        return { next: async () => { throw new Error('ApiError'); } };
      },
    };
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(errorIter) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listVirtualMachines();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listAKSClusters
// ─────────────────────────────────────────────────────────────────────

describe('azureService.listAKSClusters', () => {
  it('returns empty array when credentials not configured', async () => {
    const result = await azureService.listAKSClusters();
    expect(result).toEqual([]);
  });

  it('returns mapped AKS clusters when credentials configured', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const clusters = [
      { id: '/subscriptions/sub/rg/rg1/aks/my-aks', name: 'my-aks', location: 'eastus', tags: { env: 'test' } },
    ];
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter(clusters)) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listAKSClusters();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-aks');
    expect(result[0].provider).toBe('azure');
    expect(result[0].resourceType).toBe('aks');
  });

  it('returns empty array on error', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const errorIter = {
      [Symbol.asyncIterator]() {
        return { next: async () => { throw new Error('ApiError'); } };
      },
    };
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(errorIter) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listAKSClusters();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listSQLDatabases
// ─────────────────────────────────────────────────────────────────────

describe('azureService.listSQLDatabases', () => {
  it('returns empty array when credentials not configured', async () => {
    const result = await azureService.listSQLDatabases();
    expect(result).toEqual([]);
  });

  it('returns mapped SQL databases when credentials configured', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const dbs = [
      { id: '/subscriptions/sub/rg/rg1/sql/my-db', name: 'my-db', location: 'eastus', tags: {} },
    ];
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter(dbs)) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listSQLDatabases();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-db');
    expect(result[0].provider).toBe('azure');
    expect(result[0].resourceType).toBe('sql-database');
  });

  it('returns empty array on error', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const errorIter = {
      [Symbol.asyncIterator]() {
        return { next: async () => { throw new Error('ApiError'); } };
      },
    };
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(errorIter) },
      deployments: { beginCreateOrUpdate: mockDeploymentsBegin },
    }));

    const result = await azureService.listSQLDatabases();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listResources (combined)
// ─────────────────────────────────────────────────────────────────────

describe('azureService.listResources', () => {
  it('returns empty arrays when credentials not configured', async () => {
    const result = await azureService.listResources();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// deployResource
// ─────────────────────────────────────────────────────────────────────

describe('azureService.deployResource', () => {
  it('returns failed when credentials not configured', async () => {
    const result = await azureService.deployResource({ name: 'test', config: {} });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Azure credentials not configured');
    expect(result.provider).toBe('azure');
  });

  it('returns initiated when deployment succeeds', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const mockBeginFn = jest.fn().mockResolvedValue({ result: async () => ({}) });
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      deployments: { beginCreateOrUpdate: mockBeginFn },
    }));

    const result = await azureService.deployResource({
      name: 'my-deploy',
      resourceGroup: 'my-rg',
      config: { sku: 'Standard' },
      template: { resources: [] },
      parameters: {},
    });
    expect(result.status).toBe('initiated');
    expect(result.provider).toBe('azure');
  });

  it('returns failed when deployment throws', async () => {
    process.env.AZURE_TENANT_ID = 'tid';
    process.env.AZURE_CLIENT_ID = 'cid';
    process.env.AZURE_CLIENT_SECRET = 'cs';
    process.env.AZURE_SUBSCRIPTION_ID = 'sub';

    const { ResourceManagementClient } = require('@azure/arm-resources');
    const mockBeginFn = jest.fn().mockRejectedValue(new Error('DeploymentFailed'));
    ResourceManagementClient.mockImplementationOnce(() => ({
      resourceGroups: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      resources: { list: jest.fn().mockReturnValue(makeAsyncIter([])) },
      deployments: { beginCreateOrUpdate: mockBeginFn },
    }));

    const result = await azureService.deployResource({ name: 'err-deploy', config: {} });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('DeploymentFailed');
  });
});
