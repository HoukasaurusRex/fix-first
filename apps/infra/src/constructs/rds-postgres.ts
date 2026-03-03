import { Construct } from 'constructs';
import type { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface RdsPostgresProps {
  /** VPC in which the database cluster runs. */
  vpc: ec2.IVpc;
  /** Initial database name. */
  databaseName: string;
  /** Serverless v2 minimum ACU capacity (default 0.5). */
  minCapacity?: number;
  /** Serverless v2 maximum ACU capacity (default 4). */
  maxCapacity?: number;
  /** Deletion protection — recommended true for production. */
  deletionProtection?: boolean;
}

/**
 * Reusable construct for RDS Aurora PostgreSQL Serverless v2.
 * Fleshed out in DatabaseStack (#47).
 */
export class RdsPostgres extends Construct {
  constructor(scope: Construct, id: string, props: RdsPostgresProps) {
    super(scope, id);
    // Resource definitions added in issue #47.
    void props;
  }
}
