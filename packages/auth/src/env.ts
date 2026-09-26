// The only reader of `BIFROST_URL` and `PROXY_SECRET` in the repository (CONVENTIONS.md §11.1).
// The other workspaces get these values through this package.

const fallback = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000'

const url = process.env.BIFROST_URL ?? fallback

if (!url) {
	throw new Error(
		'BIFROST_URL is not set: `next build` writes the gateway origin into the rewrites, and `next start` reads it',
	)
}

// `localhost:4000` parses as a URL with the scheme `localhost:`, so check the scheme too.
const protocol = URL.parse(url)?.protocol

if (protocol !== 'http:' && protocol !== 'https:') {
	throw new Error(
		'BIFROST_URL is not an absolute http or https URL, such as `http://localhost:4000`',
	)
}

/**
 * Origin of the bifrost gateway, resolved at module load.
 *
 * @remarks
 * Read from `process.env.BIFROST_URL`. Outside production, it falls back to
 * `http://localhost:4000`. In production, an unset value throws at load. `next
 * build` writes the origin into the rewrites, and `next start` serves them as
 * built, so the build and the server both need the value.
 *
 * A value that is not an absolute http or https URL throws at load. The value
 * has no trailing slash, so a gateway path such as `/auth/session` appends to it.
 *
 * @internal
 */
export const BIFROST_URL = url.replace(/\/+$/, '')

/**
 * Secret that the gateway requires before it uses the client address that the proxy sends.
 *
 * @remarks
 * Read from `process.env.PROXY_SECRET` at run time. The gateway holds the same
 * value. When it is not set, the proxy sends no client address, and the gateway
 * uses the address of the app.
 *
 * @internal
 */
export const PROXY_SECRET = process.env.PROXY_SECRET || undefined
