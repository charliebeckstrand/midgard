import countries from 'world-atlas/countries-110m.json'

/**
 * The world countries atlas, served to the map.
 *
 * It rides a route rather than a prop, for its size: 108 kB would land in the
 * RSC payload of every page load, where here the browser caches it and TanStack
 * Query holds the decode it expands to. It is a published atlas and it never
 * changes, so the cache is immutable.
 *
 * The 110m cut, which is the coarsest the package ships. The map draws every
 * country in one frame at that size, and the finer cuts buy detail no frame
 * showing the whole world can resolve — at 1.4 MB for 50m.
 */

/**
 * Serialised once for the process, not per request. The import is a fixed
 * object, so `Response.json` would run `JSON.stringify` over it on every hit.
 */
const BODY = JSON.stringify(countries)

export function GET() {
	return new Response(BODY, {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'public, max-age=31536000, immutable',
		},
	})
}
