import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_rds as rds, aws_s3 as s3 } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvProps } from '../types';

export interface DataStackProps extends StackProps, EnvProps {
  /** VPC from NetworkStack — database runs in isolated subnets. */
  vpc: ec2.IVpc;
  /** Security group that restricts database access to API tasks only. */
  dbSg: ec2.ISecurityGroup;
}

export class DataStack extends Stack {
  /** RDS PostgreSQL instance. */
  readonly db: rds.DatabaseInstance;
  /** Auto-generated credentials stored in Secrets Manager. */
  readonly dbSecret: rds.DatabaseInstance['secret'];
  /** S3 bucket for receipt and asset storage. */
  readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { deployEnv, vpc, dbSg } = props;
    const isProduction = deployEnv === 'production';

    // ── RDS PostgreSQL 15 ────────────────────────────────────────────────────

    this.db = new rds.DatabaseInstance(this, 'Db', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        isProduction ? ec2.InstanceSize.SMALL : ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      databaseName: 'fixfirst',
      multiAz: isProduction,
      deletionProtection: isProduction,
      backupRetention: Duration.days(isProduction ? 14 : 3),
      autoMinorVersionUpgrade: true,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.dbSecret = this.db.secret;

    // ── S3 Assets Bucket ─────────────────────────────────────────────────────

    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      lifecycleRules: [
        {
          id: 'receipts-to-glacier',
          prefix: 'receipts/',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(365),
            },
          ],
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: isProduction
            ? ['https://fixfirst.ca']
            : ['http://localhost:3000', 'https://staging.fixfirst.ca'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
        },
      ],
    });

    new CfnOutput(this, 'DbEndpoint', {
      value: this.db.instanceEndpoint.hostname,
      exportName: `${id}-DbEndpoint`,
    });
    new CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      exportName: `${id}-AssetsBucketName`,
    });
  }
}
