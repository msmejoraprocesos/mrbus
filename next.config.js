/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    // Allow local images in public folder
    unoptimized: false,
  },
}

module.exports = nextConfig
