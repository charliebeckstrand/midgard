/**
 * The value of the cookie `name` in `cookies`, or `undefined` with no such
 * cookie or with a value that does not decode. With no `cookies`, it reads the
 * cookies of this page, so the call is in the browser only. A server gives the
 * `Cookie` header of the request.
 *
 * @internal
 */
export function readCookie(name: string, cookies: string = document.cookie): string | undefined {
	const prefix = `${name}=`

	const entry = cookies
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix))

	if (entry === undefined) return undefined

	try {
		return decodeURIComponent(entry.slice(prefix.length))
	} catch {
		return undefined
	}
}

/**
 * Writes the cookie `name` for each path of the site, for `maxAge` seconds. The
 * browser sends it with each request to the site, so a server can read it. The
 * cookie is `secure` on HTTPS. Call it in the browser only.
 *
 * @internal
 */
export function writeCookie(name: string, value: string, maxAge: number) {
	const secure = location.protocol === 'https:' ? '; secure' : ''

	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is above the browser floor.
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax${secure}`
}
