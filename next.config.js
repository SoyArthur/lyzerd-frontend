/** @type {import('next').NextConfig} */
const nextConfig = {
  // ═══════════════════════════════════════════
  // IPFS/STATIC EXPORT — Fleek compatible
  // ═══════════════════════════════════════════
  output: 'export',       // genera /out con HTML/CSS/JS puro
  trailingSlash: true,    // /login → /login/index.html (necesario en IPFS)
  images: {
    unoptimized: true,    // sin servidor de optimización de imágenes
  },

  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
