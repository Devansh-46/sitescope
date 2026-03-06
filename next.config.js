/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'lighthouse',
    'chrome-launcher',
  ],
};

module.exports = nextConfig;
