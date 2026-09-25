// The sole reader of `process.env.BIFROST_URL` in the repo (CONVENTIONS.md §11.1);
// every other workspace reaches the gateway origin through this package.

// `next build` writes this origin into the rewrites in `routes-manifest.json`,
// and `next start` serves those rewrites as built. A build without the variable
// therefore shipped rewrites to `localhost`. So each production process throws
// when the variable is unset: the build, its workers, and the server. Outside
// production, the origin falls back to a local gateway.
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
 * Read from `process.env.BIFROST_URL`. Falls back to `http://localhost:4000`
 * outside production. In production an unset value throws at load, for
 * `next build` as well as `next start`, because the build writes the origin
 * into the rewrites.
 */
export const BIFROST_URL = url
