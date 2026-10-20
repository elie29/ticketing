module.exports = {
  async rewrites() {
    return [
      ['/api/users/:path*', process.env.AUTH_API_URL],
      ['/api/orders/:path*', process.env.ORDERS_API_URL],
      ['/api/tickets/:path*', process.env.TICKETS_API_URL],
    ]
      .filter(([, baseURL]) => baseURL)
      .map(([source, baseURL]) => ({
        source,
        destination: `${baseURL}${source}`,
      }));
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = { ...config.watchOptions, poll: 300 };
    }
    return config;
  },
};
