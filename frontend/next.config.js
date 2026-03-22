/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // false to avoid double-emit in dev
  webpack: (config) => {
    // Monaco editor uses a lot of workers; let @monaco-editor/react handle loading
    return config;
  },
};

module.exports = nextConfig;
