/**
 * The value of the cookie `name` in this page, or `undefined` with no such
 * cookie. Call it in the browser only.
 */
export function readCookie(name: string): string | undefined {
	const prefix = `${name}=`

	const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix))

	return entry === undefined ? undefined : decodeURIComponent(entry.slice(prefix.length))
}

/**
 * Writes the cookie `name` for each path of the site, for `maxAge` seconds. The
 * browser sends it with each request to the site, so a server can read it. The
 * cookie is `secure` on HTTPS. Call it in the browser only.
 */
export function writeCookie(name: string, value: string, maxAge: number) {
	const secure = location.protocol === 'https:' ? '; secure' : ''

	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is above the browser floor.
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax${secure}`
}
