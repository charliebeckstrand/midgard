/**
 * The token from the `?token=` of an emailed link, or `''` when the link has none.
 *
 * @internal
 * @remarks
 * Call it in an event handler only. A prerender has no query, so a page that
 * reads the query in the render cannot prerender.
 */
export function linkToken(): string {
	return new URLSearchParams(window.location.search).get('token') ?? ''
}
