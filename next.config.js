/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // Disable cache to avoid Cloudflare's 25MB file limit
    config.cache = false;
    return config;
  },
};

module.exports = nextConfig;
