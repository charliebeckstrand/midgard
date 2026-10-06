import { once } from './once'

/**
 * The runtime's own BCP 47 tag. The read goes through {@link once} because
 * `Intl.DateTimeFormat` construction is uncached and costs tens of microseconds,
 * while the document's locale is fixed for the process. A per-call read is pure
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
 * @remarks The runtime default is the default of the process that calls it. A
 * server and a browser are two processes, and their defaults can differ. A
 * component that renders on a server thus needs an explicit tag, from a prop
 * or a `LocaleProvider`. Then the server markup and the client agree.
 */
export function resolveLocale(locale?: string): string {
	return locale ?? runtimeLocale()
}
