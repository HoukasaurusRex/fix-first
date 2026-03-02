import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile local workspace packages
  transpilePackages: ['@warranty-tool/shared-types'],
};

export default nextConfig;
