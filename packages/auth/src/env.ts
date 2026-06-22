// The sole reader of `process.env.BIFROST_URL` in the repo (CONVENTIONS.md §11.1);
// every other workspace reaches the gateway origin through this package.

const fallback = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000'

const url = process.env.BIFROST_URL ?? fallback

if (!url) {
	throw new Error('BIFROST_URL is not set')
}

/**
 * Origin of the bifrost gateway, resolved at module load.
 *
 * @remarks
 * Read from `process.env.BIFROST_URL`. Falls back to `http://localhost:4000`
 * outside production; in production an unset value throws at load.
 */
export const BIFROST_URL = url
