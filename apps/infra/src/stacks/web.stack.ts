import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface WebStackProps extends StackProps, EnvProps {}

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    // Next.js SSR on ECS Fargate behind CloudFront — fleshed out in issue #51
  }
}
