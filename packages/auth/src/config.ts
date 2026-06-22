import type { NextConfig } from 'next'
import { BIFROST_URL } from './env'

/**
 * Wraps a Next config so `/auth/*` and `/api/*` rewrite to the gateway ({@link BIFROST_URL}).
 *
 * @remarks
 * These rewrites let client code hit same-origin paths while the gateway serves
 * them; session gating is the proxy's job (CONVENTIONS.md §6.3). An existing
 * `rewrites` is preserved: an array form is concatenated, the object form
 * appends to its `fallback`.
 *
 * @param config - The base Next config to extend.
 * @returns The config with the gateway rewrites merged in.
 */
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
