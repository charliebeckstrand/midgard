import type { NextConfig } from 'next'
import { BIFROST_URL } from './env'

/**
 * Wraps a Next config so `/auth/*` and `/api/*` rewrite to the gateway ({@link BIFROST_URL}).
 *
 * @remarks
 * These rewrites let client code hit same-origin paths while the gateway serves
 * them; session gating is the proxy's job (CONVENTIONS.md §6.3). The gateway
 * rewrites go in the `fallback` phase, which Next checks after every page and
 * route handler of the app, dynamic routes included. Thus a route handler of
 * the app, such as `app/api/places/[id]/route.ts`, answers its own path, and
 * the gateway gets each path that the app does not serve. In `afterFiles`, the
 * `/api/:path*` rewrite would take the dynamic routes before Next matched them.
 *
 * An existing `rewrites` is preserved. The array form stays in `afterFiles`,
 * and the gateway rewrites follow the `fallback` of the object form.
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

			if (!userRewrites) return { fallback: authRewrites }

			const existing = await userRewrites()

			if (Array.isArray(existing)) {
				return { afterFiles: existing, fallback: authRewrites }
			}

			return {
				...existing,
				fallback: [...(existing.fallback ?? []), ...authRewrites],
			}
		},
	}
}
