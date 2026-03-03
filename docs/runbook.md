# FixFirst — Operational Runbook

> **Audience:** On-call engineers and team leads.
> **Last updated:** 2026-03-02

---

## Table of Contents

1. [Infrastructure overview](#infrastructure-overview)
2. [Deployment](#deployment)
3. [Rollback](#rollback)
4. [Database access and migrations](#database-access-and-migrations)
5. [Log viewing](#log-viewing)
6. [Secret rotation](#secret-rotation)
7. [Incident response checklist](#incident-response-checklist)

---

## Infrastructure overview

| Component | AWS service | Region |
|-----------|-------------|--------|
| API (NestJS) | ECS Fargate | ca-central-1 |
| Web (Next.js) | ECS Fargate + CloudFront | ca-central-1 |
| Database | RDS PostgreSQL 15 | ca-central-1 (isolated subnet) |
| File storage | S3 | ca-central-1 |
| Secrets | Secrets Manager | ca-central-1 |
| Logs | CloudWatch Logs | ca-central-1 |
| CI/CD credentials | OIDC (no access keys) | — |

Stack naming convention: `FixFirst-{Name}-{env}` (e.g. `FixFirst-Api-production`).

---

## Deployment

### Automated (normal path)

| Event | Workflow | Target |
|-------|----------|--------|
| Push to `main` | `deploy-staging.yml` | Staging |
| Create `v*` tag | `deploy-prod.yml` (requires approval) | Production |

Monitor progress at **GitHub → Actions**.

### Manual deploy (when CI is unavailable)

Prerequisites: AWS CLI configured with the deploy role (`AWS_DEPLOY_ROLE_ARN_{STAGING|PROD}`), Docker, and Node 22.

```bash
# 1. Authenticate to ECR
aws ecr get-login-password --region ca-central-1 \
  | docker login --username AWS \
    --password-stdin <ACCOUNT_ID>.dkr.ecr.ca-central-1.amazonaws.com

# 2. Build and push API image
REPO=<ACCOUNT_ID>.dkr.ecr.ca-central-1.amazonaws.com/fixfirst-api-production
docker build -t "$REPO:latest" -f apps/api/Dockerfile .
docker push "$REPO:latest"

# 3. Build and push Web image
WEB_REPO=<ACCOUNT_ID>.dkr.ecr.ca-central-1.amazonaws.com/fixfirst-web-production
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fixfirst.ca/api/v1 \
  -t "$WEB_REPO:latest" -f apps/web/Dockerfile .
docker push "$WEB_REPO:latest"

# 4. Run migrations (see §Database access and migrations)

# 5. Deploy CDK stacks
yarn workspace @fixfirst/infra build
npx cdk deploy \
  --context env=production \
  --context certificateArn=<ACM_CERT_ARN> \
  --all --require-approval never
```

---

## Rollback

### ECS service rollback (API or Web)

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix fixfirst-api-production-ApiStackApiTaskDef \
  --sort DESC --query 'taskDefinitionArns[:5]'

# Revert ECS service to a previous revision
aws ecs update-service \
  --cluster FixFirst-Api-production \
  --service FixFirst-Api-production-ApiService \
  --task-definition <PREVIOUS_TASK_DEF_ARN> \
  --force-new-deployment

# Monitor rollout
aws ecs wait services-stable \
  --cluster FixFirst-Api-production \
  --services FixFirst-Api-production-ApiService
```

Replace `production` with `staging` for staging rollbacks.

### Database rollback

Prisma does not support automatic rollback of applied migrations. If a bad migration was applied:

1. Identify the last known-good migration in `apps/api/prisma/migrations/`.
2. Connect to the database (see §Database access).
3. Manually reverse the SQL changes.
4. Remove the migration record from `_prisma_migrations`.
5. Re-run `prisma migrate deploy` to resync state.

> **Caution:** Always take a snapshot before manual database changes in production.

---

## Database access and migrations

### Access via SSM Session Manager (no SSH, no bastion)

The RDS instance is in an isolated subnet with no public endpoint. Access is via an ECS task running in the same VPC.

```bash
# Start a one-off ECS task with a psql shell
aws ecs run-task \
  --cluster FixFirst-Api-production \
  --task-definition <MIGRATE_TASK_DEF_ARN> \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[<PRIVATE_SUBNET_ID>],
    securityGroups=[<API_SG_ID>],
    assignPublicIp=DISABLED
  }" \
  --overrides '{"containerOverrides":[{
    "name":"ApiContainer",
    "command":["sh","-c","psql $DATABASE_URL"]
  }]}'
```

> SSM Session Manager can also be used to exec into a running Fargate task:
> `aws ecs execute-command --cluster FixFirst-Api-production --task <TASK_ARN> --container ApiContainer --interactive --command "/bin/sh"`
> Requires `enableExecuteCommand: true` on the service (not enabled by default — enable before use).

### Running migrations

Migrations are run automatically by the deploy workflow before the ECS service is updated. To run manually:

```bash
aws ecs run-task \
  --cluster FixFirst-Api-production \
  --task-definition <MIGRATE_TASK_DEF_ARN> \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[<PRIVATE_SUBNET_ID>],
    securityGroups=[<API_SG_ID>],
    assignPublicIp=DISABLED
  }" \
  --overrides '{"containerOverrides":[{
    "name":"ApiContainer",
    "command":["node","dist/db/migrate.js"]
  }]}'

# Wait for completion and check exit code
TASK_ARN=<output from above>
aws ecs wait tasks-stopped --cluster FixFirst-Api-production --tasks "$TASK_ARN"
aws ecs describe-tasks --cluster FixFirst-Api-production --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode'
```

---

## Log viewing

### CloudWatch Logs CLI

```bash
# Tail API logs (live)
aws logs tail /ecs/fixfirst-api-production --follow

# Tail Web logs (live)
aws logs tail /ecs/fixfirst-web-production --follow

# Search for errors in the last 1 hour
aws logs filter-log-events \
  --log-group-name /ecs/fixfirst-api-production \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern '"level":"error"'
```

### CloudWatch Logs Insights (console)

1. Open **CloudWatch → Logs Insights**.
2. Select log group `/ecs/fixfirst-api-production`.
3. Run a query such as:

```
fields @timestamp, msg, err.message
| filter level = "error"
| sort @timestamp desc
| limit 50
```

---

## Secret rotation

Application secrets (JWT signing keys, database credentials) are stored in AWS Secrets Manager under `fixfirst/{env}/app-secrets`.

### Rotating JWT signing keys

```bash
# 1. Generate new keys (example — use a secure random generator)
NEW_JWT_SECRET=$(openssl rand -hex 64)
NEW_REFRESH_SECRET=$(openssl rand -hex 64)

# 2. Update the secret in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id fixfirst/production/app-secrets \
  --secret-string "{
    \"jwtSecret\": \"$NEW_JWT_SECRET\",
    \"jwtRefreshSecret\": \"$NEW_REFRESH_SECRET\"
  }"

# 3. Force a new ECS deployment to pick up the updated secret
aws ecs update-service \
  --cluster FixFirst-Api-production \
  --service FixFirst-Api-production-ApiService \
  --force-new-deployment

# 4. Monitor rollout
aws ecs wait services-stable \
  --cluster FixFirst-Api-production \
  --services FixFirst-Api-production-ApiService
```

> Rotating JWT secrets will invalidate all existing refresh tokens. Logged-in users will need to re-authenticate.

### Rotating RDS credentials

RDS credentials are managed by Secrets Manager with a separate secret (auto-generated by CDK). To rotate:

1. In the AWS console, navigate to **Secrets Manager → fixfirst/{env}/db-secret**.
2. Enable automatic rotation (30-day schedule) or trigger an immediate rotation.
3. Force a new ECS deployment after rotation to pick up updated credentials.

---

## Incident response checklist

### Service down (5xx errors or health check failing)

- [ ] Check ALB target group health: **EC2 → Load Balancers → Target Groups**
- [ ] Check ECS service events: `aws ecs describe-services --cluster FixFirst-Api-production --services <SERVICE>`
- [ ] Check container logs: `aws logs tail /ecs/fixfirst-api-production --follow`
- [ ] Check RDS status: **RDS → Databases → fixfirst-production**
- [ ] If a bad deploy: roll back the ECS service (see §Rollback)

### High error rate in logs

- [ ] Search CloudWatch Logs Insights for `level = "error"` in the last 15 minutes
- [ ] Check if a migration failed mid-deploy
- [ ] Check Secrets Manager — are secrets accessible? (IAM permission issue?)
- [ ] Check S3 bucket policy for storage-related errors

### Database connection failures

- [ ] Verify RDS instance is running and has available connections
- [ ] Verify the API security group still allows outbound to the DB security group on port 5432
- [ ] Check `DATABASE_URL` secret is correct and accessible by the ECS task role
- [ ] Check VPC routing — private subnets must have a route to the NAT gateway

### CloudFront returning stale content

- [ ] Invalidate the CloudFront distribution cache:
  ```bash
  aws cloudfront create-invalidation \
    --distribution-id <DISTRIBUTION_ID> \
    --paths "/*"
  ```
