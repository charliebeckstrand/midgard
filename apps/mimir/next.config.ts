import type { NextConfig } from 'next'

const config: NextConfig = {
	async rewrites() {
		const bifrostUrl = process.env.BIFROST_URL || 'http://localhost:4000'

		return [
			{
				source: '/auth/:path*',
				destination: `${bifrostUrl}/auth/:path*`,
			},
			{
				source: '/api/:path*',
				destination: `${bifrostUrl}/api/:path*`,
			},
		]
	},
}

export default config
