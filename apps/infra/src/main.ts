import { App } from 'aws-cdk-lib';
import { PlaceholderStack } from './stacks/placeholder.stack';

const app = new App();

new PlaceholderStack(app, 'FixFirstStagingStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'ca-central-1' },
});

new PlaceholderStack(app, 'FixFirstProdStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'ca-central-1' },
});

app.synth();
