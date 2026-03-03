import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface DatabaseStackProps extends StackProps, EnvProps {}

export class DatabaseStack extends Stack {
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    // RDS Aurora PostgreSQL Serverless v2 — fleshed out in issue #47
  }
}
