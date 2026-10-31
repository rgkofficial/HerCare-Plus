/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  // The ML model artifact is read from disk at runtime via a path built from
  // process.cwd(), so Next.js cannot trace it automatically. Ship it with the
  // serverless function that needs it.
  outputFileTracingIncludes: {
    '/api/health-risk': ['./ml/artifacts/**'],
  },
};

module.exports = withPWA(nextConfig);
