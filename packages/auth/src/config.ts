import type { NextConfig } from 'next'
import { BIFROST_URL } from './env'

/** Options for {@link withAuth}. */
export type WithAuthOptions = {
	/**
	 * Also rewrite `/api/*` to the gateway, for an app that manages users through
	 * its API (admin). Off by default, so an app that only signs users in never
	 * serves the gateway's admin API on its origin.
	 */
	gatewayApi?: boolean
}

/**
 * Headers every page and route of the app sends: no framing by any site, HTTPS
 * only, no content-type sniffing, and no path or query (such as an emailed
 * link's token) in the `Referer` sent to other sites.
 */
export const securityHeaders = [
	{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Strict-Transport-Security', value: 'max-age=63072000' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'same-origin' },
]

/**
 * Wraps a Next config so `/auth/*` rewrites to the gateway ({@link BIFROST_URL}),
 * and `/api/*` too with `gatewayApi`, and every response carries
 * {@link securityHeaders}.
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
 * and the gateway rewrites follow the `fallback` of the object form. An
 * existing `headers` is kept after the security headers.
 *
 * @param config - The base Next config to extend.
 * @param options - See {@link WithAuthOptions}.
 * @returns The config with the gateway rewrites and security headers merged in.
 */
export function withAuth(
	config: NextConfig = {},
	{ gatewayApi = false }: WithAuthOptions = {},
): NextConfig {
	const userRewrites = config.rewrites

	const userHeaders = config.headers

	return {
		...config,
		async headers() {
			return [{ source: '/:path*', headers: securityHeaders }, ...((await userHeaders?.()) ?? [])]
		},
		async rewrites() {
			const authRewrites = [
				{
					source: '/auth/:path*',
					destination: `${BIFROST_URL}/auth/:path*`,
				},
				...(gatewayApi
					? [{ source: '/api/:path*', destination: `${BIFROST_URL}/api/:path*` }]
					: []),
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
