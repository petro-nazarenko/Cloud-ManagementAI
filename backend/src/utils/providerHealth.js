'use strict';

const logger = require('./logger');

/**
 * Validate that the required environment variables for a cloud provider are set.
 * Returns { configured: boolean, missingVars: string[] }
 */
const checkProviderCredentials = (provider) => {
  const required = {
    aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    azure: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_SUBSCRIPTION_ID'],
    gcp: ['GOOGLE_APPLICATION_CREDENTIALS'],
  };

  const vars = required[provider] || [];
  const missing = vars.filter((v) => !process.env[v]);
  return { configured: missing.length === 0, missingVars: missing };
};

/**
 * Perform a lightweight connectivity test for each configured provider.
 * Returns a map of provider → { status, latencyMs, error }
 */
const healthCheckProviders = async () => {
  const results = {};
  const providers = ['aws', 'azure', 'gcp'];

  for (const provider of providers) {
    const { configured, missingVars } = checkProviderCredentials(provider);
    if (!configured) {
      results[provider] = {
        status: 'unconfigured',
        configured: false,
        missingVars,
      };
      continue;
    }

    const start = Date.now();
    try {
      if (provider === 'aws') {
        const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
        const stsClient = new STSClient({
          region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
          },
        });
        await stsClient.send(new GetCallerIdentityCommand({}));
      } else if (provider === 'azure') {
        const { ClientSecretCredential } = require('@azure/identity');
        const { ResourceManagementClient } = require('@azure/arm-resources');
        const credential = new ClientSecretCredential(
          process.env.AZURE_TENANT_ID,
          process.env.AZURE_CLIENT_ID,
          process.env.AZURE_CLIENT_SECRET
        );
        const client = new ResourceManagementClient(credential, process.env.AZURE_SUBSCRIPTION_ID);
        // List one resource group as a connectivity test
        // eslint-disable-next-line no-unused-vars
        for await (const _ of client.resourceGroups.list()) { break; }
      } else if (provider === 'gcp') {
        const { ProjectsClient } = require('@google-cloud/resource-manager');
        const client = new ProjectsClient();
        await client.searchProjects({ pageSize: 1 });
      }

      results[provider] = { status: 'healthy', configured: true, latencyMs: Date.now() - start };
    } catch (err) {
      logger.warn(`Provider health check failed for ${provider}: ${err.message}`);
      results[provider] = {
        status: 'error',
        configured: true,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  return results;
};

module.exports = { checkProviderCredentials, healthCheckProviders };
