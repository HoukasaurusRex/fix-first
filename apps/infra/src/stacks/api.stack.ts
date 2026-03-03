import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import type { aws_iam as iam, aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import {
  aws_certificatemanager as acm,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_ecs as ecs,
  aws_elasticloadbalancingv2 as elbv2,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface ApiStackProps extends StackProps, EnvProps {
  vpc: ec2.IVpc;
  albSg: ec2.ISecurityGroup;
  apiSg: ec2.ISecurityGroup;
  ecsTaskRole: iam.IRole;
  appSecret: secretsmanager.ISecret;
  dbSecret: secretsmanager.ISecret;
  /** ACM certificate ARN for the ALB HTTPS listener. */
  certificateArn: string;
}

export class ApiStack extends Stack {
  readonly ecrRepo: ecr.Repository;
  readonly fargateService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { deployEnv, vpc, albSg, apiSg, ecsTaskRole, appSecret, dbSecret, certificateArn } =
      props;
    const isProduction = deployEnv === 'production';

    // ── ECR Repository ────────────────────────────────────────────────────────
    this.ecrRepo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: `fixfirst-api-${deployEnv}`,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10, description: 'Retain last 10 images' }],
    });

    // ── ECS Cluster ───────────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, 'ApiCluster', {
      vpc,
      clusterName: `FixFirst-Api-${deployEnv}`,
    });

    // ── Task Definition ───────────────────────────────────────────────────────
    const taskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole: ecsTaskRole,
    });

    taskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepo, 'latest'),
      portMappings: [{ containerPort: 3001 }],
      environment: {
        NODE_ENV: isProduction ? 'production' : 'staging',
        PORT: '3001',
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret, 'url'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'jwtSecret'),
        JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'jwtRefreshSecret'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3001/api/v1/health || exit 1'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        startPeriod: Duration.seconds(15),
        retries: 3,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: `fixfirst-api-${deployEnv}` }),
    });

    // ── Fargate Service ───────────────────────────────────────────────────────
    this.fargateService = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: isProduction ? 2 : 1,
      minHealthyPercent: 100,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [apiSg],
      assignPublicIp: false,
    });

    // ── Application Load Balancer ─────────────────────────────────────────────
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
      loadBalancerName: `FixFirst-Api-${deployEnv}`,
    });

    // HTTP → HTTPS redirect
    alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        port: '443',
        protocol: 'HTTPS',
        permanent: true,
      }),
    });

    // HTTPS listener — API is the sole target so it serves as the default.
    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      certificates: [acm.Certificate.fromCertificateArn(this, 'Cert', certificateArn)],
    });

    httpsListener.addTargets('ApiTarget', {
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.fargateService],
      healthCheck: {
        path: '/api/v1/health',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: Duration.seconds(30),
    });

    new CfnOutput(this, 'AlbDnsName', {
      value: alb.loadBalancerDnsName,
      exportName: `${id}-AlbDnsName`,
    });
    new CfnOutput(this, 'EcrRepoUri', {
      value: this.ecrRepo.repositoryUri,
      exportName: `${id}-EcrRepoUri`,
    });
  }
}
