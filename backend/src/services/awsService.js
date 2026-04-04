'use strict';

const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');
const { ECSClient, ListClustersCommand, DescribeClustersCommand } = require('@aws-sdk/client-ecs');
const { CloudFormationClient, CreateStackCommand } = require('@aws-sdk/client-cloudformation');
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const logger = require('../utils/logger');

/**
 * Build a base client configuration.
 * If explicit env-var credentials are present they are used; otherwise the
 * AWS SDK v3 default credential-provider chain handles them (IAM roles, etc.).
 */
const getClientConfig = (region) => {
  const config = { region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1' };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
    };
  }
  return config;
};

/**
 * List all EC2 instances in the given region (or default region).
 */
const listEC2Instances = async (region) => {
  const ec2 = new EC2Client(getClientConfig(region));
  try {
    const data = await ec2.send(new DescribeInstancesCommand({}));
    const instances = [];
    for (const reservation of data.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        instances.push({
          id: inst.InstanceId,
          type: inst.InstanceType,
          state: inst.State?.Name,
          region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
          publicIp: inst.PublicIpAddress || null,
          privateIp: inst.PrivateIpAddress || null,
          launchTime: inst.LaunchTime,
          tags: (inst.Tags || []).reduce((acc, t) => { acc[t.Key] = t.Value; return acc; }, {}),
        });
      }
    }
    return instances;
  } catch (err) {
    logger.warn(`AWS EC2 listInstances failed: ${err.message}`);
    return [];
  }
};

/**
 * List all S3 buckets.
 */
const listS3Buckets = async () => {
  const s3 = new S3Client(getClientConfig());
  try {
    const data = await s3.send(new ListBucketsCommand({}));
    return (data.Buckets || []).map((b) => ({
      id: b.Name,
      name: b.Name,
      type: 's3',
      provider: 'aws',
      creationDate: b.CreationDate,
    }));
  } catch (err) {
    logger.warn(`AWS S3 listBuckets failed: ${err.message}`);
    return [];
  }
};

/**
 * List all RDS database instances.
 */
const listRDSInstances = async (region) => {
  const rds = new RDSClient(getClientConfig(region));
  try {
    const data = await rds.send(new DescribeDBInstancesCommand({}));
    return (data.DBInstances || []).map((db) => ({
      id: db.DBInstanceIdentifier,
      name: db.DBInstanceIdentifier,
      type: 'rds',
      provider: 'aws',
      resourceType: 'rds',
      region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
      status: db.DBInstanceStatus,
      engine: db.Engine,
      instanceClass: db.DBInstanceClass,
      endpoint: db.Endpoint?.Address || null,
    }));
  } catch (err) {
    logger.warn(`AWS RDS listInstances failed: ${err.message}`);
    return [];
  }
};

/**
 * List all Lambda functions.
 */
const listLambdaFunctions = async (region) => {
  const lambda = new LambdaClient(getClientConfig(region));
  try {
    const functions = [];
    let marker;
    do {
      const data = await lambda.send(new ListFunctionsCommand({ Marker: marker }));
      for (const fn of data.Functions || []) {
        functions.push({
          id: fn.FunctionArn,
          name: fn.FunctionName,
          type: 'lambda',
          provider: 'aws',
          resourceType: 'lambda',
          region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
          runtime: fn.Runtime,
          memorySize: fn.MemorySize,
          lastModified: fn.LastModified,
        });
      }
      marker = data.NextMarker;
    } while (marker);
    return functions;
  } catch (err) {
    logger.warn(`AWS Lambda listFunctions failed: ${err.message}`);
    return [];
  }
};

/**
 * List all ECS clusters.
 */
const listECSClusters = async (region) => {
  const ecs = new ECSClient(getClientConfig(region));
  try {
    const listData = await ecs.send(new ListClustersCommand({}));
    if (!listData.clusterArns || listData.clusterArns.length === 0) return [];
    const data = await ecs.send(new DescribeClustersCommand({ clusters: listData.clusterArns }));
    return (data.clusters || []).map((c) => ({
      id: c.clusterArn,
      name: c.clusterName,
      type: 'ecs',
      provider: 'aws',
      resourceType: 'ecs',
      region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
      status: c.status,
      runningTasksCount: c.runningTasksCount,
      activeServicesCount: c.activeServicesCount,
    }));
  } catch (err) {
    logger.warn(`AWS ECS listClusters failed: ${err.message}`);
    return [];
  }
};

/**
 * Fetch AWS cost data for a given time range using Cost Explorer.
 * Returns an array of ResultsByTime objects.
 */
const getCosts = async (startDate, endDate) => {
  const ce = new CostExplorerClient({ ...getClientConfig(), region: 'us-east-1' });
  try {
    const data = await ce.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }));
    return data.ResultsByTime || [];
  } catch (err) {
    logger.warn(`AWS Cost Explorer failed: ${err.message}`);
    return [];
  }
};

/**
 * Combined resource listing used by the providers route.
 */
const listResources = async (query = {}) => {
  const [instances, buckets, rdsInstances, lambdaFunctions, ecsClusters] = await Promise.all([
    listEC2Instances(query.region),
    listS3Buckets(),
    listRDSInstances(query.region),
    listLambdaFunctions(query.region),
    listECSClusters(query.region),
  ]);
  return [
    ...instances.map((i) => ({ ...i, provider: 'aws', resourceType: 'ec2' })),
    ...buckets.map((b) => ({ ...b, provider: 'aws', resourceType: 's3' })),
    ...rdsInstances,
    ...lambdaFunctions,
    ...ecsClusters,
  ];
};

/**
 * Deploy a resource via CloudFormation.
 */
const deployResource = async (config) => {
  logger.info(`AWS deploy requested: ${JSON.stringify(config)}`);
  const cf = new CloudFormationClient(getClientConfig(config.region));
  const stackName = `cloud-mgmt-${config.name}-${Date.now()}`;
  try {
    const params = {
      StackName: stackName,
      TemplateBody: config.templateBody || JSON.stringify({
        AWSTemplateFormatVersion: '2010-09-09',
        Description: `Cloud Management AI deployment: ${config.name}`,
        Resources: {},
      }),
      Parameters: Object.entries(config.config || {}).map(([k, v]) => ({
        ParameterKey: k,
        ParameterValue: String(v),
      })),
      Tags: Object.entries(config.tags || {}).map(([k, v]) => ({ Key: k, Value: v })),
      OnFailure: 'ROLLBACK',
    };
    const data = await cf.send(new CreateStackCommand(params));
    return {
      deploymentId: data.StackId || stackName,
      status: 'initiated',
      provider: 'aws',
      stackName,
      config,
    };
  } catch (err) {
    logger.warn(`AWS CloudFormation deploy failed: ${err.message}`);
    return {
      deploymentId: `aws-deploy-${Date.now()}`,
      status: 'failed',
      provider: 'aws',
      error: err.message,
      config,
    };
  }
};

module.exports = {
  listEC2Instances, listS3Buckets, listRDSInstances, listLambdaFunctions, listECSClusters,
  getCosts, listResources, deployResource,
};


