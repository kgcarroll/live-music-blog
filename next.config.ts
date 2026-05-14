import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './src/sanity/lib/sanityImageLoader.ts',
    remotePatterns: [
      {protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**'},
    ],
  },
}

export default nextConfig
