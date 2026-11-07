import type { NextConfig } from 'next'
import { BIFROST_URL } from './env'

/** Options for {@link withAuth}. */
export type WithAuthOptions = {
	/**
	 * Also rewrite `/api/*` to the gateway, for an app that reads or writes its
	 * data through the gateway API. Each app of the repository turns it on. Then
	 * the app serves each path of the gateway API on its origin, the admin routes
	 * included. Off by default, so an app that only signs users in serves no
	 * gateway API.
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
 * The Next config that each app of the repository shares. Pass it to
 * {@link withAuth}, or spread it into a config that adds keys of its own.
 */
export const appConfig: NextConfig = {
	devIndicators: false,
	// `next build` writes a self-contained server into `.next/standalone`, with
	// the dependencies that it traces. The Dockerfile at the repository root
	// copies that server into the image that App Platform runs.
	output: 'standalone',
	// When `next dev` finds a coding agent, it writes an `AGENTS.md` and a
	// `CLAUDE.md` into the app. The agent rules of the repository are in the
	// root `CLAUDE.md`, so the app keeps no second copy.
	agentRules: false,
	// The React Compiler memoizes each component and hook of the app, and of the
	// `ui` source it imports. `ui` runs its tests compiled (`test:compiler`), and
	// its grid reads the table engine through one boundary (CONVENTIONS §10.7).
	reactCompiler: true,
	// Cache Components prerenders a static shell for each route, and Partial
	// Prefetching sends it to a link before the click. Together they give an
	// instant navigation to a route whose request reads sit in `<Suspense>`.
	cacheComponents: true,
	partialPrefetching: true,
}

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
 * the app, such as `app/api/scoreboard/[season]/[week]/route.ts` in picks,
 * answers its own path, and the gateway gets each path that the app does not
 * serve. In `afterFiles`, the `/api/:path*` rewrite would take the dynamic
 * routes before Next matched them.
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
			const existing = (await userHeaders?.()) ?? []

			return [{ source: '/:path*', headers: securityHeaders }, ...existing]
		},
		async rewrites() {
			const apiRewrites = gatewayApi
				? [{ source: '/api/:path*', destination: `${BIFROST_URL}/api/:path*` }]
				: []

			const authRewrites = [
				{
					source: '/auth/:path*',
					destination: `${BIFROST_URL}/auth/:path*`,
				},
				...apiRewrites,
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
