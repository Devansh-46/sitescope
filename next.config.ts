import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Required for next/server after() to work on Vercel
    // after() keeps the serverless function alive after the response is sent
    // so background tasks (like the analysis pipeline) can complete
    after: true,
  },
};

export default nextConfig;
