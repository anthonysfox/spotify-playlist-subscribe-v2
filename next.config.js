/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    "localhost:3000",
    "local-origin.dev",
    "*.local-origin.dev",
  ],
};

module.exports = nextConfig;
