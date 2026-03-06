/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Required for next/server after() to keep serverless alive post-response
    after: true,
  },
  serverExternalPackages: [
    'puppeteer-core',
    '@sparticuz/chromium-min',
    'lighthouse',
    'chrome-launcher',
  ],
};

module.exports = nextConfig;
