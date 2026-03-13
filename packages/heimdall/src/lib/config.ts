import type { NextConfig } from 'next'

export function withAuth(config: NextConfig = {}): NextConfig {
	const userRewrites = config.rewrites

	return {
		...config,
		async rewrites() {
			const bifrostUrl = process.env.BIFROST_URL || 'http://localhost:4000'

			const authRewrites = [
				{
					source: '/auth/:path*',
					destination: `${bifrostUrl}/auth/:path*`,
				},
				{
					source: '/api/:path*',
					destination: `${bifrostUrl}/api/:path*`,
				},
			]

			if (!userRewrites) return authRewrites

			const existing = await userRewrites()

			if (Array.isArray(existing)) {
				return [...existing, ...authRewrites]
			}

			return {
				...existing,
				fallback: [...(existing.fallback || []), ...authRewrites],
			}
		},
	}
}
