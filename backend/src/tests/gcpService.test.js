'use strict';

/**
 * Unit tests for services/gcpService.js.
 *
 * Only @google-cloud/resource-manager is installed.
 * The remaining GCP packages (@google-cloud/compute, container, run, sql-admin,
 * deployment-manager) are dynamic requires inside each function. When those
 * packages are absent the catch block runs and returns [].
 * This file tests:
 *   - listProjects via a mocked resource-manager
 *   - All other functions via null-projectId early-return path AND
 *     the catch-on-require-failure path (no real cloud calls made)
 */

const mockSearchProjects = jest.fn();

jest.mock('@google-cloud/resource-manager', () => ({
  ProjectsClient: jest.fn().mockImplementation(() => ({
    searchProjects: mockSearchProjects,
  })),
}));

const gcpService = require('../services/gcpService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────
// listProjects
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.listProjects', () => {
  it('returns empty array when ProjectsClient constructor throws', async () => {
    const { ProjectsClient } = require('@google-cloud/resource-manager');
    ProjectsClient.mockImplementationOnce(() => {
      throw new Error('Application Default Credentials not found');
    });
    const result = await gcpService.listProjects();
    expect(result).toEqual([]);
  });

  it('returns mapped projects on success', async () => {
    mockSearchProjects.mockResolvedValue([
      [
        { projectId: 'my-project', displayName: 'My Project', state: 'ACTIVE', labels: { env: 'prod' } },
        { projectId: 'other-project', displayName: 'Other Project', state: 'ACTIVE', labels: null },
      ],
    ]);
    const result = await gcpService.listProjects();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('my-project');
    expect(result[0].name).toBe('My Project');
    expect(result[0].provider).toBe('gcp');
    expect(result[0].resourceType).toBe('project');
    expect(result[0].labels).toEqual({ env: 'prod' });
    expect(result[1].labels).toEqual({});
  });

  it('returns empty array on searchProjects error', async () => {
    mockSearchProjects.mockRejectedValue(new Error('PermissionDenied'));
    const result = await gcpService.listProjects();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listInstances
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.listInstances', () => {
  it('returns empty array when projectId is null', async () => {
    const result = await gcpService.listInstances(null);
    expect(result).toEqual([]);
  });

  it('returns empty array when projectId is empty string', async () => {
    const result = await gcpService.listInstances('');
    expect(result).toEqual([]);
  });

  it('returns empty array when @google-cloud/compute module is not available', async () => {
    // Dynamic require will fail → caught → returns []
    const result = await gcpService.listInstances('my-project', 'us-east1');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listGKEClusters
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.listGKEClusters', () => {
  it('returns empty array when projectId is null', async () => {
    const result = await gcpService.listGKEClusters(null);
    expect(result).toEqual([]);
  });

  it('returns empty array when @google-cloud/container module is not available', async () => {
    const result = await gcpService.listGKEClusters('my-project');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listCloudRunServices
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.listCloudRunServices', () => {
  it('returns empty array when projectId is null', async () => {
    const result = await gcpService.listCloudRunServices(null);
    expect(result).toEqual([]);
  });

  it('returns empty array when @google-cloud/run module is not available', async () => {
    const result = await gcpService.listCloudRunServices('my-project', 'us-east1');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listCloudSQLInstances
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.listCloudSQLInstances', () => {
  it('returns empty array when projectId is null', async () => {
    const result = await gcpService.listCloudSQLInstances(null);
    expect(result).toEqual([]);
  });

  it('returns empty array when @google-cloud/sql-admin module is not available', async () => {
    const result = await gcpService.listCloudSQLInstances('my-project');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listResources (combined)
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.listResources', () => {
  it('returns empty array when no projects found and no projectId given', async () => {
    mockSearchProjects.mockResolvedValue([[]]); 
    const result = await gcpService.listResources({});
    expect(Array.isArray(result)).toBe(true);
  });

  it('uses query.projectId when provided, sub-services return [] (no packages)', async () => {
    mockSearchProjects.mockResolvedValue([[]]); 
    const result = await gcpService.listResources({ projectId: 'explicit-project' });
    expect(Array.isArray(result)).toBe(true);
  });

  it('includes project resources when projects are available', async () => {
    mockSearchProjects.mockResolvedValue([
      [{ projectId: 'test-project', displayName: 'Test Project', state: 'ACTIVE', labels: {} }],
    ]);
    const result = await gcpService.listResources({});
    expect(result.some((r) => r.resourceType === 'project')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// deployResource
// ─────────────────────────────────────────────────────────────────────

describe('gcpService.deployResource', () => {
  it('returns failed when no GCP project is available', async () => {
    mockSearchProjects.mockResolvedValue([[]]); 
    const result = await gcpService.deployResource({ name: 'test', config: {} });
    expect(result.status).toBe('failed');
    expect(result.provider).toBe('gcp');
    expect(result.error).toContain('No GCP project available');
  });

  it('returns failed when @google-cloud/deployment-manager not available', async () => {
    mockSearchProjects.mockResolvedValue([
      [{ projectId: 'my-project', displayName: 'My Project', state: 'ACTIVE', labels: {} }],
    ]);
    const result = await gcpService.deployResource({ name: 'test-deploy', config: {} });
    expect(result.status).toBe('failed');
    expect(result.provider).toBe('gcp');
  });

  it('uses config.projectId when provided without listing projects', async () => {
    const result = await gcpService.deployResource({
      name: 'test-explicit',
      projectId: 'explicit-project',
      config: {},
    });
    // Deployment manager not installed → falls through to failed
    expect(result.status).toBe('failed');
    expect(result.provider).toBe('gcp');
  });
});
