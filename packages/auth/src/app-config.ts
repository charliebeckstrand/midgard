import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

/*
 * The Next config that each app shares, with no gateway. It reads no
 * environment, so an app with no sign-in, such as elections, imports it with
 * no `BIFROST_URL`. `auth/config` adds the gateway rewrites to it.
 */

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
	// The `'use cache'` handler keeps an entry until it expires, and Next renders
	// a fresh one in the background once the entry is past its revalidate time.
	// Thus a read does not wait for the source of the data (`cache-handler.ts`).
	// The path is the built file beside this one in `dist`.
	cacheHandlers: { default: fileURLToPath(new URL('./cache-handler.js', import.meta.url)) },
}
