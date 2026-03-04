/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'puppeteer-core',
      '@sparticuz/chromium',
      'lighthouse',
      'chrome-launcher',
    ],
  },
};

module.exports = nextConfig;
