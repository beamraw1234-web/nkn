const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  },
  turbopack: {}, // Add empty turbopack config to silence warning
  webpack: (config, { dev, isServer }) => {
    // Disable Turbopack for build
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }
    return config;
  },
  // Disable Turbopack completely to avoid conflicts with webpack config
  transpilePackages: [],
};

export default nextConfig;
