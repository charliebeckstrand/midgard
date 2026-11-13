/**
 * Takes the token from the `?token=` of an emailed link: it returns the
 * token, and removes it from the address bar. Then no history entry, no
 * referrer, and no bug report holds the token. It returns `''` when the link
 * has none.
 *
 * @internal
 * @remarks
 * Call it in the browser only, after the hydration. A prerender has no query,
 * so a page that reads the query in the render cannot prerender.
 */
export function takeLinkToken(): string {
	const url = new URL(window.location.href)

	const token = url.searchParams.get('token') ?? ''

	if (!token) return ''

	url.searchParams.delete('token')

	// A `null` state lets the App Router copy its own state into the entry
	// and move its URL too. The current state already holds the mark of the
	// router, and with it the router skips its sync and later writes the
	// token back.
	window.history.replaceState(null, '', url)

	return token
}
