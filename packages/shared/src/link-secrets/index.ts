/** The query params of an emailed link that hold a secret. */
const secretParams = ['token'] as const

/** The name of a secret param of an emailed link. */
type LinkSecret = (typeof secretParams)[number]

const secrets = new Map<LinkSecret, string>()

/**
 * Moves each secret param of the address into memory, so that no history
 * entry, no referrer, no bug report, and no state of the router holds the
 * secret. {@link getLinkSecret} gives the value.
 *
 * @remarks
 * Each app calls it at the top of its `instrumentation-client.ts`. That file
 * runs before the page hydrates, and the App Router reads the address when it
 * hydrates. Thus the router never sees the secret. A reload has no secret, and
 * the user opens the link again.
 *
 * A page reads the secret in an event handler, not in the render. A prerender
 * has no query, so the page prerenders.
 */
export function takeLinkSecrets(): void {
	const url = new URL(window.location.href)

	for (const name of secretParams) {
		const value = url.searchParams.get(name)

		if (value === null) continue

		secrets.set(name, value)

		url.searchParams.delete(name)
	}

	if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
}

/**
 * The value of a secret param of the emailed link that opened the page, which
 * {@link takeLinkSecrets} moved out of the address.
 *
 * @param name - The name of the param.
 * @returns The value, or `''` when the link has no such param.
 */
export function getLinkSecret(name: LinkSecret): string {
	return secrets.get(name) ?? ''
}
