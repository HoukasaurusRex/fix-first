import { App } from 'aws-cdk-lib';
import type { DeployEnv } from './types';
import { NetworkStack } from './stacks/network.stack';
import { DataStack } from './stacks/data.stack';
import { SharedStack } from './stacks/shared.stack';
import { ApiStack } from './stacks/api.stack';
import { WebStack } from './stacks/web.stack';

const app = new App();

// Read environment from CDK context: cdk synth --context env=staging|production
const rawEnv = app.node.tryGetContext('env') as string | undefined;
const deployEnv: DeployEnv = rawEnv === 'production' ? 'production' : 'staging';

const awsEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'ca-central-1',
};

const stackProps = { env: awsEnv, deployEnv };

// Each stack is named FixFirst-{Name}-{env} for clear environment separation.
const networkStack = new NetworkStack(app, `FixFirst-Network-${deployEnv}`, stackProps);
const dataStack = new DataStack(app, `FixFirst-Data-${deployEnv}`, {
  ...stackProps,
  vpc: networkStack.vpc,
  dbSg: networkStack.dbSg,
});
dataStack.addDependency(networkStack);
const sharedStack = new SharedStack(app, `FixFirst-Shared-${deployEnv}`, {
  ...stackProps,
  assetsBucketArn: dataStack.assetsBucket.bucketArn,
});
sharedStack.addDependency(dataStack);

// ACM certificate ARNs must be provided via CDK context (created manually in ACM first).
// Example: cdk synth --context env=staging --context certificateArn=arn:aws:acm:...
const certificateArn = (app.node.tryGetContext('certificateArn') as string | undefined) ?? '';

const apiStack = new ApiStack(app, `FixFirst-Api-${deployEnv}`, {
  ...stackProps,
  vpc: networkStack.vpc,
  albSg: networkStack.albSg,
  apiSg: networkStack.apiSg,
  ecsTaskRole: sharedStack.ecsTaskRole,
  appSecret: sharedStack.appSecret,
  dbSecret: dataStack.dbSecret!,
  certificateArn,
});
apiStack.addDependency(sharedStack);

const apiAlbDns = apiStack.fargateService.cluster.clusterName; // placeholder — real URL is post-deploy
const apiUrl =
  deployEnv === 'production'
    ? 'https://api.fixfirst.ca/api/v1'
    : 'https://staging-api.fixfirst.ca/api/v1';

const webStack = new WebStack(app, `FixFirst-Web-${deployEnv}`, {
  ...stackProps,
  vpc: networkStack.vpc,
  albSg: networkStack.albSg,
  ecsTaskRole: sharedStack.ecsTaskRole,
  apiUrl,
});
webStack.addDependency(sharedStack);
void apiAlbDns; // referenced to preserve compile-time check

app.synth();
