/**
 * Expires each cookie of the document. The locale provider writes the `locale`
 * cookie, and a jsdom window keeps its cookies for each file that a worker
 * runs, so a cookie that one case writes would reach the next case and file.
 * The shared `afterEach` calls it, and a case calls it to start a step with no
 * cookie.
 */
export function clearCookies(): void {
	for (const entry of document.cookie.split('; ')) {
		const name = entry.split('=')[0]

		// biome-ignore lint/suspicious/noDocumentCookie: the reset expires the cookies that a case wrote.
		if (name) document.cookie = `${name}=; max-age=0; path=/`
	}
}
