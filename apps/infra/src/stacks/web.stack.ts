import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_ecs as ecs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface WebStackProps extends StackProps, EnvProps {
  vpc: ec2.IVpc;
  albSg: ec2.ISecurityGroup;
  ecsTaskRole: iam.IRole;
  /** URL of the NestJS API for server-side requests. */
  apiUrl: string;
}

export class WebStack extends Stack {
  readonly ecrRepo: ecr.Repository;
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { deployEnv, vpc, albSg, ecsTaskRole, apiUrl } = props;
    const isProduction = deployEnv === 'production';

    // ── ECR Repository ────────────────────────────────────────────────────────
    this.ecrRepo = new ecr.Repository(this, 'WebRepo', {
      repositoryName: `fixfirst-web-${deployEnv}`,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10, description: 'Retain last 10 images' }],
    });

    // ── Web security group — only allows inbound from ALB ─────────────────────
    const webSg = new ec2.SecurityGroup(this, 'WebSg', {
      vpc,
      description: 'Web ECS tasks — inbound 3000 from ALB only',
      allowAllOutbound: true,
    });
    webSg.addIngressRule(albSg, ec2.Port.tcp(3000), 'Next.js port from ALB');

    // ── ECS Cluster + Task ────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, 'WebCluster', {
      vpc,
      clusterName: `FixFirst-Web-${deployEnv}`,
    });

    const taskDef = new ecs.FargateTaskDefinition(this, 'WebTaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole: ecsTaskRole,
    });

    taskDef.addContainer('WebContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepo, 'latest'),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: isProduction ? 'production' : 'staging',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: apiUrl,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3000/ || exit 1'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        startPeriod: Duration.seconds(20),
        retries: 3,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: `fixfirst-web-${deployEnv}` }),
    });

    const fargateService = new ecs.FargateService(this, 'WebService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: isProduction ? 2 : 1,
      minHealthyPercent: 100,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [webSg],
      assignPublicIp: false,
    });

    // ── ALB ───────────────────────────────────────────────────────────────────
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
      loadBalancerName: `FixFirst-Web-${deployEnv}`,
    });

    const httpListener = alb.addListener('HttpListener', {
      port: 80,
    });

    httpListener.addTargets('WebTarget', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [fargateService],
      healthCheck: {
        path: '/',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: Duration.seconds(30),
    });

    // ── CloudFront Distribution ───────────────────────────────────────────────
    this.distribution = new cloudfront.Distribution(this, 'Cdn', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(alb, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      additionalBehaviors: {
        // Cache Next.js static assets for 1 year (immutable content-addressed files)
        '/_next/static/*': {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
            defaultTtl: Duration.days(365),
            maxTtl: Duration.days(365),
            minTtl: Duration.days(365),
          }),
        },
      },
      comment: `FixFirst Web CDN — ${deployEnv}`,
    });

    new CfnOutput(this, 'CloudFrontDomain', {
      value: this.distribution.distributionDomainName,
      exportName: `${id}-CloudFrontDomain`,
    });
    new CfnOutput(this, 'WebEcrRepoUri', {
      value: this.ecrRepo.repositoryUri,
      exportName: `${id}-WebEcrRepoUri`,
    });
  }
}
