/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors now fail the build. They were suppressed, which is how a dead
  // preview feature calling undefined functions, a crash on closing the settings
  // modal, and two unread sync settings all survived unnoticed.
  allowedDevOrigins: [
    "localhost:3000",
    "local-origin.dev",
    "*.local-origin.dev",
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
