// The only reader of `BIFROST_URL` and `CLIENT_IP_SECRET` in the repository (CONVENTIONS.md §11.1).
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
 * Returns the secret that the gateway requires before it uses the browser address that the proxy sends.
 *
 * @remarks
 * Read from `process.env.CLIENT_IP_SECRET`. The gateway holds the same value.
 * In production, an unset value throws, so a lost secret stops the app and does
 * not put all browsers in one rate-limit bucket. Outside production, an unset
 * value sends no browser address. A function, not a constant, because `next
 * build` loads this module and the build does not get the secret.
 *
 * @internal
 */
export function clientIpSecret(): string | undefined {
	const secret = process.env.CLIENT_IP_SECRET || undefined

	if (!secret && process.env.NODE_ENV === 'production') {
		throw new Error('CLIENT_IP_SECRET is not set: the gateway needs it to rate-limit by browser')
	}

	return secret
}
