export type DeployEnv = 'staging' | 'production';

export interface EnvProps {
  deployEnv: DeployEnv;
}
