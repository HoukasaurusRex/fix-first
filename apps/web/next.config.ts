import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile local workspace packages
  transpilePackages: ['@fixfirst/shared-types'],
  // Standalone output for Docker/ECS deployment
  output: 'standalone',
};

export default nextConfig;
