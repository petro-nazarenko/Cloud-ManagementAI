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
  const [instances, buckets] = await Promise.all([
    listEC2Instances(query.region),
    listS3Buckets(),
  ]);
  return [
    ...instances.map((i) => ({ ...i, provider: 'aws', resourceType: 'ec2' })),
    ...buckets.map((b) => ({ ...b, provider: 'aws', resourceType: 's3' })),
  ];
};

/**
 * Deploy a resource (stubbed — real implementation would call CloudFormation / SDK).
 */
const deployResource = async (config) => {
  logger.info(`AWS deploy requested: ${JSON.stringify(config)}`);
  return {
    deploymentId: `aws-deploy-${Date.now()}`,
    status: 'initiated',
    provider: 'aws',
    config,
  };
};

module.exports = { listEC2Instances, listS3Buckets, getCosts, listResources, deployResource };
