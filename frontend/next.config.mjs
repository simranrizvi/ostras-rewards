const apiProxy = process.env.API_PROXY_URL?.replace(/\/$/, '');
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return apiProxy
      ? [{ source: '/api/:path*', destination: `${apiProxy}/api/:path*` }]
      : [];
  },
};
export default nextConfig;
