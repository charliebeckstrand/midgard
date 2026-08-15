import states from 'us-atlas/states-10m.json'

/**
 * The US states atlas, served to the map.
 *
 * It rides a route rather than a prop, for its size: 115 kB would land in the RSC
 * payload of every page load, where here the browser caches it and TanStack Query
 * holds the decode it expands to. It is a published atlas and it never changes,
 * so the cache is immutable.
 */

/**
 * Serialised once for the process, not per request.
 *
 * The import is a fixed object, so `Response.json` would run `JSON.stringify`
 * over its ~14k coordinate pairs on every hit — and this response is on the
 * startup path, since the map draws nothing until it lands.
 */
const BODY = JSON.stringify(states)

export function GET() {
	return new Response(BODY, {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'public, max-age=31536000, immutable',
		},
	})
}
