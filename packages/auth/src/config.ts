import type { NextConfig } from 'next'
import { BIFROST_URL } from './env'

export function withAuth(config: NextConfig = {}): NextConfig {
	const userRewrites = config.rewrites

	return {
		...config,
		async rewrites() {
			const authRewrites = [
				{
					source: '/auth/:path*',
					destination: `${BIFROST_URL}/auth/:path*`,
				},
				{
					source: '/api/:path*',
					destination: `${BIFROST_URL}/api/:path*`,
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
