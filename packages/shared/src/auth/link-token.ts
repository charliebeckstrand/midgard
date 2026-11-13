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

	window.history.replaceState(window.history.state, '', url)

	return token
}
