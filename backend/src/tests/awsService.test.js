'use strict';

/**
 * Unit tests for services/awsService.js using mocked AWS SDK v3 clients.
 * These tests run without real AWS credentials.
 */

const mockEC2Send = jest.fn();
const mockS3Send = jest.fn();
const mockRDSSend = jest.fn();
const mockLambdaSend = jest.fn();
const mockECSSend = jest.fn();
const mockCFSend = jest.fn();
const mockCESend = jest.fn();

jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: jest.fn().mockImplementation(() => ({ send: mockEC2Send })),
  DescribeInstancesCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  ListBucketsCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-rds', () => ({
  RDSClient: jest.fn().mockImplementation(() => ({ send: mockRDSSend })),
  DescribeDBInstancesCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({ send: mockLambdaSend })),
  ListFunctionsCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-ecs', () => ({
  ECSClient: jest.fn().mockImplementation(() => ({ send: mockECSSend })),
  ListClustersCommand: jest.fn(),
  DescribeClustersCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-cloudformation', () => ({
  CloudFormationClient: jest.fn().mockImplementation(() => ({ send: mockCFSend })),
  CreateStackCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-cost-explorer', () => ({
  CostExplorerClient: jest.fn().mockImplementation(() => ({ send: mockCESend })),
  GetCostAndUsageCommand: jest.fn(),
}));

const awsService = require('../services/awsService');

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.AWS_SESSION_TOKEN;
});

// ─────────────────────────────────────────────────────────────────────
// listEC2Instances
// ─────────────────────────────────────────────────────────────────────

describe('awsService.listEC2Instances', () => {
  it('returns empty array when no reservations', async () => {
    mockEC2Send.mockResolvedValue({ Reservations: [] });
    const result = await awsService.listEC2Instances();
    expect(result).toEqual([]);
  });

  it('maps EC2 instances from reservations', async () => {
    mockEC2Send.mockResolvedValue({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: 'i-123abc',
              InstanceType: 't3.medium',
              State: { Name: 'running' },
              PublicIpAddress: '1.2.3.4',
              PrivateIpAddress: '10.0.0.1',
              LaunchTime: new Date('2024-01-01'),
              Tags: [{ Key: 'Name', Value: 'my-instance' }],
            },
          ],
        },
      ],
    });
    const result = await awsService.listEC2Instances('us-east-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i-123abc');
    expect(result[0].type).toBe('t3.medium');
    expect(result[0].state).toBe('running');
    expect(result[0].publicIp).toBe('1.2.3.4');
    expect(result[0].privateIp).toBe('10.0.0.1');
    expect(result[0].region).toBe('us-east-1');
    expect(result[0].tags).toEqual({ Name: 'my-instance' });
  });

  it('handles instance with no public IP or tags', async () => {
    mockEC2Send.mockResolvedValue({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: 'i-456',
              InstanceType: 't2.micro',
              State: { Name: 'stopped' },
              LaunchTime: new Date(),
            },
          ],
        },
      ],
    });
    const result = await awsService.listEC2Instances();
    expect(result[0].publicIp).toBeNull();
    expect(result[0].tags).toEqual({});
  });

  it('returns empty array on API error', async () => {
    mockEC2Send.mockRejectedValue(new Error('AuthFailure'));
    const result = await awsService.listEC2Instances('us-west-2');
    expect(result).toEqual([]);
  });

  it('uses env var credentials when available', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIATEST123';
    process.env.AWS_SECRET_ACCESS_KEY = 'secrettest123';
    process.env.AWS_SESSION_TOKEN = 'sessiontoken123';
    mockEC2Send.mockResolvedValue({ Reservations: [] });
    const result = await awsService.listEC2Instances();
    expect(result).toEqual([]);
    const { EC2Client } = require('@aws-sdk/client-ec2');
    expect(EC2Client).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: expect.objectContaining({
          accessKeyId: 'AKIATEST123',
          secretAccessKey: 'secrettest123',
          sessionToken: 'sessiontoken123',
        }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// listS3Buckets
// ─────────────────────────────────────────────────────────────────────

describe('awsService.listS3Buckets', () => {
  it('returns mapped buckets', async () => {
    mockS3Send.mockResolvedValue({
      Buckets: [
        { Name: 'my-bucket', CreationDate: new Date('2024-01-01') },
        { Name: 'another-bucket', CreationDate: new Date('2024-02-01') },
      ],
    });
    const result = await awsService.listS3Buckets();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('my-bucket');
    expect(result[0].name).toBe('my-bucket');
    expect(result[0].type).toBe('s3');
    expect(result[0].provider).toBe('aws');
  });

  it('returns empty array when no buckets', async () => {
    mockS3Send.mockResolvedValue({ Buckets: [] });
    const result = await awsService.listS3Buckets();
    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    mockS3Send.mockRejectedValue(new Error('NoSuchBucket'));
    const result = await awsService.listS3Buckets();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listRDSInstances
// ─────────────────────────────────────────────────────────────────────

describe('awsService.listRDSInstances', () => {
  it('returns mapped RDS instances', async () => {
    mockRDSSend.mockResolvedValue({
      DBInstances: [
        {
          DBInstanceIdentifier: 'my-db',
          DBInstanceStatus: 'available',
          Engine: 'mysql',
          DBInstanceClass: 'db.t3.medium',
          Endpoint: { Address: 'my-db.example.rds.amazonaws.com' },
        },
      ],
    });
    const result = await awsService.listRDSInstances('us-east-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('my-db');
    expect(result[0].engine).toBe('mysql');
    expect(result[0].instanceClass).toBe('db.t3.medium');
    expect(result[0].endpoint).toBe('my-db.example.rds.amazonaws.com');
  });

  it('handles RDS instance with no endpoint', async () => {
    mockRDSSend.mockResolvedValue({
      DBInstances: [
        {
          DBInstanceIdentifier: 'no-endpoint-db',
          DBInstanceStatus: 'creating',
          Engine: 'postgres',
          DBInstanceClass: 'db.r6g.large',
        },
      ],
    });
    const result = await awsService.listRDSInstances();
    expect(result[0].endpoint).toBeNull();
  });

  it('returns empty array on error', async () => {
    mockRDSSend.mockRejectedValue(new Error('AccessDenied'));
    const result = await awsService.listRDSInstances();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listLambdaFunctions
// ─────────────────────────────────────────────────────────────────────

describe('awsService.listLambdaFunctions', () => {
  it('returns mapped Lambda functions', async () => {
    mockLambdaSend.mockResolvedValue({
      Functions: [
        {
          FunctionArn: 'arn:aws:lambda:us-east-1:123:function:my-fn',
          FunctionName: 'my-fn',
          Runtime: 'nodejs20.x',
          MemorySize: 256,
          LastModified: '2024-01-01T00:00:00.000+0000',
        },
      ],
      NextMarker: undefined,
    });
    const result = await awsService.listLambdaFunctions('us-east-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-fn');
    expect(result[0].runtime).toBe('nodejs20.x');
    expect(result[0].memorySize).toBe(256);
  });

  it('paginates through multiple pages', async () => {
    mockLambdaSend
      .mockResolvedValueOnce({
        Functions: [
          { FunctionArn: 'arn:fn1', FunctionName: 'fn1', Runtime: 'python3.11', MemorySize: 128, LastModified: '2024-01-01' },
        ],
        NextMarker: 'page2-marker',
      })
      .mockResolvedValueOnce({
        Functions: [
          { FunctionArn: 'arn:fn2', FunctionName: 'fn2', Runtime: 'go1.x', MemorySize: 512, LastModified: '2024-01-02' },
        ],
        NextMarker: undefined,
      });
    const result = await awsService.listLambdaFunctions();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('fn1');
    expect(result[1].name).toBe('fn2');
  });

  it('returns empty array on error', async () => {
    mockLambdaSend.mockRejectedValue(new Error('ThrottlingException'));
    const result = await awsService.listLambdaFunctions();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listECSClusters
// ─────────────────────────────────────────────────────────────────────

describe('awsService.listECSClusters', () => {
  it('returns empty array when no cluster ARNs', async () => {
    mockECSSend.mockResolvedValue({ clusterArns: [] });
    const result = await awsService.listECSClusters();
    expect(result).toEqual([]);
  });

  it('returns mapped ECS clusters', async () => {
    mockECSSend
      .mockResolvedValueOnce({
        clusterArns: ['arn:aws:ecs:us-east-1:123:cluster/my-cluster'],
      })
      .mockResolvedValueOnce({
        clusters: [
          {
            clusterArn: 'arn:aws:ecs:us-east-1:123:cluster/my-cluster',
            clusterName: 'my-cluster',
            status: 'ACTIVE',
            runningTasksCount: 5,
            activeServicesCount: 2,
          },
        ],
      });
    const result = await awsService.listECSClusters('us-east-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-cluster');
    expect(result[0].status).toBe('ACTIVE');
    expect(result[0].runningTasksCount).toBe(5);
  });

  it('returns empty array on error', async () => {
    mockECSSend.mockRejectedValue(new Error('ClusterNotFoundException'));
    const result = await awsService.listECSClusters();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// getCosts
// ─────────────────────────────────────────────────────────────────────

describe('awsService.getCosts', () => {
  it('returns ResultsByTime array on success', async () => {
    const mockResults = [
      {
        TimePeriod: { Start: '2024-01-01', End: '2024-02-01' },
        Groups: [
          { Keys: ['Amazon EC2'], Metrics: { UnblendedCost: { Amount: '150.00', Unit: 'USD' } } },
        ],
      },
    ];
    mockCESend.mockResolvedValue({ ResultsByTime: mockResults });
    const result = await awsService.getCosts('2024-01-01', '2024-02-01');
    expect(result).toEqual(mockResults);
  });

  it('returns empty array on error', async () => {
    mockCESend.mockRejectedValue(new Error('AccessDenied'));
    const result = await awsService.getCosts('2024-01-01', '2024-02-01');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listResources (combined)
// ─────────────────────────────────────────────────────────────────────

describe('awsService.listResources', () => {
  it('combines all resource types into a single array', async () => {
    mockEC2Send.mockResolvedValue({ Reservations: [] });
    mockS3Send.mockResolvedValue({ Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }] });
    mockRDSSend.mockResolvedValue({ DBInstances: [] });
    mockLambdaSend.mockResolvedValue({ Functions: [], NextMarker: undefined });
    mockECSSend.mockResolvedValue({ clusterArns: [] });

    const result = await awsService.listResources({ region: 'us-east-1' });
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((r) => r.type === 's3')).toBe(true);
  });

  it('returns empty array when all services fail', async () => {
    mockEC2Send.mockRejectedValue(new Error('fail'));
    mockS3Send.mockRejectedValue(new Error('fail'));
    mockRDSSend.mockRejectedValue(new Error('fail'));
    mockLambdaSend.mockRejectedValue(new Error('fail'));
    mockECSSend.mockRejectedValue(new Error('fail'));
    const result = await awsService.listResources({});
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// deployResource
// ─────────────────────────────────────────────────────────────────────

describe('awsService.deployResource', () => {
  it('returns initiated deployment on success', async () => {
    mockCFSend.mockResolvedValue({ StackId: 'arn:aws:cloudformation:us-east-1:123:stack/my-stack/abc' });
    const result = await awsService.deployResource({
      name: 'test-deploy',
      region: 'us-east-1',
      config: { instanceType: 't3.medium' },
      tags: { env: 'test' },
    });
    expect(result.status).toBe('initiated');
    expect(result.provider).toBe('aws');
    expect(result.deploymentId).toBe('arn:aws:cloudformation:us-east-1:123:stack/my-stack/abc');
  });

  it('returns initiated deployment with custom templateBody', async () => {
    mockCFSend.mockResolvedValue({ StackId: 'arn:stack/custom' });
    const result = await awsService.deployResource({
      name: 'custom-deploy',
      region: 'us-east-1',
      templateBody: '{"AWSTemplateFormatVersion":"2010-09-09","Resources":{}}',
      config: {},
      tags: {},
    });
    expect(result.status).toBe('initiated');
  });

  it('returns failed status on CloudFormation error', async () => {
    mockCFSend.mockRejectedValue(new Error('InsufficientCapabilitiesException'));
    const result = await awsService.deployResource({
      name: 'fail-deploy',
      region: 'us-east-1',
      config: {},
      tags: {},
    });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('InsufficientCapabilitiesException');
    expect(result.provider).toBe('aws');
  });

  it('uses fallback deploymentId when StackId is absent', async () => {
    mockCFSend.mockResolvedValue({});
    const result = await awsService.deployResource({ name: 'no-id', region: 'us-east-1', config: {}, tags: {} });
    expect(typeof result.deploymentId).toBe('string');
    expect(result.status).toBe('initiated');
  });
});
