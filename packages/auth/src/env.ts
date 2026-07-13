// The sole reader of `process.env.BIFROST_URL` in the repo (CONVENTIONS.md §11.1);
// every other workspace reaches the gateway origin through this package.

// `next build` only bakes this origin into the rewrite/fetch URL strings; it never
// reaches the gateway, so a missing value there falls back rather than throwing.
// The build evaluates this module across three process contexts — the CLI (`next
// build`), the compile worker (`NEXT_PRIVATE_BUILD_WORKER`), and the page-data
// workers (`NEXT_PHASE=phase-production-build`) — none of which are present when
// `next start` serves production traffic, where hitting the gateway genuinely
// requires a configured origin and the throw below must still fire.
const isNextBuild =
	process.env.NEXT_PHASE === 'phase-production-build' ||
	process.env.NEXT_PRIVATE_BUILD_WORKER === '1' ||
	(process.argv[1]?.endsWith('/next/dist/bin/next') === true && process.argv[2] === 'build')

const fallback =
	process.env.NODE_ENV === 'production' && !isNextBuild ? undefined : 'http://localhost:4000'

const url = process.env.BIFROST_URL ?? fallback

if (!url) {
	throw new Error('BIFROST_URL is not set')
}

/**
 * Origin of the bifrost gateway, resolved at module load.
 *
 * @remarks
 * Read from `process.env.BIFROST_URL`. Falls back to `http://localhost:4000`
 * outside production and during `next build` (which only bakes the URL string,
 * never reaching the gateway); at production runtime an unset value throws at load.
 */
export const BIFROST_URL = url
