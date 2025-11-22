const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack(config, { dev, isServer }) {
    // Otimizações de memória
    config.optimization = {
      ...config.optimization,
      minimize: false, // Desabilitar minificação em dev para economizar memória
    };
    
    if (dev) {
      config.watchOptions = {
        poll: 3000,
        aggregateTimeout: 600,
        ignored: ['**/node_modules', '**/.next'],
      };
      // Reduzir paralelismo para economizar memória
      config.parallelism = 1;
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 5000,
    pagesBufferLength: 1,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
