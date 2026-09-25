// The only reader of `process.env.BIFROST_URL` in the repository (CONVENTIONS.md §11.1).
// The other workspaces get the gateway origin through this package.

const fallback = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000'

const url = process.env.BIFROST_URL ?? fallback

if (!url) {
	throw new Error(
		'BIFROST_URL is not set: `next build` writes the gateway origin into the rewrites, and `next start` reads it',
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
 * @internal
 */
export const BIFROST_URL = url
