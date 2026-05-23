import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [{source: '/schedule', destination: '/events', permanent: true}]
  },
  images: {
    loader: 'custom',
    loaderFile: './src/sanity/lib/sanityImageLoader.ts',
    remotePatterns: [
      {protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**'},
    ],
  },
}

export default nextConfig
