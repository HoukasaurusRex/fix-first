import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface NetworkStackProps extends StackProps, EnvProps {}

export class NetworkStack extends Stack {
  /** The VPC shared by all other stacks. */
  readonly vpc: ec2.Vpc;
  /** Security group for the Application Load Balancer. */
  readonly albSg: ec2.SecurityGroup;
  /** Security group for the API ECS tasks. */
  readonly apiSg: ec2.SecurityGroup;
  /** Security group for the RDS database. */
  readonly dbSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { deployEnv } = props;

    // Production uses 2 NAT gateways for high availability; staging uses 1 to reduce cost.
    const natGateways = deployEnv === 'production' ? 2 : 1;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28,
        },
      ],
    });

    // ALB security group: inbound HTTP and HTTPS from the internet.
    this.albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc: this.vpc,
      description: 'ALB — inbound 80 and 443 from internet',
      allowAllOutbound: true,
    });
    this.albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP from internet');
    this.albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS from internet');

    // API security group: inbound on app port only from the ALB.
    this.apiSg = new ec2.SecurityGroup(this, 'ApiSg', {
      vpc: this.vpc,
      description: 'API ECS tasks — inbound 3001 from ALB only',
      allowAllOutbound: true,
    });
    this.apiSg.addIngressRule(this.albSg, ec2.Port.tcp(3001), 'API port from ALB');

    // Database security group: inbound PostgreSQL only from the API.
    this.dbSg = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: this.vpc,
      description: 'RDS — inbound 5432 from API SG only',
      allowAllOutbound: false,
    });
    this.dbSg.addIngressRule(this.apiSg, ec2.Port.tcp(5432), 'PostgreSQL from API SG');

    // Export identifiers for cross-stack references.
    new CfnOutput(this, 'VpcId', { value: this.vpc.vpcId, exportName: `${id}-VpcId` });
    new CfnOutput(this, 'AlbSgId', {
      value: this.albSg.securityGroupId,
      exportName: `${id}-AlbSgId`,
    });
    new CfnOutput(this, 'ApiSgId', {
      value: this.apiSg.securityGroupId,
      exportName: `${id}-ApiSgId`,
    });
    new CfnOutput(this, 'DbSgId', { value: this.dbSg.securityGroupId, exportName: `${id}-DbSgId` });
  }
}
