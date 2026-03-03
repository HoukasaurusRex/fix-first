import { Construct } from 'constructs';
import type { aws_ec2 as ec2, aws_ecs as ecs } from 'aws-cdk-lib';

export interface FargateServiceProps {
  /** VPC in which the service runs. */
  vpc: ec2.IVpc;
  /** ECS cluster that hosts the service. */
  cluster: ecs.ICluster;
  /** Container image to run. */
  containerImage: ecs.ContainerImage;
  /** vCPU units (default 256 = 0.25 vCPU). */
  cpu?: number;
  /** Memory in MiB (default 512). */
  memoryLimitMiB?: number;
  /** Number of running tasks (default 1). */
  desiredCount?: number;
  /** Port the container listens on (default 3000). */
  containerPort?: number;
  /** Environment variables injected into the container. */
  environment?: Record<string, string>;
}

/**
 * Reusable construct that wraps an ECS Fargate task + ALB listener rule.
 * Fleshed out in ApiStack (#50) and WebStack (#51).
 */
export class FargateService extends Construct {
  constructor(scope: Construct, id: string, props: FargateServiceProps) {
    super(scope, id);
    // Resource definitions added in issues #50 and #51.
    void props;
  }
}
