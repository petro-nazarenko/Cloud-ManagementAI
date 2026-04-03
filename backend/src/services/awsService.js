'use strict';

const AWS = require('aws-sdk');
const logger = require('../utils/logger');

const getEC2Client = (region) =>
  new AWS.EC2({
    region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

const getS3Client = () =>
  new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

const getCostExplorerClient = () =>
  new AWS.CostExplorer({
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

const getRDSClient = (region) =>
  new AWS.RDS({
    region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

const getLambdaClient = (region) =>
  new AWS.Lambda({
    region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

const getECSClient = (region) =>
  new AWS.ECS({
    region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

const getCloudFormationClient = (region) =>
  new AWS.CloudFormation({
    region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

/**
 * List all EC2 instances in the given region (or default region).
 */
const listEC2Instances = async (region) => {
  const ec2 = getEC2Client(region);
  try {
    const data = await ec2.describeInstances().promise();
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
  const s3 = getS3Client();
  try {
    const data = await s3.listBuckets().promise();
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
  const rds = getRDSClient(region);
  try {
    const data = await rds.describeDBInstances().promise();
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
  const lambda = getLambdaClient(region);
  try {
    const functions = [];
    let marker;
    do {
      const data = await lambda.listFunctions({ Marker: marker }).promise();
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
  const ecs = getECSClient(region);
  try {
    const listData = await ecs.listClusters().promise();
    if (!listData.clusterArns || listData.clusterArns.length === 0) return [];
    const data = await ecs.describeClusters({ clusters: listData.clusterArns }).promise();
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
 */
const getCosts = async (startDate, endDate) => {
  const ce = getCostExplorerClient();
  try {
    const data = await ce.getCostAndUsage({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }).promise();
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
  const cf = getCloudFormationClient(config.region);
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
    const data = await cf.createStack(params).promise();
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
