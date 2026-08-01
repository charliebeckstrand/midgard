/**
 * The runtime's own BCP 47 tag, resolved once. `Intl.DateTimeFormat`
 * construction is uncached and costs tens of microseconds, and the document's
 * locale cannot change for the page's lifetime, so a per-call read is pure
 * waste on the render paths that coalesce an absent locale.
 *
 * @internal
 */
let runtimeLocale: string | undefined

/**
 * Coalesces an optional locale to a concrete BCP 47 tag, falling back to the
 * runtime default — the `Intl`-backed helpers require a string.
 *
 * @param locale - An explicit tag, or `undefined` to take the runtime's.
 * @returns The resolved tag.
 */
export function resolveLocale(locale?: string): string {
	if (locale) return locale

	runtimeLocale ??= new Intl.DateTimeFormat().resolvedOptions().locale

	return runtimeLocale
}
