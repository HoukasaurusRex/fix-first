import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface StorageStackProps extends StackProps, EnvProps {}

export class StorageStack extends Stack {
  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);
    // S3 bucket, SQS queues — fleshed out in issue #49
  }
}
