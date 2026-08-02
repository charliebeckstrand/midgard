import { once } from './once'

/**
 * The runtime's own BCP 47 tag. Read through {@link once} because
 * `Intl.DateTimeFormat` construction is uncached and costs tens of microseconds,
 * while the document's locale is fixed for the process — a per-call read is pure
 * waste on the render paths that coalesce an absent locale.
 *
 * @internal
 */
const runtimeLocale = once(() => new Intl.DateTimeFormat().resolvedOptions().locale)

/**
 * Coalesces an optional locale to a concrete BCP 47 tag, falling back to the
 * runtime default — the `Intl`-backed helpers require a string.
 *
 * @param locale - An explicit tag, or `undefined` to take the runtime's.
 * @returns The resolved tag.
 */
export function resolveLocale(locale?: string): string {
	return locale ?? runtimeLocale()
}
