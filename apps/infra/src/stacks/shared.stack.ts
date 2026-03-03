import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { aws_iam as iam, aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvProps } from '../types';

const GITHUB_REPO = 'HoukasaurusRex/fix-first';

export interface SharedStackProps extends StackProps, EnvProps {
  /** S3 bucket ARN for the assets bucket — grants ECS task role access. */
  assetsBucketArn: string;
}

export class SharedStack extends Stack {
  /** IAM role assumed by GitHub Actions via OIDC (no long-lived keys). */
  readonly githubDeployRole: iam.Role;
  /** IAM role for ECS task execution and app-level permissions. */
  readonly ecsTaskRole: iam.Role;
  /** Secrets Manager secret for app credentials (JWT keys, etc.). */
  readonly appSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props);

    const { deployEnv, assetsBucketArn } = props;

    // ── App secrets (values set manually post-deploy) ─────────────────────────
    this.appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: `fixfirst/${deployEnv}/app-secrets`,
      description: `FixFirst ${deployEnv} application secrets (JWT keys, etc.)`,
    });

    // ── GitHub Actions OIDC ───────────────────────────────────────────────────
    const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    this.githubDeployRole = new iam.Role(this, 'GithubDeployRole', {
      roleName: `FixFirst-GithubDeploy-${deployEnv}`,
      assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${GITHUB_REPO}:*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
      description: 'Assumed by GitHub Actions to deploy FixFirst stacks',
      maxSessionDuration: Duration.hours(1),
    });

    // Permissions needed by GitHub Actions to deploy CDK stacks.
    this.githubDeployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
    );

    // ── ECS Task Role ─────────────────────────────────────────────────────────
    this.ecsTaskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName: `FixFirst-EcsTask-${deployEnv}`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Runtime permissions for FixFirst API ECS tasks',
    });

    // S3: read/write/delete on the assets bucket.
    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
        resources: [`${assetsBucketArn}/*`],
      }),
    );

    // SES: allow sending email.
    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      }),
    );

    // Secrets Manager: allow reading app secrets.
    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [this.appSecret.secretArn],
      }),
    );

    new CfnOutput(this, 'GithubDeployRoleArn', {
      value: this.githubDeployRole.roleArn,
      exportName: `${id}-GithubDeployRoleArn`,
    });
    new CfnOutput(this, 'EcsTaskRoleArn', {
      value: this.ecsTaskRole.roleArn,
      exportName: `${id}-EcsTaskRoleArn`,
    });
    new CfnOutput(this, 'AppSecretArn', {
      value: this.appSecret.secretArn,
      exportName: `${id}-AppSecretArn`,
    });
  }
}
