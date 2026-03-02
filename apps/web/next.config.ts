import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile local workspace packages
  transpilePackages: ['@fixfirst/shared-types'],
};

export default nextConfig;
