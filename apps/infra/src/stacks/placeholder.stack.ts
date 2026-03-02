import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class PlaceholderStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // Actual resources are added in Stage 8 issues.
  }
}
