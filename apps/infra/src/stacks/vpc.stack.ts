import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface VpcStackProps extends StackProps, EnvProps {}

export class VpcStack extends Stack {
  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);
    // VPC, subnets, NAT gateways — fleshed out in issue #48
  }
}
