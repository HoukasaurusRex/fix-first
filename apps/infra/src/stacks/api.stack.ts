import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface ApiStackProps extends StackProps, EnvProps {}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    // ECS Fargate, ALB, ECR repository — fleshed out in issue #50
  }
}
