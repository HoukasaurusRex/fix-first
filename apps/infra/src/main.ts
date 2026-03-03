import { App } from 'aws-cdk-lib';
import type { DeployEnv } from './types';
import { NetworkStack } from './stacks/network.stack';
import { DatabaseStack } from './stacks/database.stack';
import { StorageStack } from './stacks/storage.stack';
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
new DatabaseStack(app, `FixFirst-Database-${deployEnv}`, stackProps);
new StorageStack(app, `FixFirst-Storage-${deployEnv}`, stackProps);
new ApiStack(app, `FixFirst-Api-${deployEnv}`, stackProps);
new WebStack(app, `FixFirst-Web-${deployEnv}`, stackProps);

app.synth();
